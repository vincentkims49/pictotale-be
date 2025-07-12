// src/repositories/storyRepository.js
const { getFirestore } = require('../config/firebase');

class StoryRepository {
  constructor() {
    this._db = null;
  }

  // Lazy initialization of Firestore
  get db() {
    if (!this._db) {
      this._db = getFirestore();
    }
    return this._db;
  }

  /**
   * Get all story types with optional filtering
   */
  async getStoryTypes(filters = {}) {
    try {
      console.log('Getting story types with filters:', filters);
      
      // For development: Get all story types first, then filter in memory if needed
      const snapshot = await this.db.collection('storyTypes').get();
      
      console.log('Story types snapshot size:', snapshot.size);
      console.log('Snapshot empty:', snapshot.empty);
      
      if (snapshot.empty) {
        console.log('No story types found in database');
        return [];
      }
      
      let storyTypes = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Story type document:', { id: doc.id, ...data });
        return {
          id: doc.id,
          ...data
        };
      });
      
      // Apply language filter in memory if provided
      if (filters.language && filters.language !== 'en') {
        storyTypes = storyTypes.filter(type => 
          !type.language || type.language === filters.language
        );
        console.log('Filtered story types by language:', storyTypes.length);
      }
      
      return storyTypes;
    } catch (error) {
      console.error('Error getting story types:', error);
      throw error;
    }
  }

  /**
   * Get story type by ID
   */
  async getStoryTypeById(storyTypeId) {
    try {
      const doc = await this.db.collection('storyTypes').doc(storyTypeId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting story type by ID:', error);
      throw error;
    }
  }

  /**
   * Get active daily challenges
   */
  async getDailyChallenges() {
    try {
      // For development: Get all challenges and filter/sort in memory
      // In production, create the composite index for better performance
      const snapshot = await this.db.collection('dailyChallenges')
        .where('isActive', '==', true)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      let challenges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate?.() || new Date(doc.data().startDate),
        endDate: doc.data().endDate?.toDate?.() || new Date(doc.data().endDate)
      }));
      
      // Sort by startDate in memory and limit results
      challenges.sort((a, b) => b.startDate - a.startDate);
      return challenges.slice(0, 10);
      
    } catch (error) {
      console.error('Error getting daily challenges:', error);
      throw error;
    }
  }

  /**
   * Create a new story
   */
  async createStory(storyData) {
    try {
      const docRef = await this.db.collection('stories').add({
        ...storyData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return {
        id: docRef.id,
        ...storyData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  /**
   * Update story
   */
  async updateStory(storyId, updateData) {
    try {
      await this.db.collection('stories').doc(storyId).update({
        ...updateData,
        updatedAt: new Date()
      });
      
      return { id: storyId, ...updateData };
    } catch (error) {
      console.error('Error updating story:', error);
      throw error;
    }
  }

  /**
   * Get story by ID
   */
  async getStoryById(storyId) {
    try {
      const doc = await this.db.collection('stories').doc(storyId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
        completedAt: doc.data().completedAt?.toDate?.() || null
      };
    } catch (error) {
      console.error('Error getting story by ID:', error);
      throw error;
    }
  }

  /**
   * Get stories by user ID
   */
  async getStoriesByUserId(userId, filters = {}) {
    try {
      let query = this.db.collection('stories').where('userId', '==', userId);
      
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.storyTypeId) {
        query = query.where('storyTypeId', '==', filters.storyTypeId);
      }
      
      query = query.orderBy('createdAt', 'desc');
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.offset(filters.offset);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
        completedAt: doc.data().completedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error getting stories by user ID:', error);
      throw error;
    }
  }

  /**
   * Get featured stories
   */
  async getFeaturedStories(limit = 10) {
    try {
      const snapshot = await this.db.collection('stories')
        .where('isShared', '==', true)
        .where('status', '==', 'completed')
        .orderBy('likesCount', 'desc')
        .limit(limit)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
        completedAt: doc.data().completedAt?.toDate?.() || null
      }));
    } catch (error) {
      console.error('Error getting featured stories:', error);
      throw error;
    }
  }

  /**
   * Update story sharing status
   */
  async updateStorySharing(storyId, isShared) {
    try {
      await this.db.collection('stories').doc(storyId).update({
        isShared,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating story sharing:', error);
      throw error;
    }
  }

  /**
   * Delete story
   */
  async deleteStory(storyId) {
    try {
      await this.db.collection('stories').doc(storyId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }

  /**
   * Save drawing image (placeholder implementation)
   */
  async saveDrawing(userId, storyId, imageBase64) {
    // In a real implementation, you would upload to Firebase Storage
    // For now, return a placeholder URL
    return `https://storage.googleapis.com/your-bucket/drawings/${userId}/${storyId}/drawing.jpg`;
  }

  /**
   * Save voice input (placeholder implementation)
   */
  async saveVoiceInput(userId, storyId, audioBase64) {
    // In a real implementation, you would upload to Firebase Storage
    // For now, return a placeholder URL
    return `https://storage.googleapis.com/your-bucket/voice/${userId}/${storyId}/voice.mp3`;
  }

  /**
   * Save generated audio (placeholder implementation)
   */
  async saveGeneratedAudio(storyId, audioBuffer) {
    // In a real implementation, you would upload to Firebase Storage
    // For now, return a placeholder URL
    return `https://storage.googleapis.com/your-bucket/audio/${storyId}/narration.mp3`;
  }

  /**
   * Save illustration (placeholder implementation)
   */
  async saveIllustration(storyId, imageBuffer, index) {
    // In a real implementation, you would upload to Firebase Storage
    // For now, return a placeholder URL
    return `https://storage.googleapis.com/your-bucket/illustrations/${storyId}/image_${index}.jpg`;
  }

  /**
   * Update user progress (placeholder implementation)
   */
  async updateUserProgress(userId, progressData) {
    try {
      const userRef = this.db.collection('users').doc(userId);
      
      await userRef.update({
        progress: progressData,
        updatedAt: new Date()
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  }

  /**
   * Debug method to check database structure
   */
  async debugDatabase() {
    try {
      console.log('=== Database Debug Info ===');
      
      // Check collections
      const collections = await this.db.listCollections();
      console.log('Available collections:', collections.map(col => col.id));
      
      // Check story types
      const storyTypesSnapshot = await this.db.collection('storyTypes').limit(1).get();
      console.log('Story types collection exists:', !storyTypesSnapshot.empty);
      
      if (!storyTypesSnapshot.empty) {
        const sampleDoc = storyTypesSnapshot.docs[0];
        console.log('Sample story type document:', {
          id: sampleDoc.id,
          data: sampleDoc.data()
        });
      }
      
      // Check daily challenges
      const challengesSnapshot = await this.db.collection('dailyChallenges').limit(1).get();
      console.log('Daily challenges collection exists:', !challengesSnapshot.empty);
      
      if (!challengesSnapshot.empty) {
        const sampleDoc = challengesSnapshot.docs[0];
        console.log('Sample challenge document:', {
          id: sampleDoc.id,
          data: sampleDoc.data()
        });
      }
      
      console.log('=== End Debug Info ===');
      
      return {
        collections: collections.map(col => col.id),
        hasStoryTypes: !storyTypesSnapshot.empty,
        hasChallenges: !challengesSnapshot.empty
      };
    } catch (error) {
      console.error('Error debugging database:', error);
      throw error;
    }
  }
}


module.exports = new StoryRepository();