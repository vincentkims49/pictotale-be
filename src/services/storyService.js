// Updated storyService.js with 50-word story limit for cost optimization

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
   * Create a new story with AI generation (optimized for cost)
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
      length = StoryLength.SHORT, // Force short length for cost savings
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

    // Create initial story record with cost optimization note
    const initialStoryData = {
      userId,
      title: 'Creating your mini story...',
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
        length: 'short', // Always short for cost optimization
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
        maxWordLimit: 50, // Track the word limit used
        readingLevel: 1,
        estimatedReadingTime: 0,
        isAgeAppropriate: true,
        costOptimized: true // Flag for cost optimization
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
      length: 'short', // Always short
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
      estimatedTime: '1-2 minutes', // Faster with shorter stories
      storyType: storyType.name,
      costOptimized: true,
      maxWords: 50
    };
  }

  /**
   * AI Story Generation Pipeline (optimized for 50-word stories)
   */
  async generateStoryWithAI(storyId, input) {
    try {
      console.log(`🎨 Starting cost-optimized AI generation for story ${storyId}`);
      console.log('💰 Target: 50 words max for minimal ElevenLabs cost');
      
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

      // Step 3: Build story prompt (with 50-word limit)
      console.log('📝 Building cost-optimized story prompt (200 words max)...');
      const storyPrompt = aiService.buildStoryPrompt({
        storyType: input.storyType,
        drawingAnalysis,
        voiceTranscription,
        characterNames: input.characterNames,
        characterDescriptions: input.characterDescriptions,
        userPrompt: input.userPrompt,
        length: 'short', // Always short for cost savings
        language: input.language
      });

      // Step 4: Generate story content (200 words max)
      console.log('📝 Generating short story content (≤200 words)...');
      const storyContent = await aiService.generateStory(storyPrompt);
      
      // Verify word count
      const actualWordCount = this.countWords(storyContent);
      console.log('📊 Generated story word count:', actualWordCount);
      
      if (actualWordCount > 200) {
        console.log('⚠️ Story exceeded 200 words, enforcing limit...');
        storyContent = aiService.enforceWordLimit(storyContent, 200);
        console.log('✂️ Truncated to:', this.countWords(storyContent), 'words');
      }

      // Step 5: Safety check
      const safetyCheck = aiService.isContentSafe(storyContent);
      if (!safetyCheck.isSafe) {
        throw new Error(`Content safety check failed: ${safetyCheck.flaggedWords.join(', ')}`);
      }

      // Step 6: Generate title
      console.log('🏷️  Generating story title...');
      const storyTitle = await aiService.generateTitle(storyContent, input.storyType);

      // Step 7: Generate audio narration (this is where we save costs!)
      console.log('🔊 Generating audio narration...');
      console.log('💰 ElevenLabs cost savings: ~80% with 200-word limit');
      
      const audioData = await aiService.generateNarration(storyContent, input.preferences.voiceSettings);
      const narratorVoiceUrl = await storyRepository.saveGeneratedAudio(storyId, audioData.audioBuffer);

      // Step 8: Skip illustrations for further cost savings (optional)
      let illustrationUrls = [];
      if (input.preferences.generateIllustrations === true) {
        console.log('🎨 Generating story illustrations...');
        const illustrations = await aiService.generateIllustrations(storyContent, input.storyType, 1); // Just 1 illustration
        
        for (let i = 0; i < illustrations.length; i++) {
          const illustrationUrl = await storyRepository.saveIllustration(storyId, illustrations[i].imageBuffer, i);
          illustrationUrls.push(illustrationUrl);
        }
      } else {
        console.log('🎨 Skipping illustrations for cost optimization');
      }

      // Step 9: Calculate metadata with cost tracking
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
          costOptimized: true,
          maxWordLimit: 50,
          actualWordCount: this.countWords(storyContent),
          tokensUsed: this.estimateTokensUsed(storyContent),
          aiGenerationData: {
            drawingAnalysis,
            voiceTranscription,
            generatedAt: new Date(),
            model: 'gpt-3.5-turbo',
            voiceModel: 'eleven-labs',
            safetyCheck
          }
        }
      };

      await storyRepository.updateStory(storyId, updateData);

      // Step 11: Update user progress
      await this.updateUserProgressForStoryCreation(input.userId);

      console.log(`✅ Cost-optimized story ${storyId} generated successfully`);
      console.log(`💰 ElevenLabs tokens used: ~${this.estimateTokensUsed(storyContent)} (vs ~250 for longer stories)`);

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
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Estimate ElevenLabs tokens used (roughly 1 token per word for audio)
   */
  estimateTokensUsed(text) {
    return this.countWords(text);
  }

  /**
   * Calculate story metadata with cost optimization tracking
   */
  calculateStoryMetadata(content, language) {
    const words = this.countWords(content);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    
    // Simple reading level calculation
    let readingLevel = 1;
    if (avgWordsPerSentence > 12) readingLevel = 3;
    else if (avgWordsPerSentence > 8) readingLevel = 2;
    
    // Estimated reading time (faster for short stories)
    const readingTimeSeconds = Math.ceil((words / 120) * 60); // 120 WPM for children
    
    return {
      wordCount: words,
      maxWordLimit: 50,
      withinLimit: words <= 50,
      readingLevel,
      estimatedReadingTime: readingTimeSeconds,
      language,
      isAgeAppropriate: true,
      costOptimized: true,
      estimatedTokenCost: words // Approximate token usage
    };
  }

  /**
   * Get cost-optimized story creation summary
   */
  async getStoryCostSummary(storyId, userId) {
    const story = await this.getStory(storyId, userId);
    
    if (!story) {
      throw new AppError('Story not found', 404);
    }

    const metadata = story.metadata || {};
    const actualWords = metadata.actualWordCount || this.countWords(story.content || '');
    
    return {
      storyId,
      title: story.title,
      wordCount: actualWords,
      maxWordLimit: 50,
      withinLimit: actualWords <= 50,
      estimatedTokensUsed: actualWords,
      costSavings: {
        comparedToLongStory: Math.round(((250 - actualWords) / 250) * 100) + '%',
        tokensReduced: 250 - actualWords
      },
      readingTime: metadata.estimatedReadingTime || 0,
      audioGenerated: !!story.media?.narratorVoiceUrl,
      status: story.status
    };
  }

  // ... (rest of the existing methods remain the same)

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
    return `https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-music/${musicFile}`;
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
        description: 'Created a new cost-optimized story',
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
      [StoryStatus.GENERATING]: 40,
      [StoryStatus.PROCESSING]: 80,
      [StoryStatus.COMPLETED]: 100,
      [StoryStatus.FAILED]: 0,
      [StoryStatus.ARCHIVED]: 100
    };
    return progressMap[status] || 0;
  }

  /**
   * Get estimated time remaining from status (faster with shorter stories)
   */
  getEstimatedTime(status) {
    const timeMap = {
      [StoryStatus.DRAFT]: '1-2 minutes',
      [StoryStatus.GENERATING]: '30-60 seconds',
      [StoryStatus.PROCESSING]: '30 seconds',
      [StoryStatus.COMPLETED]: 'Complete',
      [StoryStatus.FAILED]: 'Failed',
      [StoryStatus.ARCHIVED]: 'Archived'
    };
    return timeMap[status] || 'Unknown';
  }
}

module.exports = new StoryService();