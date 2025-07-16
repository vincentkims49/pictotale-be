// src/models/storyModels.js

// Simple StoryType class for seeding
class StoryType {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.iconUrl = data.iconUrl;
    this.coverImageUrl = data.coverImageUrl;
    this.characteristics = data.characteristics || [];
    this.colorScheme = data.colorScheme;
    this.recommendedAgeMin = data.recommendedAgeMin;
    this.recommendedAgeMax = data.recommendedAgeMax;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.sortOrder = data.sortOrder || 0;
    this.aiPromptTemplate = data.aiPromptTemplate || {};
    this.sampleStoryTitles = data.sampleStoryTitles || [];
  }

  toFirestore() {
    const { id, ...data } = this;
    return data;
  }

  static fromFirestore(doc) {
    return new StoryType({
      id: doc.id,
      ...doc.data()
    });
  }
}

// Simple DailyChallenge class for seeding
class DailyChallenge {
  constructor(data) {
    this.id = data.id;
    this.title = data.title;
    this.description = data.description;
    this.promptText = data.promptText;
    this.challengeImageUrl = data.challengeImageUrl;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.suggestedStoryTypes = data.suggestedStoryTypes || [];
    this.rewards = data.rewards || {};
    this.difficultyLevel = data.difficultyLevel || 1;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  }

  toFirestore() {
    const { id, ...data } = this;
    return {
      ...data,
      startDate: this.startDate instanceof Date ? this.startDate.toISOString() : this.startDate,
      endDate: this.endDate instanceof Date ? this.endDate.toISOString() : this.endDate
    };
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new DailyChallenge({
      id: doc.id,
      ...data,
      startDate: data.startDate?.toDate?.() || new Date(data.startDate),
      endDate: data.endDate?.toDate?.() || new Date(data.endDate)
    });
  }
}

// Story Status Constants
const StoryStatus = {
  DRAFT: 'draft',
  GENERATING: 'generating',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ARCHIVED: 'archived'
};

// Story Length Constants
const StoryLength = {
  SHORT: 'short',      // ~100-200 words
  MEDIUM: 'medium',    // ~200-400 words
  LONG: 'long',        // ~400-600 words
  EPIC: 'epic'         // ~600+ words
};

// Voice Type Constants
const VoiceType = {
  CHILD_FRIENDLY: 'childFriendly',
  NARRATOR: 'narrator',
  CHARACTER: 'character',
  EDUCATIONAL: 'educational',
  DRAMATIC: 'dramatic'
};

// Story Style Constants
const StoryStyle = {
  ANIMATED: 'animated',
  HAND_DRAWN: 'handDrawn',
  ILLUSTRATED: 'illustrated',
  MINIMALIST: 'minimalist',
  COMIC: 'comic',
  REALISTIC: 'realistic'
};

// Helper functions
const StoryHelpers = {
  validateStoryType: (data) => {
    const errors = [];
    
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    }
    
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    }
    
    if (!data.characteristics || !Array.isArray(data.characteristics) || data.characteristics.length === 0) {
      errors.push('At least one characteristic is required');
    }
    
    if (!data.recommendedAgeMin || data.recommendedAgeMin < 3 || data.recommendedAgeMin > 17) {
      errors.push('Recommended minimum age must be between 3 and 17');
    }
    
    if (!data.recommendedAgeMax || data.recommendedAgeMax < 3 || data.recommendedAgeMax > 17) {
      errors.push('Recommended maximum age must be between 3 and 17');
    }
    
    if (data.recommendedAgeMin >= data.recommendedAgeMax) {
      errors.push('Minimum age must be less than maximum age');
    }
    
    return errors;
  },

  validateDailyChallenge: (data) => {
    const errors = [];
    
    if (!data.title || data.title.trim().length === 0) {
      errors.push('Title is required');
    }
    
    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    }
    
    if (!data.promptText || data.promptText.trim().length === 0) {
      errors.push('Prompt text is required');
    }
    
    if (!data.startDate) {
      errors.push('Start date is required');
    }
    
    if (!data.endDate) {
      errors.push('End date is required');
    }
    
    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
      errors.push('End date must be after start date');
    }
    
    if (data.difficultyLevel && (data.difficultyLevel < 1 || data.difficultyLevel > 5)) {
      errors.push('Difficulty level must be between 1 and 5');
    }
    
    return errors;
  }
};

// Export all models and constants
module.exports = {
  StoryType,
  DailyChallenge,
  StoryStatus,
  StoryLength,
  VoiceType,
  StoryStyle,
  StoryHelpers
};