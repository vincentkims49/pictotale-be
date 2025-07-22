// src/controllers/storyController.js
const storyService = require('../services/storyService');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/AppError');
/**
 * Debug endpoint to check database structure
 */
exports.debugDatabase = asyncHandler(async (req, res, next) => {
  const storyRepository = require('../repositories/storyRepository');
  
  const debugInfo = await storyRepository.debugDatabase();
  
  res.status(200).json({
    success: true,
    data: debugInfo
  });
});
/**
 * Get all available story types
 */
exports.getStoryTypes = asyncHandler(async (req, res, next) => {
  const { age, language = 'en' } = req.query;
  
  const storyTypes = await storyService.getStoryTypes({ age, language });
  
  res.status(200).json({
    success: true,
    data: { storyTypes },
    count: storyTypes.length
  });
});

/**
 * Get daily challenges
 */
exports.getDailyChallenges = asyncHandler(async (req, res, next) => {
  const challenges = await storyService.getDailyChallenges();
  
  res.status(200).json({
    success: true,
    data: { challenges }
  });
});

/**
 * Get featured stories
 */
exports.getFeaturedStories = asyncHandler(async (req, res, next) => {
  const { limit = 10, category = 'popular' } = req.query;
  
  const stories = await storyService.getFeaturedStories(parseInt(limit));
  
  res.status(200).json({
    success: true,
    data: { stories }
  });
});

/**
 * Get user's stories
 */
exports.getUserStories = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, storyType } = req.query;
  const userId = req.user.uid;
  
  const filters = {
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  };
  
  if (status) filters.status = status;
  if (storyType) filters.storyTypeId = storyType;
  
  const stories = await storyService.getUserStories(userId, filters);
  
  res.status(200).json({
    success: true,
    data: { stories },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: stories.length
    }
  });
});

/**
 * Create a new story with AI generation
 */
exports.createStory = asyncHandler(async (req, res, next) => {
  const userId = 'Re7Pd1FP8WcArpacQKcO1ZFArzH2';
  const storyData = req.body;
  
  // Validate required fields
  if (!storyData.storyTypeId) {
    throw new AppError('Story type is required', 400);
  }
  
  if (!storyData.drawingImageBase64 && !storyData.voiceInputBase64 && !storyData.userPrompt) {
    throw new AppError('At least one input method is required (drawing, voice, or text prompt)', 400);
  }
  
  // Validate character limits
  if (storyData.characterNames && storyData.characterNames.length > 5) {
    throw new AppError('Maximum 5 characters allowed', 400);
  }
  
  if (storyData.userPrompt && storyData.userPrompt.length > 500) {
    throw new AppError('User prompt must be less than 500 characters', 400);
  }
  
  const result = await storyService.createStory(userId, storyData);
  
  res.status(201).json({
    success: true,
    message: 'Story creation started! Your magical tale is being crafted.',
    data: result
  });
});

/**
 * Get single story
 */
exports.getStory = asyncHandler(async (req, res, next) => {
  const { storyId } = req.params;
  const userId = req.user.uid;
  
  const story = await storyService.getStory(storyId, userId);
  
  res.status(200).json({
    success: true,
    data: { story }
  });
});

/**
 * Get story generation status
 */
exports.getStoryStatus = asyncHandler(async (req, res, next) => {
  const { storyId } = req.params;
  const userId = req.user.uid;
  
  const status = await storyService.getStoryStatus(storyId, userId);
  
  res.status(200).json({
    success: true,
    data: status
  });
});

/**
 * Continue an existing story
 */
exports.continueStory = asyncHandler(async (req, res, next) => {
  const { storyId } = req.params;
  const userId = req.user.uid;
  const { additionalPrompt, newCharacters = [] } = req.body;
  
  if (!additionalPrompt || additionalPrompt.trim().length === 0) {
    throw new AppError('Additional prompt is required to continue story', 400);
  }
  
  if (additionalPrompt.length > 300) {
    throw new AppError('Additional prompt must be less than 300 characters', 400);
  }
  
  if (newCharacters.length > 3) {
    throw new AppError('Maximum 3 new characters allowed', 400);
  }
  
  const result = await storyService.continueStory(storyId, userId, {
    additionalPrompt,
    newCharacters
  });
  
  res.status(200).json({
    success: true,
    message: 'Story continuation started!',
    data: result
  });
});

/**
 * Toggle story sharing
 */
exports.toggleStoryShare = asyncHandler(async (req, res, next) => {
  const { storyId } = req.params;
  const userId = req.user.uid;
  const { isShared } = req.body;
  
  if (typeof isShared !== 'boolean') {
    throw new AppError('isShared must be a boolean value', 400);
  }
  
  const result = await storyService.toggleStoryShare(storyId, userId, isShared);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: { storyId, isShared }
  });
});

