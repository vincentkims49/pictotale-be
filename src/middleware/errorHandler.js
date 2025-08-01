const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log error with better formatting
  logger.error({
    message: err.message || 'Unknown error',
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.uid : 'anonymous',
    errorCode: err.code || 'NO_CODE',
    errorName: err.name || 'NO_NAME'
  });

  // Firebase auth errors - safely check if code exists and is a string
  if (err.code && typeof err.code === 'string' && err.code.startsWith('auth/')) {
    error.statusCode = 400;
    switch (err.code) {
      case 'auth/email-already-exists':
        error.message = 'Email is already registered';
        break;
      case 'auth/invalid-email':
        error.message = 'Invalid email format';
        break;
      case 'auth/user-not-found':
        error.message = 'User not found';
        break;
      case 'auth/wrong-password':
        error.message = 'Invalid credentials';
        break;
      case 'auth/too-many-requests':
        error.message = 'Too many failed attempts. Please try again later';
        error.statusCode = 429;
        break;
      default:
        error.message = 'Authentication error';
    }
  }
  
  // AppError from our custom error class
  if (err.isOperational) {
    error.statusCode = err.statusCode;
    error.message = err.message;
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    error.statusCode = 400;
    error.message = 'Validation failed';
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.statusCode = 401;
    error.message = 'Invalid token';
  }
  
  if (err.name === 'TokenExpiredError') {
    error.statusCode = 401;
    error.message = 'Token expired';
  }

  // Cast errors (MongoDB)
  if (err.name === 'CastError') {
    error.statusCode = 400;
    error.message = 'Invalid resource ID';
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    error.statusCode = 400;
    error.message = 'Duplicate field value entered';
  }
  
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Server Error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        originalError: err 
      })
    }
  });
};

module.exports = { errorHandler };