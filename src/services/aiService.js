// src/services/aiService.js - Updated with 50-word limit for cost optimization
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    this.defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
    
    // Cost optimization settings
    this.maxStoryWords = 200; // Maximum words for cost savings
    this.maxTokensForStory = 250; // Reduced tokens since we want short stories
    
    if (!this.openaiApiKey) {
      console.warn('⚠️  OpenAI API key not found. Story generation will be simulated.');
    }
    
    if (!this.elevenLabsApiKey) {
      console.warn('⚠️  ElevenLabs API key not found. Voice generation will be simulated.');
    }
  }
/**
   * Count expressions and sound effects in story
   */
  countExpressions(text) {
    const expressions = [
      // Sound effects
      'whoosh', 'splash', 'boom', 'pop', 'zoom', 'flutter', 'sparkle', 'ding', 'puff',
      'giggle', 'gasp', 'pitter-patter', 'hoot', 'surprise',
      // Expressions
      'oh my', 'wow', 'yay', 'hooray', 'amazing', 'uh oh', 'wonderful', 'gasp',
      // Exclamations (count ! marks)
      '!'
    ];
    
    const lowerText = text.toLowerCase();
    let count = 0;
    
    expressions.forEach(expr => {
      const regex = new RegExp(expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = lowerText.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    
    return count;
  }

  /**
   * Enhance story with expressions if it lacks them
   */
  enhanceWithExpressions(story) {
    // Check if story already has good expressions
    const expressionCount = this.countExpressions(story);
    
    if (expressionCount >= 3) {
      return story; // Already expressive enough
    }
    
    console.log('🎭 Enhancing story with more expressions...');
    
    // Add some basic expressions to make it more lively
    let enhanced = story;
    
    // Add exclamation points to existing sentences
    enhanced = enhanced.replace(/\. ([A-Z])/g, '! $1');
    
    // Add some common expressions at natural points
    if (!enhanced.toLowerCase().includes('wow') && !enhanced.toLowerCase().includes('oh')) {
      enhanced = enhanced.replace(/found|discovered|saw/, '"Wow!" $&');
    }
    
    // Ensure we don't exceed word limit after enhancements
    const maxWords = 50;
    if (this.countWords(enhanced) > maxWords) {
      return this.enforceWordLimit(enhanced, maxWords);
    }
    
    return enhanced;
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
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this child\'s drawing and describe what you see in 1-2 sentences. Focus on key characters, objects, and story elements. Keep it brief for a short story.'
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
          max_tokens: 100 // Reduced for cost savings
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
 * Generate story content using OpenAI GPT-4 (REPLACE your existing generateStory method with this)
 */
async generateStory(storyPrompt) {
  if (!this.openaiApiKey) {
    // Return simulated SHORT story for development
    return this.generateSimulatedShortStory();
  }

  try {
    console.log('📝 Generating expressive story with 80-200word limit...');
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a children's story writer who creates VERY SHORT, EXPRESSIVE stories of exactly 200 words or less. Every story must include:

SOUND EFFECTS & EXPRESSIONS:
- Use sound words like: "whoosh", "splash", "boom", "giggle", "gasp", "wow", "yay"
- Include emotional expressions: "Oh my!", "Hooray!", "Uh oh!", "Amazing!"
- Add action sounds: "zoom", "pop", "sparkle", "flutter", "bounce"

STORY REQUIREMENTS:
- Complete with beginning, middle, and end
- Magical and engaging for children ages 3-12
- Positive and safe
- EXACTLY 200 words or fewer (count carefully!)
- Include dialogue with expressions
- Make it come alive with sounds
- should end with a positive message 
- should end with words like "The end!" to signal completion

Example: "Luna found a magic acorn. WHOOSH! It grew into a rainbow tree! 'Wow!' gasped Luna. Animals came running - pitter-patter, pitter-patter. 'Yay!' they cheered, playing under sparkly branches. Giggle, giggle! Luna learned sharing magic makes everything more wonderful. The end!"

Write an expressive, sound-filled story in 200 words or less.`
          },
          {
            role: 'user',
            content: storyPrompt
          }
        ],
        max_tokens: 500, // Reduced for short stories
        temperature: 0.9 // Higher for more creativity with expressions
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let storyContent = response.data.choices[0].message.content.trim();
    
    // Add expressions if story lacks them
    storyContent = this.enhanceWithExpressions(storyContent);
    
    // Enforce word limit on the generated content
    storyContent = this.enforceWordLimit(storyContent, 200);
    
    const wordCount = this.countWords(storyContent);
    console.log(`📊 Generated expressive story: ${wordCount} words (limit: 200)`);
    console.log(`🎭 Expression count: ${this.countExpressions(storyContent)}`);
    console.log(`💰 ElevenLabs cost savings: ~${Math.round(((250 - wordCount) / 250) * 100)}%`);
    
    return storyContent;
    
  } catch (error) {
    console.error('Story generation failed:', error.response?.data || error.message);
    throw new Error('Failed to generate story content');
  }
}

  /**
   * Generate story title (shorter for cost savings)
   */
  async generateTitle(storyContent, storyType) {
    if (!this.openaiApiKey) {
      return `A Magical ${storyType.name} Tale`;
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: `Create a short, catchy title (maximum 5 words) for this ${storyType.name} children's story:\n\n${storyContent}`
            }
          ],
          max_tokens: 20, // Very short for titles
          temperature: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content.replace(/"/g, '').trim();
    } catch (error) {
      console.error('Title generation failed:', error.response?.data || error.message);
      return `A Magical ${storyType.name} Tale`;
    }
  }

  /**
   * Generate audio narration using ElevenLabs (optimized for short stories)
   */
  async generateNarration(text, voiceSettings = {}) {
    console.log('🔊 Generating narration for cost-optimized story...');
    console.log(`📊 Text length: ${text.length} characters, ${this.countWords(text)} words`);
    
    if (!this.elevenLabsApiKey) {
      // Return simulated audio data for development
      const wordCount = this.countWords(text);
      return {
        audioBuffer: Buffer.from('simulated-audio-data'),
        duration: Math.ceil(wordCount * 0.5), // ~0.5 seconds per word
        voiceId: this.defaultVoiceId,
        estimatedCost: wordCount * 0.0005 // Approximate cost
      };
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${this.defaultVoiceId}`,
        {
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.6, // Slightly higher for short stories
            similarity_boost: 0.8,
            style: 0.3, // More expressive for children
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
          responseType: 'arraybuffer',
          timeout: 30000 // Shorter timeout for short stories
        }
      );

      const endTime = Date.now();
      const generationTime = (endTime - startTime) / 1000;
      
      const audioBuffer = Buffer.from(response.data);
      const wordCount = this.countWords(text);
      const duration = Math.ceil(wordCount * 0.5); // Approximate duration
      const estimatedCost = wordCount * 0.0005; // Approximate cost

      console.log('✅ Audio generation completed:');
      console.log(`   📦 Size: ${audioBuffer.length} bytes`);
      console.log(`   ⏱️ Duration: ~${duration} seconds`);
      console.log(`   💰 Estimated cost: ~$${estimatedCost.toFixed(4)}`);
      console.log(`   🚀 Generation time: ${generationTime.toFixed(2)}s`);

      return {
        audioBuffer,
        duration,
        voiceId: this.defaultVoiceId,
        estimatedCost,
        generationTime,
        settings: voiceSettings
      };
    } catch (error) {
      console.error('Narration generation failed:', error.response?.data || error.message);
      throw new Error('Failed to generate audio narration');
    }
  }

  /**
   * Generate story illustrations using DALL-E (reduced for cost)
   */
  async generateIllustrations(storyContent, storyType, numImages = 1) { // Reduced default to 1
    if (!this.openaiApiKey) {
      // Return simulated image data for development
      return [{
        imageBuffer: Buffer.from('simulated-image-data'),
        description: 'A beautiful illustration for the story'
      }];
    }

    try {
      console.log(`🎨 Generating ${numImages} illustration(s) for short story...`);
      
      const scenes = this.extractKeyScenes(storyContent, numImages);
      const illustrations = [];

      for (const scene of scenes) {
        // Shorter, more focused prompt for cost savings
        const prompt = `Simple children's book illustration: ${scene}. ${storyType.name} style, bright colors, child-friendly. No text.`;

        const response = await axios.post(
          'https://api.openai.com/v1/images/generations',
          {
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard', // Standard quality for cost savings
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

      console.log(`✅ Generated ${illustrations.length} illustration(s)`);
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
   * Build comprehensive story prompt with 50-word limit
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

    let prompt = `Create a complete children's story in EXACTLY ${this.maxStoryWords} words or less. Genre: ${storyType.name}. `;

    if (drawingAnalysis) {
      prompt += `Based on this drawing: ${drawingAnalysis}. `;
    }

    if (voiceTranscription) {
      prompt += `Include: "${voiceTranscription}". `;
    }

    if (characterNames.length > 0) {
      prompt += `Characters: ${characterNames.join(', ')}. `;
    }

    // Keep character descriptions brief
    Object.entries(characterDescriptions).forEach(([name, description]) => {
      prompt += `${name} is ${description}. `;
    });

    if (userPrompt) {
      prompt += `Request: ${userPrompt}. `;
    }

    prompt += `
CRITICAL REQUIREMENTS:
- MAXIMUM ${this.maxStoryWords} words (count carefully!)
- Complete story: beginning, middle, end
- Age-appropriate for children 3-12
- ${storyType.characteristics.slice(0, 2).join(', ')}
- Language: ${language}
- Positive and magical
- Every word must count

Write a complete, enchanting ${this.maxStoryWords}-word story.`;

    return prompt;
  }

  /**
   * Enforce word limit by truncating if necessary
   */
  enforceWordLimit(text, maxWords) {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length <= maxWords) {
      return text;
    }
    
    console.log(`⚠️ Story exceeded ${maxWords} words (${words.length}), truncating...`);
    
    // Truncate to maxWords and try to end at a sentence
    let truncated = words.slice(0, maxWords).join(' ');
    
    // If we cut off mid-sentence, try to end at the last complete sentence
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentenceEnd > truncated.length * 0.7) { // If last sentence is reasonably close to end
      truncated = truncated.substring(0, lastSentenceEnd + 1);
    } else {
      // Add proper ending if we cut mid-sentence
      if (!truncated.match(/[.!?]$/)) {
        truncated += '.';
      }
    }
    
    const finalWordCount = this.countWords(truncated);
    console.log(`✂️ Truncated to ${finalWordCount} words`);
    return truncated;
  }

  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract key scenes from story content (optimized for short stories)
   */
  extractKeyScenes(content, numScenes = 1) {
    // For short stories, just take the main scene
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    if (sentences.length === 0) {
      return ['A magical adventure scene'];
    }
    
    // For very short stories, just use the first meaningful sentence
    const mainScene = sentences[0].trim();
    return [mainScene];
  }

  /**
   * Get word count target for story length (always 50 for cost optimization)
   */
  getWordCountForLength(length) {
    // Override all lengths to use our cost-optimized word count
    return this.maxStoryWords;
  }

/**
 * Generate simulated SHORT story with expressions for development (REPLACE your existing one)
 */
generateSimulatedShortStory() {
  const expressiveShortStories = [
    "Luna found a magic acorn. WHOOSH! It grew into a rainbow tree! 'Wow!' gasped the forest animals. Pitter-patter, they ran to play under sparkly branches. 'Giggle, giggle!' went Luna. 'Sharing magic makes everything wonderful!' she cheered. Hooray!",
    
    "Tommy opened his backpack. SURPRISE! A tiny dragon popped out! 'Oh my!' Tommy whispered. The dragon went PUFF and granted a wish. 'I wish Grandma feels better!' SPARKLE! Magic worked instantly. 'Yay!' cheered Tommy and his new friend.",
    
    "Princess Mia lost her crown in the forest. 'Uh oh!' she sighed. FLUTTER-FLUTTER, a wise owl appeared. 'Hoot! I'll help!' Together they solved riddles. DING! They found it in a fairy circle, glowing bright. 'Amazing!' Mia gasped. Friendship wins!",
    
    "Captain Sam sailed his cloud ship across starry skies. WHOOSH! A shooting star fell down. 'Gasp!' went Sam, catching it gently. ZOOM! He returned it to the grateful moon. 'Thank you!' sang the moon, giving Sam a magical compass. Adventure awaits!",
    
    "Ella planted seeds in grandmother's garden. POP! Overnight, flowers became a magical portal! 'Wow!' she giggled, stepping through. FLUTTER! Butterfly friends welcomed her with tea. 'Wonderful!' Ella learned flower language before skipping home with special seeds."
  ];
  
  // Return a random expressive short story and verify word count
  const randomStory = expressiveShortStories[Math.floor(Math.random() * expressiveShortStories.length)];
  const wordCount = this.countWords(randomStory);
  const expressionCount = this.countExpressions(randomStory);
  
  console.log(`📝 Simulated expressive story: ${wordCount} words, ${expressionCount} expressions`);
  
  if (wordCount > 50) {
    return this.enforceWordLimit(randomStory, 50);
  }
  
  return randomStory;
}

  /**
   * Calculate estimated costs for story generation
   */
  calculateEstimatedCosts(storyContent) {
    const wordCount = this.countWords(storyContent);
    const characterCount = storyContent.length;
    
    // Approximate costs (these are estimates)
    const elevenLabsCost = wordCount * 0.0005; // ~$0.0005 per word
    const openAICost = (wordCount * 1.5) * 0.000001; // Approximate token cost
    const totalCost = elevenLabsCost + openAICost;
    
    // Cost comparison with longer stories
    const longStoryCost = 250 * 0.0005; // 250-word story cost
    const savings = longStoryCost - elevenLabsCost;
    const savingsPercentage = (savings / longStoryCost) * 100;
    
    return {
      wordCount,
      characterCount,
      estimatedElevenLabsCost: elevenLabsCost,
      estimatedOpenAICost: openAICost,
      estimatedTotalCost: totalCost,
      comparedToLongStory: {
        longStoryCost,
        savings,
        savingsPercentage: Math.round(savingsPercentage)
      }
    };
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

  /**
   * Test story generation with cost analysis
   */
  async testCostOptimizedGeneration() {
    console.log('🧪 Testing Cost-Optimized Story Generation');
    console.log('='.repeat(60));
    
    const testPrompts = [
      {
        storyType: { name: 'adventure', characteristics: ['brave hero', 'exciting journey'] },
        userPrompt: 'A mouse goes on an adventure',
        characterNames: ['Pip']
      },
      {
        storyType: { name: 'friendship', characteristics: ['caring friends', 'helping others'] },
        userPrompt: 'Two unlikely friends meet',
        characterNames: ['Stella', 'Rex']
      }
    ];
    
    for (let i = 0; i < testPrompts.length; i++) {
      const test = testPrompts[i];
      console.log(`\n📖 Test ${i + 1}: ${test.storyType.name} story`);
      console.log('-'.repeat(40));
      
      try {
        const prompt = this.buildStoryPrompt({
          ...test,
          characterDescriptions: {},
          length: 'short',
          language: 'en'
        });
        
        const story = await this.generateStory(prompt);
        const costs = this.calculateEstimatedCosts(story);
        const title = await this.generateTitle(story, test.storyType);
        
        console.log('📝 Title:', title);
        console.log('📊 Word count:', costs.wordCount);
        console.log('💰 Estimated cost: $', costs.estimatedTotalCost.toFixed(4));
        console.log('💚 Savings vs long story:', costs.comparedToLongStory.savingsPercentage + '%');
        console.log('📖 Story:', story);
        
      } catch (error) {
        console.error('❌ Test failed:', error.message);
      }
    }
  }
}

module.exports = new AIService();