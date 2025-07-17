// src/services/aiService.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    
    if (!this.openaiApiKey) {
      console.warn('⚠️  OpenAI API key not found. Story generation will be simulated.');
    }
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️  ElevenLabs API key not found. Voice generation will be simulated.');
    }
  }

  /**
   * Analyze drawing using OpenAI Vision API
   */
  async analyzeDrawing(imageBase64) {
    if (!this.openaiApiKey) {
      // Simulate analysis for development
      return 'A wonderful drawing showing creative elements including characters, objects, and a colorful scene that tells a story.';
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
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
    } catch (error) {
      console.error('Drawing analysis failed:', error.response?.data || error.message);
      return 'A wonderful drawing with creative elements that inspire an amazing story.';
    }
  }

  /**
   * Transcribe voice input using OpenAI Whisper
   */
  async transcribeVoice(audioBase64) {
    if (!this.openaiApiKey) {
      // Simulate transcription for development
      return 'I want to tell a story about adventure and friendship.';
    }

    try {
      // Create temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempPath = path.join(tempDir, `voice_${Date.now()}.wav`);
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      fs.writeFileSync(tempPath, audioBuffer);

      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempPath));
      formData.append('model', 'whisper-1');
      formData.append('language', 'en');

      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            ...formData.getHeaders()
          }
        }
      );

      // Clean up temp file
      fs.unlinkSync(tempPath);

      return response.data.text;
    } catch (error) {
      console.error('Voice transcription failed:', error.response?.data || error.message);
      return '';
    }
  }

  /**
   * Generate story content using OpenAI GPT-4
   */
  async generateStory(storyPrompt) {
    if (!this.openaiApiKey) {
      // Return simulated story for development
      return this.generateSimulatedStory(storyPrompt);
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a creative children\'s story writer who creates magical, educational, and age-appropriate stories that inspire young minds. Always ensure stories are positive, safe, and engaging for children ages 3-12.'
            },
            {
              role: 'user',
              content: storyPrompt
            }
          ],
          max_tokens: 800,
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
    } catch (error) {
      console.error('Story generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate story content');
    }
  }

  /**
   * Generate story title
   */
  async generateTitle(storyContent, storyType) {
    if (!this.openaiApiKey) {
      return `A Magical ${storyType.name} Adventure`;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
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
    } catch (error) {
      console.error('Title generation failed:', error.response?.data || error.message);
      return `A Magical ${storyType.name} Adventure`;
    }
  }

  /**
   * Generate audio narration using ElevenLabs
   */
  async generateNarration(text, voiceSettings = {}) {
    if (!this.elevenLabsApiKey) {
      // Return simulated audio data for development
      return {
        audioBuffer: Buffer.from('simulated-audio-data'),
        duration: Math.ceil(text.split(' ').length * 0.5), // ~0.5 seconds per word
        voiceId: this.defaultVoiceId
      };
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.defaultVoiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true,
            ...voiceSettings
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          responseType: 'arraybuffer'
        }
      );

      const audioBuffer = Buffer.from(response.data);
      const duration = Math.ceil(text.split(' ').length * 0.5); // Approximate duration

      return {
        audioBuffer,
        duration,
        voiceId: this.defaultVoiceId
      };
    } catch (error) {
      console.error('Narration generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate audio narration');
    }
  }

  /**
   * Generate story illustrations using DALL-E
   */
  async generateIllustrations(storyContent, storyType, numImages = 2) {
    if (!this.openaiApiKey) {
      // Return simulated image data for development
      return [{
        imageBuffer: Buffer.from('simulated-image-data'),
        description: 'A beautiful illustration for the story'
      }];
    }

    try {
      const scenes = this.extractKeyScenes(storyContent, numImages);
      const illustrations = [];

      for (const scene of scenes) {
        const prompt = `Children's book illustration of: ${scene}. Style: ${storyType.name}, colorful, friendly, hand-drawn aesthetic, suitable for children ages 3-12. No text or words in the image.`;

        const response = await axios.post(
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
          // Download the image
          const imageResponse = await axios.get(response.data.data[0].url, {
            responseType: 'arraybuffer'
          });

          illustrations.push({
            imageBuffer: Buffer.from(imageResponse.data),
            description: scene
          });
        }
      }

      return illustrations;
    } catch (error) {
      console.error('Illustration generation failed:', error.response?.data || error.message);
      return [{
        imageBuffer: Buffer.from('simulated-image-data'),
        description: 'A beautiful illustration for the story'
      }];
    }
  }

  /**
   * Build comprehensive story prompt
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

    let prompt = `Create a ${length} children's story in the ${storyType.name} genre. `;

    if (drawingAnalysis) {
      prompt += `Base the story on this child's drawing: ${drawingAnalysis}. `;
    }

    if (voiceTranscription) {
      prompt += `Incorporate these ideas the child shared: "${voiceTranscription}". `;
    }

    if (characterNames.length > 0) {
      prompt += `Include these character names: ${characterNames.join(', ')}. `;
    }

    Object.entries(characterDescriptions).forEach(([name, description]) => {
      prompt += `${name} is ${description}. `;
    });

    if (userPrompt) {
      prompt += `Additional user request: ${userPrompt}. `;
    }

    prompt += `
Story requirements:
- Age-appropriate for children 3-12 years old
- Positive, educational, and inspiring
- Include the characteristics: ${storyType.characteristics.join(', ')}
- Word count: ${this.getWordCountForLength(length)} words
- Language: ${language}
- Clear beginning, middle, and end
- Engaging dialogue and descriptions
- Moral lesson or positive message

Make it magical, fun, and memorable!`;

    return prompt;
  }

  /**
   * Extract key scenes from story content
   */
  extractKeyScenes(content, numScenes = 2) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50);
    const scenes = [];

    // Take evenly distributed paragraphs as scenes
    const step = Math.max(1, Math.floor(paragraphs.length / numScenes));
    
    for (let i = 0; i < Math.min(paragraphs.length, numScenes); i += step) {
      if (paragraphs[i]) {
        // Extract first sentence as scene description
        const firstSentence = paragraphs[i].split('.')[0];
        scenes.push(firstSentence.trim());
      }
    }

    return scenes.length > 0 ? scenes : ['A magical adventure scene'];
  }

  /**
   * Get word count target for story length
   */
  getWordCountForLength(length) {
    const wordCounts = {
      short: 150,
      medium: 300,
      long: 500,
      epic: 800
    };
    return wordCounts[length] || 300;
  }

  /**
   * Generate simulated story for development
   */
  generateSimulatedStory(storyPrompt) {
    return `Once upon a time, in a magical land far away, there lived a brave little character who loved adventures.

Every day, they would explore the enchanted forest near their home, meeting friendly animals and discovering wonderful secrets. The forest was filled with sparkling streams, colorful flowers, and trees that seemed to whisper ancient stories.

One sunny morning, something extraordinary happened. They found a mysterious map hidden beneath a rainbow-colored mushroom. The map showed the way to a treasure that could bring happiness to their entire village.

With courage in their heart and their loyal friends by their side, they began an amazing journey. Along the way, they learned important lessons about friendship, kindness, and believing in themselves.

After facing challenges and helping others, they discovered that the real treasure wasn't gold or jewels, but the joy of sharing adventures with friends and the confidence they found within themselves.

And they all lived happily ever after, knowing that every day could bring a new magical adventure.

The End.`;
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