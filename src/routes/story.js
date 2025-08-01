const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { protect, authorize } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(protect);

// Debug route (remove in production) - must be before parameterized routes
router.get('/debug', storyController.debugDatabase);

// Story types and challenges
router.get('/types', storyController.getStoryTypes);
router.get('/challenges/daily', storyController.getDailyChallenges);

// Featured and popular stories
router.get('/featured', storyController.getFeaturedStories);

// User story management
router.get('/my-stories', storyController.getUserStories);
router.get('/user', storyController.getUserStories); // Alias for backward compatibility
router.post('/create', storyController.createStory);

// Individual story operations
router.get('/:storyId', storyController.getStory);
router.get('/:storyId/status', storyController.getStoryStatus);
router.put('/:storyId/share', storyController.toggleStoryShare);
router.post('/:storyId/continue', storyController.continueStory);
router.delete('/:storyId', storyController.deleteStory);

// Admin routes for managing story types and content
router.post('/types', 
  authorize(['admin']), 
  storyController.createStoryType
);

router.put('/types/:typeId', 
  authorize(['admin']), 
  storyController.updateStoryType  // ← Fixed the typo
);

router.delete('/types/:typeId',
  authorize(['admin']),
  storyController.deleteStoryType
);

router.post('/challenges',
  authorize(['admin']),
  storyController.createDailyChallenge
);

module.exports = router;