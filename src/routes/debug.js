const express = require('express');
const router = express.Router();
const JWTUtils = require('../utils/jwtUtils');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Debug routes for testing JWT token handling
 * Only available in development mode
 */

// Test JWT token validation
router.post('/test-jwt', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({
      success: false,
      error: { message: 'Token is required for testing' }
    });
  }

  try {
    // Test token format
    const isValidFormat = JWTUtils.isValidTokenFormat(token);
    
    // Test if expired
    const isExpired = JWTUtils.isTokenExpired(token);
    
    // Get expiration
    const expiration = JWTUtils.getTokenExpiration(token);
    
    // Decode without verification
    const decoded = JWTUtils.decodeToken(token);
    
    // Try to validate
    let validationResult = null;
    let validationError = null;
    
    try {
      validationResult = JWTUtils.validateToken(token, process.env.JWT_SECRET);
    } catch (error) {
      validationError = {
        name: error.name,
        message: error.message,
        code: error.code
      };
    }

    res.json({
      success: true,
      data: {
        tokenAnalysis: {
          isValidFormat,
          isExpired,
          expiration,
          decoded: decoded ? {
            header: decoded.header,
            payload: decoded.payload
          } : null,
          validation: validationResult ? {
            valid: true,
            uid: validationResult.uid,
            email: validationResult.email,
            iat: validationResult.iat,
            exp: validationResult.exp
          } : {
            valid: false,
            error: validationError
          }
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Token analysis failed',
        details: error.message
      }
    });
  }
}));

// Test protected route with various token scenarios
router.get('/test-protected', protect, asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  res.json({
    success: true,
    message: 'Protected route accessed successfully',
    data: {
      user: {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role
      },
      session: {
        id: req.sessionID,
        authenticated: req.session?.user?.isAuthenticated || false
      }
    }
  });
}));

// Generate test tokens for different scenarios
router.post('/generate-test-tokens', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  const testPayload = {
    uid: 'test-user-123',
    email: 'test@example.com',
    role: 'user',
    sessionId: 'test-session'
  };

  try {
    const tokens = {
      valid: JWTUtils.generateToken(testPayload, process.env.JWT_SECRET),
      expired: JWTUtils.generateToken(testPayload, process.env.JWT_SECRET, { expiresIn: '-1h' }),
      invalidSignature: JWTUtils.generateToken(testPayload, 'wrong-secret'),
      malformed: 'invalid.token.format',
      empty: '',
      notYetValid: JWTUtils.generateToken(testPayload, process.env.JWT_SECRET, { notBefore: '1h' })
    };

    res.json({
      success: true,
      message: 'Test tokens generated',
      data: { tokens }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate test tokens',
        details: error.message
      }
    });
  }
}));

// Test token mismatch scenarios
router.post('/test-token-mismatch', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ message: 'Not found' });
  }

  const scenarios = [
    {
      name: 'Missing UID',
      payload: { email: 'test@example.com', role: 'user' }
    },
    {
      name: 'Missing Email',
      payload: { uid: 'test-123', role: 'user' }
    },
    {
      name: 'Invalid Role',
      payload: { uid: 'test-123', email: 'test@example.com', role: 'invalid-role' }
    },
    {
      name: 'Session Mismatch',
      payload: { uid: 'test-123', email: 'test@example.com', role: 'user', sessionId: 'wrong-session' }
    }
  ];

  const results = [];

  for (const scenario of scenarios) {
    try {
      const token = JWTUtils.generateToken(scenario.payload, process.env.JWT_SECRET);
      const validation = JWTUtils.validateToken(token, process.env.JWT_SECRET);
      
      results.push({
        scenario: scenario.name,
        success: true,
        token,
        validation
      });
    } catch (error) {
      results.push({
        scenario: scenario.name,
        success: false,
        error: {
          name: error.name,
          message: error.message,
          code: error.code
        }
      });
    }
  }

  res.json({
    success: true,
    message: 'Token mismatch scenarios tested',
    data: { results }
  });
}));

module.exports = router;
