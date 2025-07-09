const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health';
  }
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '5'),
  message: {
    error: 'Too many login attempts from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

// Account-based rate limiter
const accountLimiter = (keyGenerator) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator,
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too many failed attempts for this account, please try again later.'
      });
    }
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  accountLimiter
};