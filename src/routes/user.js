const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// User profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/profile/avatar', userController.uploadAvatar);

// Admin only routes
router.get('/all', authorize('admin'), userController.getAllUsers);
router.get('/:userId', authorize('admin'), userController.getUser);
router.put('/:userId/role', authorize('admin'), userController.updateUserRole);
router.delete('/:userId', authorize('admin'), userController.deleteUser);

module.exports = router;