const jwt = require('jsonwebtoken');
const { AppError } = require('./AppError');

/**
 * JWT Utility functions for token validation and error handling
 */
class JWTUtils {
  /**
   * Validate JWT token with comprehensive error handling
   * @param {string} token - JWT token to validate
   * @param {string} secret - JWT secret for verification
   * @returns {Object} Decoded token payload
   * @throws {AppError} Specific error based on JWT validation failure
   */
  static validateToken(token, secret) {
    try {
      if (!token) {
        throw new AppError('No authentication token provided', 401);
      }

      if (!secret) {
        throw new AppError('JWT secret not configured', 500);
      }

      // Verify and decode the token
      const decoded = jwt.verify(token, secret);
      
      // Additional validation checks
      if (!decoded.uid) {
        throw new AppError('Invalid token: missing user ID', 401);
      }

      if (!decoded.email) {
        throw new AppError('Invalid token: missing email', 401);
      }

      // Check if token is too old (optional additional security)
      const tokenAge = Date.now() - (decoded.iat * 1000);
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (tokenAge > maxAge) {
        throw new AppError('Token is too old. Please login again.', 401);
      }

      return decoded;
    } catch (error) {
      // Re-throw AppError as-is
      if (error instanceof AppError) {
        throw error;
      }

      // Handle JWT-specific errors
      return this.handleJWTError(error);
    }
  }

  /**
   * Handle specific JWT errors with user-friendly messages
   * @param {Error} error - JWT error
   * @throws {AppError} User-friendly error message
   */
  static handleJWTError(error) {
    console.error('JWT Error Details:', {
      name: error.name,
      message: error.message,
      expiredAt: error.expiredAt,
      date: error.date
    });

    switch (error.name) {
      case 'TokenExpiredError':
        throw new AppError(
          'Your session has expired. Please login again.',
          401,
          'TOKEN_EXPIRED'
        );

      case 'JsonWebTokenError':
        if (error.message.includes('invalid signature')) {
          throw new AppError(
            'Invalid authentication token signature. Please login again.',
            401,
            'INVALID_SIGNATURE'
          );
        } else if (error.message.includes('jwt malformed')) {
          throw new AppError(
            'Malformed authentication token. Please login again.',
            401,
            'MALFORMED_TOKEN'
          );
        } else if (error.message.includes('invalid token')) {
          throw new AppError(
            'Invalid authentication token format. Please login again.',
            401,
            'INVALID_FORMAT'
          );
        } else {
          throw new AppError(
            'Invalid authentication token. Please login again.',
            401,
            'INVALID_TOKEN'
          );
        }

      case 'NotBeforeError':
        throw new AppError(
          'Authentication token is not yet valid. Please try again later.',
          401,
          'TOKEN_NOT_ACTIVE'
        );

      case 'SyntaxError':
        throw new AppError(
          'Invalid token format. Please login again.',
          401,
          'SYNTAX_ERROR'
        );

      default:
        console.error('Unexpected JWT error:', error);
        throw new AppError(
          'Authentication failed. Please login again.',
          401,
          'AUTH_FAILED'
        );
    }
  }

  /**
   * Extract token from request headers or cookies
   * @param {Object} req - Express request object
   * @returns {string|null} JWT token or null if not found
   */
  static extractToken(req) {
    let token = null;

    // Check Authorization header
    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check cookies
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }
    // Check custom header
    else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'];
    }

    return token;
  }

  /**
   * Generate a new JWT token
   * @param {Object} payload - Token payload
   * @param {string} secret - JWT secret
   * @param {Object} options - JWT options
   * @returns {string} JWT token
   */
  static generateToken(payload, secret, options = {}) {
    const defaultOptions = {
      expiresIn: '7d',
      issuer: 'pictotale-api',
      audience: 'pictotale-app'
    };

    return jwt.sign(payload, secret, { ...defaultOptions, ...options });
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  static decodeToken(token) {
    try {
      return jwt.decode(token, { complete: true });
    } catch (error) {
      console.error('Token decode error:', error.message);
      return null;
    }
  }

  /**
   * Check if token is expired without throwing error
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  static isTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return true;
      
      return Date.now() >= decoded.exp * 1000;
    } catch (error) {
      return true;
    }
  }

  /**
   * Get token expiration time
   * @param {string} token - JWT token
   * @returns {Date|null} Expiration date or null
   */
  static getTokenExpiration(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return null;
      
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate token format without verification
   * @param {string} token - JWT token
   * @returns {boolean} True if format is valid
   */
  static isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    return parts.length === 3;
  }
}

module.exports = JWTUtils;
