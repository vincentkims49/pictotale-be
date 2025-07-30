// src/repositories/storyRepository.js
const { getFirestore } = require('../config/firebase');
const admin = require('firebase-admin');

class StoryRepository {
  constructor() {
    this._db = null;
    this._storage = null;
    this._bucket = null;
    this.bucketName = 'pictotale-backend.firebasestorage.app';
  }

  // Lazy initialization of Firestore
  get db() {
    if (!this._db) {
      this._db = getFirestore();
    }
    return this._db;
  }

  // Lazy initialization of Firebase Storage
  get storage() {
    if (!this._storage) {
      this._storage = admin.storage();
    }
    return this._storage;
  }

  // Get storage bucket
  get bucket() {
    if (!this._bucket) {
      this._bucket = this.storage.bucket(this.bucketName);
    }
    return this._bucket;
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
   * Upload file to Firebase Storage
   */
  async uploadFile(filePath, buffer, contentType, metadata = {}) {
    try {
      console.log(`📤 Uploading file to Firebase Storage: ${filePath}`);
      console.log(`📦 File size: ${buffer.length} bytes`);
      console.log(`🏷️  Content type: ${contentType}`);
      
      const file = this.bucket.file(filePath);
      
      // Upload the file
      await file.save(buffer, {
        metadata: {
          contentType,
          metadata: {
            uploadedAt: new Date().toISOString(),
            ...metadata
          }
        }
      });
      
      console.log(`✅ File uploaded successfully: ${filePath}`);
      
      // Generate signed URL for secure access
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 1000 * 60 * 60 * 24 * 365 // 1 year
      });
      
      console.log(`🔗 Signed URL generated for: ${filePath}`);
      
      return signedUrl;
      
    } catch (error) {
      console.error(`❌ Error uploading file ${filePath}:`, error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Save drawing image to Firebase Storage
   */
  async saveDrawing(userId, storyId, imageBase64) {
    try {
      console.log('💾 Saving drawing to Firebase Storage...');
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const filePath = `drawings/${userId}/${storyId}/drawing_${Date.now()}.jpg`;
      
      const downloadUrl = await this.uploadFile(
        filePath,
        imageBuffer,
        'image/jpeg',
        {
          type: 'drawing',
          userId,
          storyId
        }
      );
      
      console.log('✅ Drawing saved successfully');
      return downloadUrl;
      
    } catch (error) {
      console.error('❌ Error saving drawing:', error);
      throw error;
    }
  }

  /**
   * Save voice input to Firebase Storage
   */
  async saveVoiceInput(userId, storyId, audioBase64) {
    try {
      console.log('🎤 Saving voice input to Firebase Storage...');
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const filePath = `voice/${userId}/${storyId}/voice_${Date.now()}.wav`;
      
      const downloadUrl = await this.uploadFile(
        filePath,
        audioBuffer,
        'audio/wav',
        {
          type: 'voice_input',
          userId,
          storyId
        }
      );
      
      console.log('✅ Voice input saved successfully');
      return downloadUrl;
      
    } catch (error) {
      console.error('❌ Error saving voice input:', error);
      throw error;
    }
  }

  /**
   * Save generated audio narration to Firebase Storage
   */
  async saveGeneratedAudio(storyId, audioBuffer) {
    try {
      console.log('🔊 Saving generated audio to Firebase Storage...');
      console.log(`📦 Audio buffer size: ${audioBuffer?.length || 0} bytes`);
      
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Invalid audio buffer provided');
      }
      
      const timestamp = Date.now();
      const filePath = `stories/${storyId}/narration_${timestamp}.mp3`;
      
      console.log(`📁 Target path: ${filePath}`);
      
      const downloadUrl = await this.uploadFile(
        filePath,
        audioBuffer,
        'audio/mpeg',
        {
          type: 'narration',
          storyId,
          generatedAt: new Date().toISOString()
        }
      );
      
      console.log('✅ Generated audio saved successfully');
      console.log(`🔗 Download URL: ${downloadUrl}`);
      
      return downloadUrl;
      
    } catch (error) {
      console.error('❌ Error saving generated audio:', error);
      
      // Provide specific error guidance
      if (error.code === 'storage/unauthorized') {
        console.log('💡 Fix: Check Firebase Storage rules or service account permissions');
      } else if (error.message.includes('bucket')) {
        console.log('💡 Fix: Verify bucket name is "pictotale-backend.firebasestorage.app"');
      }
      
      throw new Error(`Failed to save audio to storage: ${error.message}`);
    }
  }

  /**
   * Save illustration to Firebase Storage
   */
  async saveIllustration(storyId, imageBuffer, index) {
    try {
      console.log(`🎨 Saving illustration ${index} to Firebase Storage...`);
      
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer provided');
      }
      
      const filePath = `illustrations/${storyId}/image_${index}_${Date.now()}.jpg`;
      
      const downloadUrl = await this.uploadFile(
        filePath,
        imageBuffer,
        'image/jpeg',
        {
          type: 'illustration',
          storyId,
          index: index.toString()
        }
      );
      
      console.log(`✅ Illustration ${index} saved successfully`);
      return downloadUrl;
      
    } catch (error) {
      console.error(`❌ Error saving illustration ${index}:`, error);
      throw error;
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
   * Test Firebase Storage connection
   */
  async testStorageConnection() {
    try {
      console.log('🧪 Testing Firebase Storage connection...');
      console.log(`📦 Bucket name: ${this.bucketName}`);
      
      // Check if bucket exists
      const [exists] = await this.bucket.exists();
      console.log(`📦 Bucket exists: ${exists}`);
      
      if (!exists) {
        throw new Error(`Bucket ${this.bucketName} does not exist`);
      }
      
      // Test upload with a small file
      const testData = Buffer.from('Firebase Storage test from pictotale-backend');
      const testPath = `test/connection-test-${Date.now()}.txt`;
      
      const testUrl = await this.uploadFile(testPath, testData, 'text/plain', {
        test: 'true'
      });
      
      console.log('✅ Firebase Storage connection test successful');
      console.log(`🔗 Test file URL: ${testUrl}`);
      
      // Clean up test file
      await this.bucket.file(testPath).delete();
      console.log('🗑️ Test file cleaned up');
      
      return {
        success: true,
        bucketName: this.bucketName,
        testUrl
      };
      
    } catch (error) {
      console.error('❌ Firebase Storage connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
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
      
      // Test Firebase Storage
      const storageTest = await this.testStorageConnection();
      console.log('Firebase Storage test result:', storageTest);
      
      console.log('=== End Debug Info ===');
      
      return {
        collections: collections.map(col => col.id),
        hasStoryTypes: !storyTypesSnapshot.empty,
        hasChallenges: !challengesSnapshot.empty,
        storageWorking: storageTest.success
      };
    } catch (error) {
      console.error('Error debugging database:', error);
      throw error;
    }
  }
}

module.exports = new StoryRepository();