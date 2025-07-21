// src/services/firebaseStorageService.js
const { getStorage } = require('../config/firebase');

class FirebaseStorageService {
  constructor() {
    // Firebase is already initialized in config/firebase.js
    // Just get the storage instance
    this.storage = getStorage();
    this.bucket = this.storage.bucket();
  }

  /**
   * Upload audio buffer to Firebase Storage
   */
  async uploadAudio(audioBuffer, storyId, voiceId = 'default') {
    try {
      const fileName = `audio/${storyId}_${voiceId}_${Date.now()}.mp3`;
      const file = this.bucket.file(fileName);
      
      console.log(`🎵 Uploading audio to Firebase: ${fileName}`);
      
      // Create upload stream
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'audio/mpeg',
          metadata: {
            storyId,
            voiceId,
            uploadedAt: new Date().toISOString(),
            fileType: 'audio'
          }
        },
        public: true, // Make file publicly accessible
        validation: 'md5'
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Firebase audio upload error:', error);
          reject(new Error(`Failed to upload audio: ${error.message}`));
        });

        stream.on('finish', async () => {
          try {
            // Make the file public and get download URL
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
            
            console.log(`✅ Audio uploaded successfully: ${publicUrl}`);
            
            resolve({
              fileName,
              publicUrl,
              downloadUrl: publicUrl, // For backward compatibility
              size: audioBuffer.length,
              storyId,
              voiceId,
              contentType: 'audio/mpeg'
            });
          } catch (error) {
            reject(error);
          }
        });

        // Write the buffer to the stream
        stream.end(audioBuffer);
      });
    } catch (error) {
      console.error('Firebase audio upload failed:', error);
      throw new Error(`Failed to upload audio to Firebase: ${error.message}`);
    }
  }

  /**
   * Upload image buffer to Firebase Storage
   */
  async uploadImage(imageBuffer, storyId, description = '', index = 0) {
    try {
      const fileName = `images/${storyId}_img_${index}_${Date.now()}.png`;
      const file = this.bucket.file(fileName);
      
      console.log(`🖼️  Uploading image to Firebase: ${fileName}`);
      
      // Create upload stream
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'image/png',
          metadata: {
            storyId,
            description,
            index: index.toString(),
            uploadedAt: new Date().toISOString(),
            fileType: 'image'
          }
        },
        public: true,
        validation: 'md5'
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          console.error('Firebase image upload error:', error);
          reject(new Error(`Failed to upload image: ${error.message}`));
        });

        stream.on('finish', async () => {
          try {
            // Make the file public and get download URL
            await file.makePublic();
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
            
            console.log(`✅ Image uploaded successfully: ${publicUrl}`);
            
            resolve({
              fileName,
              publicUrl,
              downloadUrl: publicUrl,
              size: imageBuffer.length,
              storyId,
              description,
              index,
              contentType: 'image/png'
            });
          } catch (error) {
            reject(error);
          }
        });

        // Write the buffer to the stream
        stream.end(imageBuffer);
      });
    } catch (error) {
      console.error('Firebase image upload failed:', error);
      throw new Error(`Failed to upload image to Firebase: ${error.message}`);
    }
  }

  /**
   * Delete all files for a story
   */
  async deleteStoryFiles(storyId) {
    try {
      const [audioFiles] = await this.bucket.getFiles({
        prefix: `audio/${storyId}_`
      });
      
      const [imageFiles] = await this.bucket.getFiles({
        prefix: `images/${storyId}_`
      });
      
      const allFiles = [...audioFiles, ...imageFiles];
      const deletePromises = allFiles.map(file => file.delete());
      
      await Promise.all(deletePromises);
      console.log(`🗑️  Deleted ${allFiles.length} files for story ${storyId}`);
      
      return allFiles.length;
    } catch (error) {
      console.error(`Failed to delete files for story ${storyId}:`, error);
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName) {
    try {
      const [exists] = await this.bucket.file(fileName).exists();
      return exists;
    } catch (error) {
      console.error(`Failed to check if file exists ${fileName}:`, error);
      return false;
    }
  }
}

module.exports = FirebaseStorageService;