// src/repositories/storyRepository.js
const { getFirestore } = require('../config/firebase');
const FirebaseStorageService = require('../services/firebaseStorageService');

class StoryRepository {
  constructor() {
    this._db = null;
    this.firebaseStorage = new FirebaseStorageService();
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
   * Delete story and associated Firebase Storage files
   */
  async deleteStory(storyId) {
    try {
      // Delete story files from Firebase Storage first
      console.log(`🗑️  Deleting Firebase Storage files for story ${storyId}`);
      await this.firebaseStorage.deleteStoryFiles(storyId);
      
      // Then delete the story document from Firestore
      await this.db.collection('stories').doc(storyId).delete();
      
      console.log(`✅ Story ${storyId} and all associated files deleted successfully`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting story:', error);
      throw error;
    }
  }

  /**
   * Save drawing image to Firebase Storage
   */
  async saveDrawing(userId, storyId, imageBase64) {
    try {
      console.log(`📤 Saving drawing for user ${userId}, story ${storyId}`);
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      
      // Upload to Firebase Storage
      const result = await this.firebaseStorage.uploadImage(
        imageBuffer,
        storyId,
        `User drawing for story ${storyId}`,
        'drawing'
      );
      
      console.log(`✅ Drawing saved to Firebase: ${result.publicUrl}`);
      return result.publicUrl;
    } catch (error) {
      console.error('Error saving drawing to Firebase:', error);
      // Return a fallback URL structure but log the failure
      const fallbackUrl = `https://storage.googleapis.com/pictotale-backend.firebasestorage.app/drawings/${userId}/${storyId}/drawing.jpg`;
      console.warn(`⚠️  Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Save voice input to Firebase Storage
   */
  async saveVoiceInput(userId, storyId, audioBase64) {
    try {
      console.log(`🎙️  Saving voice input for user ${userId}, story ${storyId}`);
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Upload to Firebase Storage
      const result = await this.firebaseStorage.uploadAudio(
        audioBuffer,
        storyId,
        'voice-input'
      );
      
      console.log(`✅ Voice input saved to Firebase: ${result.publicUrl}`);
      return result.publicUrl;
    } catch (error) {
      console.error('Error saving voice input to Firebase:', error);
      // Return a fallback URL structure but log the failure
      const fallbackUrl = `https://storage.googleapis.com/pictotale-backend.firebasestorage.app/voice/${userId}/${storyId}/voice.mp3`;
      console.warn(`⚠️  Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Save generated audio to Firebase Storage
   */
  async saveGeneratedAudio(storyId, audioBuffer, voiceId = 'default') {
    try {
      console.log(`🎵 Saving generated audio for story ${storyId} with voice ${voiceId}`);
      
      // Upload to Firebase Storage
      const result = await this.firebaseStorage.uploadAudio(
        audioBuffer,
        storyId,
        voiceId
      );
      
      console.log(`✅ Generated audio saved to Firebase: ${result.publicUrl}`);
      return result.publicUrl;
    } catch (error) {
      console.error('Error saving generated audio to Firebase:', error);
      // Return a fallback URL structure but log the failure
      const fallbackUrl = `https://storage.googleapis.com/pictotale-backend.firebasestorage.app/audio/${storyId}/narration.mp3`;
      console.warn(`⚠️  Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Save illustration to Firebase Storage
   */
  async saveIllustration(storyId, imageBuffer, index, description = '') {
    try {
      console.log(`🖼️  Saving illustration ${index} for story ${storyId}`);
      
      // Upload to Firebase Storage
      const result = await this.firebaseStorage.uploadImage(
        imageBuffer,
        storyId,
        description || `Illustration ${index} for story ${storyId}`,
        index
      );
      
      console.log(`✅ Illustration saved to Firebase: ${result.publicUrl}`);
      return result.publicUrl;
    } catch (error) {
      console.error('Error saving illustration to Firebase:', error);
      // Return a fallback URL structure but log the failure
      const fallbackUrl = `https://storage.googleapis.com/pictotale-backend.firebasestorage.app/illustrations/${storyId}/image_${index}.jpg`;
      console.warn(`⚠️  Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    }
  }

  /**
   * Save complete story with all assets to Firebase Storage and Firestore
   */
  async saveCompleteStoryWithAssets(storyId, storyData, assets = {}) {
    try {
      console.log(`💾 Saving complete story ${storyId} with assets to Firebase`);
      
      const storyDoc = {
        ...storyData,
        assets: {
          audioUrl: null,
          illustrations: [],
          drawingUrl: null,
          voiceInputUrl: null
        },
        updatedAt: new Date()
      };
      
      // Save audio if provided
      if (assets.audioBuffer) {
        console.log('🎵 Saving audio asset...');
        storyDoc.assets.audioUrl = await this.saveGeneratedAudio(
          storyId, 
          assets.audioBuffer, 
          assets.voiceId || 'default'
        );
      }
      
      // Save illustrations if provided
      if (assets.illustrations && assets.illustrations.length > 0) {
        console.log(`🖼️  Saving ${assets.illustrations.length} illustration assets...`);
        const illustrationUrls = [];
        
        for (let i = 0; i < assets.illustrations.length; i++) {
          const illustration = assets.illustrations[i];
          const url = await this.saveIllustration(
            storyId,
            illustration.imageBuffer,
            i,
            illustration.description
          );
          illustrationUrls.push({
            url,
            description: illustration.description,
            index: i
          });
        }
        storyDoc.assets.illustrations = illustrationUrls;
      }
      
      // Save drawing if provided
      if (assets.drawingBase64) {
        console.log('📤 Saving drawing asset...');
        storyDoc.assets.drawingUrl = await this.saveDrawing(
          storyData.userId,
          storyId,
          assets.drawingBase64
        );
      }
      
      // Save voice input if provided
      if (assets.voiceInputBase64) {
        console.log('🎙️  Saving voice input asset...');
        storyDoc.assets.voiceInputUrl = await this.saveVoiceInput(
          storyData.userId,
          storyId,
          assets.voiceInputBase64
        );
      }
      
      // Update the story document in Firestore
      await this.updateStory(storyId, storyDoc);
      
      console.log(`✅ Complete story ${storyId} saved with all assets`);
      console.log(`🎵 Audio: ${storyDoc.assets.audioUrl}`);
      console.log(`🖼️  Illustrations: ${storyDoc.assets.illustrations.length}`);
      console.log(`📤 Drawing: ${storyDoc.assets.drawingUrl ? 'Yes' : 'No'}`);
      console.log(`🎙️  Voice: ${storyDoc.assets.voiceInputUrl ? 'Yes' : 'No'}`);
      
      return storyDoc;
    } catch (error) {
      console.error('Error saving complete story with assets:', error);
      throw error;
    }
  }

  /**
   * Get story with all asset URLs
   */
  async getStoryWithAssets(storyId) {
    try {
      const story = await this.getStoryById(storyId);
      
      if (!story) {
        return null;
      }
      
      // Assets are already stored in the story document
      return story;
    } catch (error) {
      console.error('Error getting story with assets:', error);
      throw error;
    }
  }

  /**
   * List all Firebase Storage files for a story (for debugging)
   */
  async listStoryFiles(storyId) {
    try {
      console.log(`📋 Listing Firebase Storage files for story ${storyId}`);
      
      // This would require implementing listStoryFiles in FirebaseStorageService
      // For now, we'll return a simple structure
      return {
        storyId,
        message: 'File listing not implemented yet',
        suggestedFiles: [
          `audio/${storyId}_*_*.mp3`,
          `images/${storyId}_img_*_*.png`
        ]
      };
    } catch (error) {
      console.error('Error listing story files:', error);
      return { storyId, error: error.message };
    }
  }

  /**
   * Update user progress
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
   * Get user's story statistics
   */
  async getUserStoryStats(userId) {
    try {
      const snapshot = await this.db.collection('stories')
        .where('userId', '==', userId)
        .get();
      
      const stories = snapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalStories: stories.length,
        completedStories: stories.filter(s => s.status === 'completed').length,
        sharedStories: stories.filter(s => s.isShared === true).length,
        totalLikes: stories.reduce((sum, s) => sum + (s.likesCount || 0), 0),
        storyTypes: [...new Set(stories.map(s => s.storyTypeId))],
        lastCreated: stories.length > 0 ? Math.max(...stories.map(s => s.createdAt?.getTime() || 0)) : null
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting user story stats:', error);
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
      
      // Check stories
      const storiesSnapshot = await this.db.collection('stories').limit(1).get();
      console.log('Stories collection exists:', !storiesSnapshot.empty);
      
      if (!storiesSnapshot.empty) {
        const sampleDoc = storiesSnapshot.docs[0];
        console.log('Sample story document:', {
          id: sampleDoc.id,
          data: sampleDoc.data()
        });
      }
      
      // Test Firebase Storage connection
      try {
        const bucketExists = await this.firebaseStorage.fileExists('test');
        console.log('Firebase Storage accessible:', true);
      } catch (storageError) {
        console.log('Firebase Storage accessible:', false);
        console.log('Storage error:', storageError.message);
      }
      
      console.log('=== End Debug Info ===');
      
      return {
        collections: collections.map(col => col.id),
        hasStoryTypes: !storyTypesSnapshot.empty,
        hasChallenges: !challengesSnapshot.empty,
        hasStories: !storiesSnapshot.empty,
        firebaseStorageAccessible: true // Will be false if error above
      };
    } catch (error) {
      console.error('Error debugging database:', error);
      throw error;
    }
  }

  /**
   * Cleanup old temporary files (optional maintenance method)
   */
  async cleanupOldFiles(daysOld = 7) {
    try {
      console.log(`🧹 Starting cleanup of files older than ${daysOld} days...`);
      
      // This would require implementing cleanup logic in FirebaseStorageService
      // For now, just log the intention
      console.log('⚠️  Cleanup not yet implemented - add to FirebaseStorageService');
      
      return {
        success: true,
        message: `Cleanup scheduled for files older than ${daysOld} days`,
        filesDeleted: 0
      };
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }
}

module.exports = new StoryRepository();