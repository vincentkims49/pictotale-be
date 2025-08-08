const { getAuth } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');
const JWTUtils = require('../utils/jwtUtils');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  let user = null;
  
  console.log('\n=== Auth Middleware ===');
  console.log('Session ID:', req.sessionID);
  console.log('Existing Session:', req.session.user || 'None');
  
  // 1. Extract token using utility function
  token = JWTUtils.extractToken(req);
  if (token) {
    console.log('JWT found, format valid:', JWTUtils.isValidTokenFormat(token));
    console.log('JWT expired:', JWTUtils.isTokenExpired(token));
  }

  // 2. Session-based authentication (primary)
  if (req.session?.user?.isAuthenticated) {
    console.log('\n[Session Auth Flow]');
    try {
      const userRecord = await getAuth().getUser(req.session.user.uid);
      user = {
        ...req.session.user,
        emailVerified: userRecord.emailVerified
      };
      console.log('Session validated with Firebase');
    } catch (error) {
      console.error('Session validation failed:', error.message);
      await new Promise(resolve => req.session.destroy(resolve));
      throw new AppError('Session expired - please login again', 401);
    }
  } 
  // 3. JWT fallback authentication
  else if (token) {
    console.log('\n[JWT Auth Flow]');
    try {
      // Use JWT utility for validation with comprehensive error handling
      const decoded = JWTUtils.validateToken(token, process.env.JWT_SECRET);
      console.log('JWT decoded:', {
        uid: decoded.uid,
        email: decoded.email,
        sessionMatch: decoded.sessionId ? 
          (decoded.sessionId === req.sessionID ? '✅' : '❌') : 'N/A'
      });

      const userRecord = await getAuth().getUser(decoded.uid);
      
      // 3a. Create session if JWT is valid but session is missing
      if (!req.session.user) {
        req.session.user = {
          uid: decoded.uid,
          email: decoded.email,
          role: decoded.role,
          isAuthenticated: true,
          loginTime: new Date().toISOString()
        };
        await new Promise(resolve => req.session.save(resolve));
        console.log('New session created from JWT');
      }
      
      // 3b. Verify session consistency
      if (decoded.sessionId && decoded.sessionId !== req.sessionID) {
        console.warn('Session ID mismatch - Regenerating session');
        await new Promise(resolve => req.session.regenerate(resolve));
        req.session.user = {
          ...decoded,
          isAuthenticated: true
        };
        await new Promise(resolve => req.session.save(resolve));
      }

      user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        emailVerified: userRecord.emailVerified
      };

    } catch (error) {
      console.error('JWT validation failed:', error.message);

      // Handle specific JWT errors
      if (error.name === 'TokenExpiredError') {
        console.warn('Token expired at:', error.expiredAt);
        throw new AppError('Your session has expired. Please login again.', 401);
      } else if (error.name === 'JsonWebTokenError') {
        console.warn('Invalid JWT format or signature');
        throw new AppError('Invalid authentication token. Please login again.', 401);
      } else if (error.name === 'NotBeforeError') {
        console.warn('Token not active yet:', error.date);
        throw new AppError('Authentication token not yet valid.', 401);
      } else if (error.code === 'auth/user-not-found') {
        console.warn('User not found in Firebase:', error.message);
        throw new AppError('User account no longer exists. Please register again.', 401);
      } else if (error.code === 'auth/user-disabled') {
        console.warn('User account disabled:', error.message);
        throw new AppError('Your account has been disabled. Please contact support.', 403);
      } else {
        console.error('Unexpected JWT error:', error);
        throw new AppError('Authentication failed. Please login again.', 401);
      }
    }
  }

  // 4. Final verification
  if (!user) {
    console.log('\n[Result] No valid authentication');
    throw new AppError('Not authorized - please login', 401);
  }

  // 5. Attach user to request
  req.user = user;
  console.log('\n[Result] Authenticated as:', {
    uid: user.uid,
    email: user.email,
    via: req.session.user ? 'Session' : 'JWT'
  });

  next();
});

// Enhanced authorize middleware with permission logging
const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('\n[Authorization Check] Required roles:', roles);
    console.log('User role:', req.user?.role || 'None');
    
    if (!req.user?.role) {
      throw new AppError('User role not found', 403);
    }
    
    if (!roles.includes(req.user.role)) {
      console.warn('Access denied - insufficient permissions');
      throw new AppError(`Requires ${roles.join(' or ')} role`, 403);
    }
    
    console.log('Authorization granted');
    next();
  };
};

// Optional auth with detailed logging
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    await protect(req, res, () => {});
    console.log('Optional auth - User authenticated');
  } catch (error) {
    console.log('Optional auth - Continuing unauthenticated');
    req.user = null;
  }
  next();
});

// Strict session requirement
const requireSession = asyncHandler(async (req, res, next) => {
  if (!req.session?.user?.isAuthenticated) {
    console.warn('Session required but not found');
    throw new AppError('Active session required', 401);
  }
  
  console.log('Session verified:', req.session.user.uid);
  next();
});

module.exports = { 
  protect, 
  authorize, 
  optionalAuth, 
  requireSession 
};