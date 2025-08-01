// working-audio-test.js - Test audio generation with your working API key

const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use one of the child-friendly voices from your response
const CHILD_FRIENDLY_VOICES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Young adult woman with a confident and warm, mature quality' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Young and popular, this playful American female voice' },
  { id: 'rCuVrCHOUMY3OwyJBJym', name: 'Mia', description: 'Clear, professional, friendly, confident and empathic woman' }
];

async function testAudioGeneration() {
  console.log('🧪 Testing ElevenLabs Audio Generation');
  console.log('='.repeat(50));
  
  const apiKey = process.env.ELEVENLABS_API_KEY;
  console.log('✅ API Key found:', apiKey.substring(0, 8) + '...');
  
  // Test story text
  const testStory = "Once upon a time, in a magical forest, there lived a friendly little rabbit named Luna. Every day, Luna would hop through the meadows and make friends with the butterflies and singing birds.";
  
  console.log('📖 Test story:', testStory);
  console.log('📏 Story length:', testStory.length, 'characters');
  
  // Test with child-friendly voice
  const testVoice = CHILD_FRIENDLY_VOICES[0]; // Sarah
  console.log('🎤 Testing with voice:', testVoice.name, '-', testVoice.description);
  
  try {
    console.log('\n📡 Making request to ElevenLabs...');
    
    const startTime = Date.now();
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${testVoice.id}`,
      {
        text: testStory,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.3,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer',
        timeout: 60000
      }
    );
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    
    console.log('✅ Audio generation successful!');
    console.log('⏱️  Generation time:', generationTime.toFixed(2), 'seconds');
    console.log('📊 Response status:', response.status);
    console.log('📦 Audio data size:', response.data.byteLength, 'bytes');
    console.log('🎵 Content type:', response.headers['content-type']);
    
    // Save audio file for testing
    const outputDir = path.join(__dirname, 'test-audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `test-story-${testVoice.name.toLowerCase()}-${Date.now()}.mp3`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, Buffer.from(response.data));
    console.log('💾 Audio saved to:', filepath);
    
    // Verify file was created
    const stats = fs.statSync(filepath);
    console.log('📁 File size:', stats.size, 'bytes');
    
    // Return the buffer for further testing
    return {
      success: true,
      audioBuffer: Buffer.from(response.data),
      size: response.data.byteLength,
      generationTime,
      filepath,
      voiceId: testVoice.id,
      voiceName: testVoice.name
    };
    
  } catch (error) {
    console.error('❌ Audio generation failed:');
    console.error('Status:', error.response?.status);
    console.error('Status text:', error.response?.statusText);
    console.error('Error message:', error.message);
    
    if (error.response?.data) {
      console.error('Response data:', Buffer.from(error.response.data).toString());
    }
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
}

// Test multiple voices
async function testMultipleVoices() {
  console.log('\n🎭 Testing Multiple Child-Friendly Voices');
  console.log('='.repeat(50));
  
  const shortText = "Hello! This is a test of a magical children's story voice.";
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  for (const voice of CHILD_FRIENDLY_VOICES) {
    try {
      console.log(`\n🎤 Testing: ${voice.name} (${voice.id})`);
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`,
        {
          text: shortText,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.2,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );
      
      console.log(`✅ ${voice.name}: Success (${response.data.byteLength} bytes)`);
      
      // Save sample
      const outputDir = path.join(__dirname, 'test-audio');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const filename = `voice-sample-${voice.name.toLowerCase().replace(/\s+/g, '-')}.mp3`;
      const filepath = path.join(outputDir, filename);
      fs.writeFileSync(filepath, Buffer.from(response.data));
      
    } catch (error) {
      console.error(`❌ ${voice.name}: Failed -`, error.response?.status, error.message);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test your exact code pattern
async function testYourCodePattern() {
  console.log('\n🔧 Testing Your Exact Code Pattern');
  console.log('='.repeat(50));
  
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah - from your voice list
  const testText = "Once upon a time, there was a little rabbit who loved to hop through the meadow.";
  
  console.log('🎤 Voice ID:', defaultVoiceId);
  console.log('📖 Text:', testText);
  
  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`,
      {
        text: testText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        responseType: 'arraybuffer'
      }
    );

    console.log('✅ Response received');
    console.log('📊 Status:', response.status);
    console.log('📦 Data size:', response.data.byteLength);
    
    const audioBuffer = Buffer.from(response.data);
    const duration = Math.ceil(testText.split(' ').length * 0.5);

    console.log('🎵 Audio buffer size:', audioBuffer.length);
    console.log('⏱️  Estimated duration:', duration, 'seconds');

    return {
      audioBuffer,
      duration,
      voiceId: defaultVoiceId
    };

  } catch (error) {
    console.error('❌ Failed:', error.response?.data || error.message);
    throw error;
  }
}

// Run all tests
async function runAllTests() {
  try {
    // Test 1: Basic audio generation
    const result1 = await testAudioGeneration();
    
    if (result1.success) {
      console.log('\n✅ Basic test passed! Audio generation is working.');
      
      // Test 2: Multiple voices
      await testMultipleVoices();
      
      // Test 3: Your exact code pattern
      console.log('\n🔧 Testing your exact code pattern...');
      const result3 = await testYourCodePattern();
      
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('📁 Audio files saved in: ./test-audio/');
      console.log('🎵 You can play these files to verify audio quality');
      
      console.log('\n📋 RECOMMENDED SETTINGS FOR YOUR APP:');
      console.log('✅ API Key: Working correctly');
      console.log('✅ Voice ID: EXAVITQu4vr4xnSDxMaL (Sarah)');
      console.log('✅ Model: eleven_multilingual_v2');
      console.log('✅ Voice Settings: stability: 0.6, similarity_boost: 0.8, style: 0.3');
      
    } else {
      console.log('\n❌ Basic test failed. Check your API setup.');
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
}

if (require.main === module) {
  runAllTests();
}

module.exports = { testAudioGeneration, testYourCodePattern };