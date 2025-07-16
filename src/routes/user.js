const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/avatar', userController.uploadAvatar);

// User dashboard and progress routes
router.get('/dashboard', userController.getUserDashboard);
router.put('/progress', userController.updateProgress);

// Story management routes
router.put('/stories/saved', userController.manageSavedStories);
router.put('/stories/favorites', userController.manageFavoriteStories);

// Parental controls routes (parent/guardian access)
router.put('/parental-controls', 
  authorize(['parent', 'admin']), 
  userController.updateParentalControls
);

// Admin only routes
router.get('/all', 
  authorize(['admin', 'moderator']), 
  userController.getAllUsers
);

router.get('/:userId', 
  authorize(['admin', 'moderator']), 
  userController.getUser
);

router.put('/:userId/role', 
  authorize(['admin']), 
  userController.updateUserRole
);

router.delete('/:userId', 
  authorize(['admin']), 
  userController.deleteUser
);

module.exports = router;