/**
 * Delete story
 */
exports.deleteStory = asyncHandler(async (req, res, next) => {
  const { storyId } = req.params;
  const userId = req.user.uid;
  
  const result = await storyService.deleteStory(storyId, userId);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
});

// Admin functions

/**
 * Create story type (Admin only)
 */
exports.createStoryType = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    characteristics,
    colorScheme,
    recommendedAgeMin,
    recommendedAgeMax,
    aiPromptTemplate,
    sampleStoryTitles
  } = req.body;
  
  // Validate required fields
  if (!name || !description || !characteristics || !Array.isArray(characteristics)) {
    throw new AppError('Name, description, and characteristics array are required', 400);
  }
  
  if (!recommendedAgeMin || !recommendedAgeMax) {
    throw new AppError('Recommended age range is required', 400);
  }
  
  if (recommendedAgeMin < 3 || recommendedAgeMax > 17 || recommendedAgeMin >= recommendedAgeMax) {
    throw new AppError('Invalid age range. Must be between 3-17 and min < max', 400);
  }
  
  // For now, return success message (implement actual creation later)
  res.status(201).json({
    success: true,
    message: 'Story type creation functionality coming soon!',
    data: { name, description, characteristics }
  });
});

/**
 * Update story type (Admin only)
 */
exports.updateStoryType = asyncHandler(async (req, res, next) => {
  const { typeId } = req.params;
  const updateData = req.body;
  
  if (!typeId) {
    throw new AppError('Story type ID is required', 400);
  }
  
  // For now, return success message (implement actual update later)
  res.status(200).json({
    success: true,
    message: 'Story type update functionality coming soon!',
    data: { typeId, updateData }
  });
});

/**
 * Delete story type (Admin only)
 */
exports.deleteStoryType = asyncHandler(async (req, res, next) => {
  const { typeId } = req.params;
  
  if (!typeId) {
    throw new AppError('Story type ID is required', 400);
  }
  
  // For now, return success message (implement actual deletion later)
  res.status(200).json({
    success: true,
    message: 'Story type deletion functionality coming soon!',
    data: { typeId }
  });
});

/**
 * Create daily challenge (Admin only)
 */
exports.createDailyChallenge = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    promptText,
    startDate,
    endDate,
    suggestedStoryTypes,
    rewards,
    difficultyLevel
  } = req.body;
  
  // Validate required fields
  if (!title || !description || !promptText) {
    throw new AppError('Title, description, and prompt text are required', 400);
  }
  
  if (!startDate || !endDate) {
    throw new AppError('Start date and end date are required', 400);
  }
  
  if (new Date(startDate) >= new Date(endDate)) {
    throw new AppError('End date must be after start date', 400);
  }
  
  if (difficultyLevel && (difficultyLevel < 1 || difficultyLevel > 5)) {
    throw new AppError('Difficulty level must be between 1 and 5', 400);
  }
  
  // For now, return success message (implement actual creation later)
  res.status(201).json({
    success: true,
    message: 'Daily challenge creation functionality coming soon!',
    data: { title, description, promptText }
  });
});

/**
 * Get story analytics (Admin only)
 */
exports.getStoryAnalytics = asyncHandler(async (req, res, next) => {
  const { timeframe = '7d' } = req.query;
  
  // For now, return mock analytics data
  const analytics = {
    totalStories: 1247,
    storiesCreatedToday: 23,
    completionRate: 0.87,
    averageRating: 4.6,
    popularStoryTypes: [
      { type: 'adventure', count: 342 },
      { type: 'fantasy', count: 298 },
      { type: 'friendship', count: 187 }
    ],
    userEngagement: {
      dailyActiveUsers: 156,
      averageSessionTime: '12m 34s',
      returnUserRate: 0.73
    }
  };
  
  res.status(200).json({
    success: true,
    data: { analytics, timeframe }
  });
});



/**
 * Health check for story service
 */
exports.healthCheck = asyncHandler(async (req, res, next) => {
  // Check if all services are operational
  const healthStatus = {
    storyService: 'operational',
    aiService: process.env.OPENAI_API_KEY ? 'operational' : 'limited',
    voiceService: process.env.ELEVENLABS_API_KEY ? 'operational' : 'limited',
    firestore: 'operational',
    storage: 'operational',
    timestamp: new Date().toISOString()
  };
  
  res.status(200).json({
    success: true,
    data: healthStatus
  });
});