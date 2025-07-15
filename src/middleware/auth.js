const { getAuth } = require('../config/firebase');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/AppError');
const { asyncHandler } = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  let token;
  let user = null;
  
  console.log('Auth middleware - Checking authentication...');
  console.log('Session ID:', req.sessionID);
  console.log('Session user:', req.session.user);
  
  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token found in header');
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
    console.log('Token found in cookie');
  }
  
  // Try session-based authentication first
  if (req.session && req.session.user && req.session.user.isAuthenticated) {
    console.log('Using session authentication');
    user = req.session.user;
    
    // Verify user still exists in Firebase
    try {
      const userRecord = await getAuth().getUser(user.uid);
      user.emailVerified = userRecord.emailVerified;
      console.log('Session user verified in Firebase');
    } catch (error) {
      console.log('Session user not found in Firebase:', error.message);
      // Destroy invalid session
      req.session.destroy();
      throw new AppError('Session invalid - user not found', 401);
    }
  }
  // Fallback to JWT authentication
  else if (token) {
    console.log('Using JWT authentication');
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('JWT decoded:', { uid: decoded.uid, email: decoded.email, role: decoded.role });
      
      // Verify user still exists in Firebase
      const userRecord = await getAuth().getUser(decoded.uid);
      console.log('JWT user verified in Firebase');
      
      user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        emailVerified: userRecord.emailVerified
      };
      
      // supporting both session-based auth and JWT
      // if (decoded.sessionId) {
      //   if (req.session && req.sessionID) {
      //     if (req.sessionID !== decoded.sessionId) {
      //       console.log('JWT session mismatch with req.sessionID');
      //       throw new AppError('Token session mismatch', 401);
      //     }
      //   } else {
      //     console.log('JWT contains sessionId, but no session present on request');
      //     // Decide: do you want to allow this, or require active session?
      //     // For now, let’s allow it
      //   }
      // }

      
    } catch (error) {
      console.log('JWT authentication error:', error.message);
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new AppError('Not authorized to access this route', 401);
      }
      throw error;
    }
  }
  
  // No valid authentication found
  if (!user) {
    console.log('No valid authentication found');
    throw new AppError('Not authorized to access this route', 401);
  }
  
  // Add user to request
  req.user = user;
  
  console.log('User authenticated successfully:', user.email);
  console.log('Authentication method:', req.session.user ? 'Session' : 'JWT');
  
  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      throw new AppError('User role not found', 403);
    }
    
    if (!roles.includes(req.user.role)) {
      throw new AppError('User not authorized for this action', 403);
    }
    
    next();
  };
};

// Optional auth middleware - for routes that work with or without auth
const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    await protect(req, res, () => {});
  } catch (error) {
    // Continue without authentication
    req.user = null;
  }
  next();
});

// Check if user has active session
const requireSession = (req, res, next) => {
  if (!req.session || !req.session.user || !req.session.user.isAuthenticated) {
    throw new AppError('Active session required', 401);
  }
  next();
};

module.exports = { protect, authorize, optionalAuth, requireSession };