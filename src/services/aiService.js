// src/services/aiService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FirebaseStorageService = require('./firebaseStorageService');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY ;
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY ;
    this.defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ;
    
    // Initialize Firebase Storage
    this.firebaseStorage = new FirebaseStorageService();
    
    // Retry configuration
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second
    this.maxDelay = 10000; // 10 seconds
    
    if (!this.openaiApiKey) {
      console.warn('⚠️  OpenAI API key not found. Story generation will be simulated.');
    }
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️  ElevenLabs API key not found. Voice generation will be simulated.');
    }
  }

  /**
   * Generic retry mechanism with exponential backoff
   */
  async withRetry(operation, operationName = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 ${operationName} - Retry attempt ${attempt}/${this.maxRetries}`);
        }
        
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        console.log(`❌ ${operationName} attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain types of errors
        if (this.isNonRetryableError(error)) {
          console.log(`🚫 Non-retryable error for ${operationName}, aborting retries`);
          throw error;
        }
        
        // If this isn't the last attempt, wait before retrying
        if (attempt < this.maxRetries) {
          const delay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1), 
            this.maxDelay
          );
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.log(`💥 ${operationName} failed after ${this.maxRetries} attempts`);
    throw lastError;
  }

  /**
   * Check if error should not be retried
   */
  isNonRetryableError(error) {
    // Don't retry on authentication errors, bad requests, etc.
    if (error.response) {
      const status = error.response.status;
      return status === 401 || status === 403 || status === 400 || status === 422;
    }
    
    // Don't retry on certain error messages
    const nonRetryableMessages = [
      'invalid api key',
      'authentication failed',
      'quota exceeded',
      'rate limit exceeded'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return nonRetryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create axios instance with timeout and retry configuration
   */
  createAxiosInstance(timeout = 30000) {
    return axios.create({
      timeout,
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=5, max=1000'
      }
    });
  }

  /**
   * Analyze drawing using OpenAI Vision API
   */
  async analyzeDrawing(imageBase64) {
    if (!this.openaiApiKey) {
      return 'A wonderful drawing showing creative elements including characters, objects, and a colorful scene that tells a story.';
    }

    return await this.withRetry(async () => {
      const axiosInstance = this.createAxiosInstance(15000);
      
      const response = await axiosInstance.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this child\'s drawing and describe what you see. Focus on characters, objects, settings, and any story elements. Be creative and positive in your interpretation. This will be used to generate a children\'s story.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    }, 'Drawing Analysis').catch(error => {
      console.error('Drawing analysis failed completely:', error.message);
      return 'A wonderful drawing with creative elements that inspire an amazing story.';
    });
  }

  /**
   * Transcribe voice input using OpenAI Whisper
   */
  async transcribeVoice(audioBase64) {
    if (!this.openaiApiKey) {
      return 'I want to tell a story about adventure and friendship.';
    }

    return await this.withRetry(async () => {
      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `voice_${Date.now()}.wav`);
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(tempPath, audioBuffer);

      try {
        const FormData = require('form-data');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(tempPath));
        formData.append('model', 'whisper-1');
        formData.append('language', 'en');

        const axiosInstance = this.createAxiosInstance(20000);
        
        const response = await axiosInstance.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              ...formData.getHeaders()
            }
          }
        );

        return response.data.text;
      } finally {
        // Always clean up temp file
        try {
          fs.unlinkSync(tempPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError.message);
        }
      }
    }, 'Voice Transcription').catch(error => {
      console.error('Voice transcription failed completely:', error.message);
      return '';
    });
  }

  /**
   * Generate story content using OpenAI GPT-4 (6-line format for reliable narration)
   */
  async generateStory(storyPrompt) {
    if (!this.openaiApiKey) {
      return this.generateSimulatedStory(storyPrompt);
    }

    return await this.withRetry(async () => {
      const axiosInstance = this.createAxiosInstance(30000);
      
      const response = await axiosInstance.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a creative children\'s story writer who creates magical, educational, and age-appropriate stories for children ages 3-12. Create stories that are EXACTLY 6 lines long - no more, no less. Each line should be a complete sentence that flows naturally to the next. Keep the total word count under 100 words for optimal narration.'
            },
            {
              role: 'user',
              content: storyPrompt + '\n\nIMPORTANT: Write exactly 6 lines, each line being one sentence. Make it concise but magical!'
            }
          ],
          max_tokens: 200,
          temperature: 0.8
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    }, 'Story Generation');
  }

  /**
   * Generate story title
   */
  async generateTitle(storyContent, storyType) {
    if (!this.openaiApiKey) {
      return `A Magical ${storyType.name} Adventure`;
    }

    return await this.withRetry(async () => {
      const axiosInstance = this.createAxiosInstance(10000);
      
      const response = await axiosInstance.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: `Create a catchy, child-friendly title for this ${storyType.name} story. Make it engaging and magical:\n\n${storyContent.substring(0, 500)}...`
            }
          ],
          max_tokens: 50,
          temperature: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.replace(/"/g, '');
    }, 'Title Generation').catch(error => {
      console.error('Title generation failed completely:', error.message);
      return `A Magical ${storyType.name} Adventure`;
    });
  }

  /**
   * Generate audio narration using ElevenLabs (optimized for short stories)
   */
  async generateNarration(text, voiceSettings = {}) {
    if (!this.elevenLabsApiKey) {
      // Return simulated audio data for development
      return {
        audioBuffer: Buffer.from('simulated-audio-data'),
        duration: Math.ceil(text.split(' ').length * 0.5),
        voiceId: this.defaultVoiceId
      };
    }

    // With 6-line stories under 100 words, we shouldn't need chunking
    console.log(`🔊 Generating narration for ${text.length} characters (${text.split(' ').length} words)`);

    return await this.withRetry(async () => {
      const axiosInstance = this.createAxiosInstance(30000);
      
      const requestData = {
        text: text.trim(),
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
          ...voiceSettings
        }
      };

      const response = await axiosInstance.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.defaultVoiceId}`,
        requestData,
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey,
            'User-Agent': 'StoryGenerator/1.0'
          },
          responseType: 'arraybuffer',
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: function (status) {
            return status >= 200 && status < 300;
          }
        }
      );

      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Received empty audio response from ElevenLabs');
      }

      const audioBuffer = Buffer.from(response.data);
      const duration = Math.ceil(text.split(' ').length * 0.5);

      console.log(`✅ Generated ${audioBuffer.length} bytes of audio (estimated ${duration}s duration)`);

      return {
        audioBuffer,
        duration,
        voiceId: this.defaultVoiceId
      };
    }, 'Audio Narration');
  }

  /**
   * Generate audio narration and save to Firebase Storage
   */
  async generateNarrationWithStorage(text, storyId, voiceSettings = {}) {
    try {
      console.log(`🎵 Generating and uploading narration for story ${storyId}`);
      
      // Generate the audio
      const narrationResult = await this.generateNarration(text, voiceSettings);
      
      // Upload to Firebase Storage
      const firebaseResult = await this.firebaseStorage.uploadAudio(
        narrationResult.audioBuffer,
        storyId,
        narrationResult.voiceId
      );
      
      console.log(`✅ Narration uploaded to Firebase: ${firebaseResult.publicUrl}`);
      
      return {
        ...narrationResult,
        firebase: firebaseResult,
        audioUrl: firebaseResult.publicUrl,
        downloadUrl: firebaseResult.downloadUrl
      };
    } catch (error) {
      console.error('Narration generation with Firebase failed:', error);
      throw error;
    }
  }

  /**
   * Generate story illustrations using DALL-E
   */
  async generateIllustrations(storyContent, storyType, numImages = 2) {
    if (!this.openaiApiKey) {
      return [{
        imageBuffer: Buffer.from('simulated-image-data'),
        description: 'A beautiful illustration for the story'
      }];
    }

    const scenes = this.extractKeyScenes(storyContent, numImages);
    const illustrations = [];

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      
      await this.withRetry(async () => {
        const prompt = `Children's book illustration of: ${scene}. Style: ${storyType.name}, colorful, friendly, hand-drawn aesthetic, suitable for children ages 3-12. No text or words in the image.`;

        const axiosInstance = this.createAxiosInstance(60000);

        const response = await axiosInstance.post(
          'https://api.openai.com/v1/images/generations',
          {
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
            style: 'vivid'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.openaiApiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.data[0]?.url) {
          const imageResponse = await axiosInstance.get(response.data.data[0].url, {
            responseType: 'arraybuffer',
            timeout: 30000
          });

          illustrations.push({
            imageBuffer: Buffer.from(imageResponse.data),
            description: scene,
            index: i
          });
        }
      }, `Illustration Generation (${scene.substring(0, 50)}...)`).catch(error => {
        console.error(`Failed to generate illustration for scene: ${scene}`, error.message);
        illustrations.push({
          imageBuffer: Buffer.from('simulated-image-data'),
          description: scene,
          index: i
        });
      });
    }

    return illustrations;
  }

  /**
   * Generate illustrations and save to Firebase Storage
   */
  async generateIllustrationsWithStorage(storyContent, storyType, storyId, numImages = 2) {
    try {
      console.log(`🖼️  Generating and uploading ${numImages} illustrations for story ${storyId}`);
      
      // Generate the illustrations
      const illustrations = await this.generateIllustrations(storyContent, storyType, numImages);
      
      // Upload each illustration to Firebase
      const firebaseResults = [];
      for (let i = 0; i < illustrations.length; i++) {
        const illustration = illustrations[i];
        
        console.log(`📤 Uploading illustration ${i + 1}/${illustrations.length}`);
        
        const firebaseResult = await this.firebaseStorage.uploadImage(
          illustration.imageBuffer,
          storyId,
          illustration.description,
          i
        );
        
        firebaseResults.push({
          ...illustration,
          firebase: firebaseResult,
          imageUrl: firebaseResult.publicUrl,
          downloadUrl: firebaseResult.downloadUrl
        });
      }
      
      console.log(`✅ All ${firebaseResults.length} illustrations uploaded to Firebase`);
      
      return firebaseResults;
    } catch (error) {
      console.error('Illustration generation with Firebase failed:', error);
      throw error;
    }
  }

  /**
   * Generate complete story with all assets saved to Firebase
   */
  async generateCompleteStoryWithFirebase(input, storyId) {
    try {
      console.log(`🎨 Generating complete story with Firebase storage for ${storyId}`);
      
      // Build story prompt
      const storyPrompt = this.buildStoryPrompt(input);
      
      // Generate story content
      console.log('📝 Generating story content...');
      const storyContent = await this.generateStory(storyPrompt);
      
      // Generate title
      console.log('🏷️  Generating story title...');
      const title = await this.generateTitle(storyContent, input.storyType);
      
      // Generate and upload narration
      console.log('🔊 Generating and uploading narration...');
      const narrationResult = await this.generateNarrationWithStorage(
        storyContent,
        storyId,
        input.preferences?.voiceSettings
      );
      
      // Generate and upload illustrations (if requested)
      let illustrationsResult = [];
      if (input.preferences?.generateIllustrations) {
        console.log('🎨 Generating and uploading illustrations...');
        illustrationsResult = await this.generateIllustrationsWithStorage(
          storyContent,
          input.storyType,
          storyId,
          2
        );
      }
      
      const result = {
        storyId,
        title,
        content: storyContent,
        narration: {
          audioUrl: narrationResult.audioUrl,
          downloadUrl: narrationResult.downloadUrl,
          duration: narrationResult.duration,
          voiceId: narrationResult.voiceId,
          firebase: narrationResult.firebase
        },
        illustrations: illustrationsResult.map(ill => ({
          imageUrl: ill.imageUrl,
          downloadUrl: ill.downloadUrl,
          description: ill.description,
          firebase: ill.firebase
        })),
        metadata: {
          createdAt: new Date().toISOString(),
          storyType: input.storyType.name,
          language: input.language,
          length: input.length,
          characterNames: input.characterNames,
          hasAudio: true,
          hasIllustrations: illustrationsResult.length > 0
        }
      };
      
      console.log(`✨ Complete story generated and uploaded for ${storyId}`);
      console.log(`🎵 Audio: ${result.narration.audioUrl}`);
      console.log(`🖼️  Images: ${result.illustrations.length} uploaded`);
      
      return result;
    } catch (error) {
      console.error(`Failed to generate complete story for ${storyId}:`, error);
      throw error;
    }
  }

  /**
   * Build comprehensive story prompt (optimized for 6-line stories)
   */
  buildStoryPrompt(input) {
    const {
      storyType,
      drawingAnalysis,
      voiceTranscription,
      characterNames,
      characterDescriptions,
      userPrompt,
      length,
      language
    } = input;

    let prompt = `Create a short, magical children's story in the ${storyType.name} genre. `;

    if (drawingAnalysis) {
      prompt += `Base the story on this child's drawing: ${drawingAnalysis}. `;
    }

    if (voiceTranscription) {
      prompt += `Incorporate these ideas the child shared: "${voiceTranscription}". `;
    }

    if (characterNames && characterNames.length > 0) {
      prompt += `Include these character names: ${characterNames.join(', ')}. `;
    }

    if (characterDescriptions) {
      Object.entries(characterDescriptions).forEach(([name, description]) => {
        prompt += `${name} is ${description}. `;
      });
    }

    if (userPrompt) {
      prompt += `Story request: ${userPrompt}. `;
    }

    prompt += `
Story requirements:
- EXACTLY 6 lines (6 sentences total)
- Age-appropriate for children 3-12 years old
- Positive, educational, and inspiring
- Under 100 words total
- Language: ${language}
- Clear beginning, middle, and end
- Include a simple moral or positive message
- Make it magical and memorable!

Format: Write exactly 6 lines, each line being one complete sentence.`;

    return prompt;
  }

  /**
   * Extract key scenes from story content
   */
  extractKeyScenes(content, numScenes = 2) {
    // Split by line breaks for 6-line stories
    const lines = content.split('\n').filter(line => line.trim().length > 20);
    
    if (lines.length === 0) {
      return ['A magical adventure scene'];
    }

    const scenes = [];
    
    // For 6-line stories, take scenes from beginning and middle/end
    if (lines.length >= 2) {
      scenes.push(lines[0].trim()); // Beginning scene
      
      if (numScenes > 1) {
        const middleIndex = Math.floor(lines.length / 2);
        scenes.push(lines[middleIndex].trim()); // Middle scene
      }
    } else {
      scenes.push(lines[0].trim());
    }

    return scenes.length > 0 ? scenes : ['A magical adventure scene'];
  }

  /**
   * Generate simulated story for development (6-line format)
   */
  generateSimulatedStory(storyPrompt) {
    return `Once upon a time, Squeaky the brave little mouse heard about magical cheese hidden deep in the enchanted forest.
With his new friend Whiskers the wise cat, they set off on an exciting adventure together.
They crossed sparkling streams and climbed over colorful mushrooms, helping other forest animals along the way.
When they finally found the glowing magical cheese, it granted them the power to understand all forest languages.
Squeaky and Whiskers realized the real magic was the friendship they had built during their journey.
They returned home as heroes, sharing their magical gift with everyone in the village.`;
  }

  /**
   * Validate content safety
   */
  isContentSafe(content) {
    const inappropriateWords = [
      'scary', 'frightening', 'terrifying', 'violence', 'fight', 
      'hurt', 'pain', 'danger', 'weapon', 'death', 'kill'
    ];

    const lowercaseContent = content.toLowerCase();
    const foundWords = inappropriateWords.filter(word => 
      lowercaseContent.includes(word)
    );

    return {
      isSafe: foundWords.length === 0,
      flaggedWords: foundWords,
      severity: foundWords.length > 2 ? 'high' : foundWords.length > 0 ? 'medium' : 'safe'
    };
  }
}

module.exports = new AIService();