// src/services/storyService.js
const storyRepository = require('../repositories/storyRepository');
const aiService = require('./aiService');
const { StoryStatus, StoryLength } = require('../models/storyModels');
const { AppError } = require('../utils/AppError');

class StoryService {
  /**
   * Get story types with optional filtering
   */
  async getStoryTypes(filters = {}) {
    let storyTypes = await storyRepository.getStoryTypes(filters);
    
    // Sort by sortOrder
    storyTypes.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Filter by age if provided
    if (filters.age) {
      const userAge = parseInt(filters.age);
      storyTypes = storyTypes.filter(type => 
        userAge >= type.recommendedAgeMin && userAge <= type.recommendedAgeMax
      );
    }
    
    return storyTypes;
  }

  /**
   * Get active daily challenges
   */
  async getDailyChallenges() {
    const challenges = await storyRepository.getDailyChallenges();
    
    // Filter active challenges
    const now = new Date();
    const activeChallenges = challenges.filter(challenge => {
      const startDate = challenge.startDate instanceof Date ? 
        challenge.startDate : new Date(challenge.startDate);
      const endDate = challenge.endDate instanceof Date ? 
        challenge.endDate : new Date(challenge.endDate);
      
      return now >= startDate && now <= endDate;
    });
    
    // Sort by start date (newest first)
    activeChallenges.sort((a, b) => {
      const dateA = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const dateB = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return dateB - dateA;
    });
    
    return activeChallenges.slice(0, 5);
  }

  /**
   * Create a new story with AI generation
   */
  async createStory(userId, storyData) {
    const {
      storyTypeId,
      drawingImageBase64,
      voiceInputBase64,
      characterNames = [],
      characterDescriptions = {},
      userPrompt,
      preferences = {},
      length = StoryLength.MEDIUM,
      language = 'en'
    } = storyData;

    // Validate story type exists
    const storyType = await storyRepository.getStoryTypeById(storyTypeId);
    if (!storyType) {
      throw new AppError('Invalid story type', 400);
    }

    // Validate input
    if (!drawingImageBase64 && !voiceInputBase64 && !userPrompt) {
      throw new AppError('At least one input method is required (drawing, voice, or text prompt)', 400);
    }

    // Create initial story record
    const initialStoryData = {
      userId,
      title: 'Generating your magical story...',
      content: '',
      storyTypeId,
      status: StoryStatus.GENERATING,
      characterNames,
      userInput: {
        drawingProvided: !!drawingImageBase64,
        voiceProvided: !!voiceInputBase64,
        characterDescriptions,
        userPrompt,
        preferences,
        length,
        language
      },
      media: {
        narratorVoiceUrl: null,
        backgroundMusicUrl: null,
        illustrationUrls: [],
        voiceSettings: preferences.voiceSettings || {}
      },
      metadata: {
        language,
        wordCount: 0,
        readingLevel: 1,
        estimatedReadingTime: 0,
        isAgeAppropriate: true
      },
      drawingImageUrl: null,
      voiceInputUrl: null,
      isFavorite: false,
      isShared: false,
      likesCount: 0,
      tags: []
    };

    const story = await storyRepository.createStory(initialStoryData);

    // Start AI generation process asynchronously
    this.generateStoryWithAI(story.id, {
      storyType,
      drawingImageBase64,
      voiceInputBase64,
      characterNames,
      characterDescriptions,
      userPrompt,
      preferences,
      length,
      language,
      userId
    }).catch(error => {
      console.error('Story generation failed:', error);
      // Update story status to failed
      storyRepository.updateStory(story.id, {
        status: StoryStatus.FAILED,
        error: error.message
      });
    });

    return {
      storyId: story.id,
      status: StoryStatus.GENERATING,
      estimatedTime: '2-3 minutes',
      storyType: storyType.name
    };
  }

