const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('../utils/AppError');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new AppError(`Validation error: ${errorMessages.join(', ')}`, 400);
  }
  next();
};

const validateRegister = [
  body('email')
    .isEmail().normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s]+$/)
    .withMessage('Display name can only contain letters, numbers, and spaces'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail().normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validatePasswordReset = [
  body('email')
    .isEmail().normalizeEmail()
    .withMessage('Please provide a valid email'),
  handleValidationErrors
];

const validatePasswordUpdate = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),
  handleValidationErrors
];

const validateEmailUpdate = [
  body('newEmail')
    .isEmail().normalizeEmail()
    .withMessage('Please provide a valid email')
    .custom((value, { req }) => value !== req.user.email)
    .withMessage('New email must be different from current email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required to update email'),
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateEmailUpdate
};