  /**
   * AI Story Generation Pipeline
   */
  async generateStoryWithAI(storyId, input) {
    try {
      console.log(`🎨 Starting AI generation for story ${storyId}`);
      
      // Update status to processing
      await storyRepository.updateStory(storyId, { status: StoryStatus.PROCESSING });

      // Step 1: Handle drawing analysis
      let drawingAnalysis = '';
      let drawingImageUrl = '';
      
      if (input.drawingImageBase64) {
        console.log('🖼️  Analyzing drawing...');
        drawingAnalysis = await aiService.analyzeDrawing(input.drawingImageBase64);
        drawingImageUrl = await storyRepository.saveDrawing(input.userId, storyId, input.drawingImageBase64);
      }

      // Step 2: Handle voice input
      let voiceTranscription = '';
      let voiceInputUrl = '';
      
      if (input.voiceInputBase64) {
        console.log('🎤 Transcribing voice input...');
        voiceTranscription = await aiService.transcribeVoice(input.voiceInputBase64);
        voiceInputUrl = await storyRepository.saveVoiceInput(input.userId, storyId, input.voiceInputBase64);
      }

      // Step 3: Build story prompt
      const storyPrompt = aiService.buildStoryPrompt({
        storyType: input.storyType,
        drawingAnalysis,
        voiceTranscription,
        characterNames: input.characterNames,
        characterDescriptions: input.characterDescriptions,
        userPrompt: input.userPrompt,
        length: input.length,
        language: input.language
      });

      // Step 4: Generate story content
      console.log('📝 Generating story content...');
      const storyContent = await aiService.generateStory(storyPrompt);

      // Step 5: Safety check
      const safetyCheck = aiService.isContentSafe(storyContent);
      if (!safetyCheck.isSafe) {
        throw new Error(`Content safety check failed: ${safetyCheck.flaggedWords.join(', ')}`);
      }

      // Step 6: Generate title
      console.log('🏷️  Generating story title...');
      const storyTitle = await aiService.generateTitle(storyContent, input.storyType);

      // Step 7: Generate audio narration
      console.log('🔊 Generating audio narration...');
      const audioData = await aiService.generateNarration(storyContent, input.preferences.voiceSettings);
      const narratorVoiceUrl = await storyRepository.saveGeneratedAudio(storyId, audioData.audioBuffer);

      // Step 8: Generate illustrations (if enabled)
      let illustrationUrls = [];
      if (input.preferences.generateIllustrations !== false) {
        console.log('🎨 Generating story illustrations...');
        const illustrations = await aiService.generateIllustrations(storyContent, input.storyType, 2);
        
        for (let i = 0; i < illustrations.length; i++) {
          const illustrationUrl = await storyRepository.saveIllustration(storyId, illustrations[i].imageBuffer, i);
          illustrationUrls.push(illustrationUrl);
        }
      }

      // Step 9: Calculate metadata
      const metadata = this.calculateStoryMetadata(storyContent, input.language);

      // Step 10: Update story with all generated content
      const updateData = {
        title: storyTitle,
        content: storyContent,
        status: StoryStatus.COMPLETED,
        completedAt: new Date(),
        drawingImageUrl,
        voiceInputUrl,
        media: {
          narratorVoiceUrl,
          narratorVoiceId: audioData.voiceId,
          backgroundMusicUrl: this.selectBackgroundMusic(input.storyType),
          illustrationUrls,
          voiceSettings: audioData.settings || {},
          totalDuration: audioData.duration
        },
        metadata: {
          ...metadata,
          aiGenerationData: {
            drawingAnalysis,
            voiceTranscription,
            generatedAt: new Date(),
            model: 'gpt-4',
            voiceModel: 'eleven-labs',
            safetyCheck
          }
        }
      };

      await storyRepository.updateStory(storyId, updateData);

      // Step 11: Update user progress
      await this.updateUserProgressForStoryCreation(input.userId);

      console.log(`✅ Story ${storyId} generated successfully`);

    } catch (error) {
      console.error(`❌ Story generation failed for ${storyId}:`, error);
      await storyRepository.updateStory(storyId, {
        status: StoryStatus.FAILED,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get story by ID with access control
   */
  async getStory(storyId, userId) {
    const story = await storyRepository.getStoryById(storyId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    // Check access permissions
    if (story.userId !== userId && !story.isShared) {
      throw new AppError('Access denied', 403);
    }

    // Get story type details
    const storyType = await storyRepository.getStoryTypeById(story.storyTypeId);
    
    return {
      ...story,
      storyType
    };
  }

  /**
   * Get user's stories
   */
  async getUserStories(userId, filters = {}) {
    return await storyRepository.getStoriesByUserId(userId, filters);
  }

  /**
   * Get featured stories
   */
  async getFeaturedStories(limit = 10) {
    return await storyRepository.getFeaturedStories(limit);
  }

  /**
   * Continue an existing story
   */
  async continueStory(storyId, userId, continuationData) {
    const { additionalPrompt, newCharacters = [] } = continuationData;

    const story = await storyRepository.getStoryById(storyId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    if (story.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    if (story.status !== StoryStatus.COMPLETED) {
      throw new AppError('Cannot continue a story that is not completed', 400);
    }

    // Update story status to generating
    await storyRepository.updateStory(storyId, {
      status: StoryStatus.GENERATING
    });

    // Start story continuation process
    this.continueStoryWithAI(storyId, {
      existingContent: story.content,
      additionalPrompt,
      newCharacters,
      storyTypeId: story.storyTypeId,
      language: story.metadata?.language || 'en'
    }).catch(error => {
      console.error('Story continuation failed:', error);
      storyRepository.updateStory(storyId, {
        status: StoryStatus.COMPLETED, // Revert to completed if continuation fails
        error: error.message
      });
    });

    return {
      storyId,
      status: StoryStatus.GENERATING,
      estimatedTime: '1-2 minutes'
    };
  }

  /**
   * AI Story Continuation Pipeline
   */
  async continueStoryWithAI(storyId, input) {
    try {
      console.log(`📖 Continuing story ${storyId}`);

      // Get story type details
      const storyType = await storyRepository.getStoryTypeById(input.storyTypeId);

      // Generate continuation prompt
      const continuationPrompt = `Continue this children's story based on the user's request:
      
      Existing story:
      ${input.existingContent}
      
      User wants to add: ${input.additionalPrompt}
      ${input.newCharacters.length > 0 ? `New characters: ${input.newCharacters.join(', ')}` : ''}
      
      Write a seamless continuation that maintains the story's tone and style. Make it engaging and age-appropriate.`;

      // Generate continuation
      const continuation = await aiService.generateStory(continuationPrompt);
      const newContent = input.existingContent + '\n\n' + continuation;

      // Generate new audio for the continuation
      const audioData = await aiService.generateNarration(continuation);
      const continuationAudioUrl = await storyRepository.saveGeneratedAudio(storyId + '_continuation', audioData.audioBuffer);

      // Update story
      const updateData = {
        content: newContent,
        status: StoryStatus.COMPLETED,
        characterNames: [...(input.existingCharacterNames || []), ...input.newCharacters],
        media: {
          narratorVoiceUrl: continuationAudioUrl, // Could append to existing audio
          totalDuration: audioData.duration
        },
        metadata: {
          wordCount: newContent.split(/\s+/).length,
          lastModified: new Date()
        }
      };

      await storyRepository.updateStory(storyId, updateData);

      console.log(`✅ Story ${storyId} continued successfully`);

    } catch (error) {
      console.error(`❌ Story continuation failed for ${storyId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle story sharing
   */
  async toggleStoryShare(storyId, userId, isShared) {
    const story = await storyRepository.getStoryById(storyId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    if (story.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await storyRepository.updateStorySharing(storyId, isShared);
    
    return {
      storyId,
      isShared,
      message: `Story ${isShared ? 'shared' : 'unshared'} successfully`
    };
  }

  /**
   * Delete story
   */
  async deleteStory(storyId, userId) {
    const story = await storyRepository.getStoryById(storyId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    if (story.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    await storyRepository.deleteStory(storyId);
    
    return {
      storyId,
      message: 'Story deleted successfully'
    };
  }

  /**
   * Get story generation status
   */
  async getStoryStatus(storyId, userId) {
    const story = await storyRepository.getStoryById(storyId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    if (story.userId !== userId) {
      throw new AppError('Access denied', 403);
    }

    return {
      storyId,
      status: story.status,
      title: story.title,
      progress: this.getProgressFromStatus(story.status),
      estimatedTimeRemaining: this.getEstimatedTime(story.status),
      createdAt: story.createdAt,
      completedAt: story.completedAt || null
    };
  }

  /**
   * Calculate story metadata
   */
  calculateStoryMetadata(content, language) {
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / sentences;
    
    // Simple reading level calculation
    let readingLevel = 1;
    if (avgWordsPerSentence > 15) readingLevel = 3;
    else if (avgWordsPerSentence > 10) readingLevel = 2;
    
    // Estimated reading time (150 words per minute for children)
    const readingTimeSeconds = Math.ceil(words / 150) * 60;
    
    return {
      wordCount: words,
      readingLevel,
      estimatedReadingTime: readingTimeSeconds,
      language,
      isAgeAppropriate: true
    };
  }

  /**
   * Select background music based on story type
   */
  selectBackgroundMusic(storyType) {
    const musicMap = {
      adventure: 'adventure_theme.mp3',
      fantasy: 'magical_theme.mp3',
      mystery: 'mysterious_theme.mp3',
      friendship: 'heartwarming_theme.mp3',
      educational: 'learning_theme.mp3',
      animal: 'nature_theme.mp3',
      superhero: 'heroic_theme.mp3',
      family: 'cozy_theme.mp3'
    };
    
    const musicFile = musicMap[storyType.name.toLowerCase()] || 'general_theme.mp3';
    return `https://storage.googleapis.com/pictotale-music/${musicFile}`;
  }

  /**
   * Update user progress for story creation
   */
  async updateUserProgressForStoryCreation(userId) {
    const progressData = {
      storiesCreated: true,
      experiencePoints: 25,
      achievements: [{
        id: 'story_creator_' + Date.now(),
        title: 'Story Creator',
        description: 'Created a new story',
        earnedAt: new Date(),
        type: 'story',
        pointsEarned: 25
      }]
    };

    await storyRepository.updateUserProgress(userId, progressData);
  }

  /**
   * Get progress percentage from status
   */
  getProgressFromStatus(status) {
    const progressMap = {
      [StoryStatus.DRAFT]: 10,
      [StoryStatus.GENERATING]: 30,
      [StoryStatus.PROCESSING]: 70,
      [StoryStatus.COMPLETED]: 100,
      [StoryStatus.FAILED]: 0,
      [StoryStatus.ARCHIVED]: 100
    };
    return progressMap[status] || 0;
  }

  /**
   * Get estimated time remaining from status
   */
  getEstimatedTime(status) {
    const timeMap = {
      [StoryStatus.DRAFT]: '3-4 minutes',
      [StoryStatus.GENERATING]: '2-3 minutes',
      [StoryStatus.PROCESSING]: '1-2 minutes',
      [StoryStatus.COMPLETED]: 'Complete',
      [StoryStatus.FAILED]: 'Failed',
      [StoryStatus.ARCHIVED]: 'Archived'
    };
    return timeMap[status] || 'Unknown';
  }
}

module.exports = new StoryService();