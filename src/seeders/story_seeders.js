// src/seeders/storySeeder.js
require('dotenv').config(); // Load environment variables

const { initializeFirebase, getFirestore } = require('../config/firebase');
const { StoryType, DailyChallenge } = require('../models/storyModels');

// Initialize Firebase before using it
try {
  initializeFirebase();
  console.log('✅ Firebase initialized for seeding');
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
  process.exit(1);
}

// Base story categories for generating 2600 story types
const baseCategories = [
  'Adventure', 'Fantasy', 'Friendship', 'Family', 'Animals', 'Science', 'Mystery', 'Comedy',
  'Educational', 'Fairy Tale', 'Space', 'Ocean', 'Forest', 'City', 'School', 'Sports',
  'Music', 'Art', 'Cooking', 'Travel', 'Seasons', 'Holidays', 'Emotions', 'Dreams',
  'Robots', 'Pirates', 'Dinosaurs', 'Superheroes', 'Magic', 'Nature', 'Weather', 'Transportation',
  'Jobs', 'Hobbies', 'Games', 'Books', 'Movies', 'Dance', 'Theater', 'Photography',
  'Gardening', 'Building', 'Exploring', 'Learning', 'Growing', 'Helping', 'Sharing', 'Caring',
  'Discovering', 'Creating', 'Playing', 'Singing', 'Dancing', 'Running', 'Swimming', 'Flying',
  'Climbing', 'Jumping', 'Laughing', 'Smiling', 'Wondering', 'Imagining', 'Dreaming', 'Wishing'
];

const themes = [
  'courage', 'kindness', 'friendship', 'family', 'love', 'adventure', 'discovery', 'learning',
  'growing', 'helping', 'sharing', 'caring', 'creativity', 'imagination', 'wonder', 'magic',
  'science', 'nature', 'animals', 'space', 'ocean', 'forest', 'seasons', 'weather',
  'emotions', 'dreams', 'goals', 'teamwork', 'problem-solving', 'perseverance', 'confidence',
  'self-esteem', 'empathy', 'respect', 'responsibility', 'honesty', 'trust', 'loyalty'
];

const settings = [
  'forest', 'ocean', 'mountain', 'city', 'village', 'school', 'home', 'park', 'zoo', 'farm',
  'space', 'underwater', 'castle', 'island', 'desert', 'jungle', 'arctic', 'garden', 'library',
  'museum', 'playground', 'beach', 'lake', 'river', 'cave', 'treehouse', 'spaceship', 'submarine'
];

const characters = [
  'children', 'animals', 'robots', 'fairies', 'dragons', 'unicorns', 'pirates', 'astronauts',
  'scientists', 'teachers', 'doctors', 'firefighters', 'police', 'farmers', 'artists', 'musicians',
  'dancers', 'athletes', 'chefs', 'builders', 'explorers', 'inventors', 'writers', 'photographers'
];

const colorSchemes = [
  '#FF6B35', '#9B59B6', '#F39C12', '#E74C3C', '#3498DB', '#2ECC71', '#E67E22', '#1ABC9C',
  '#34495E', '#F1C40F', '#8E44AD', '#27AE60', '#2980B9', '#E74C3C', '#D35400', '#16A085',
  '#7F8C8D', '#C0392B', '#8E44AD', '#2C3E50', '#F39C12', '#E67E22', '#95A5A6', '#BDC3C7'
];

// Function to generate 2600 story types
function generateStoryTypes() {
  const storyTypes = [];
  let sortOrder = 1;

  // Generate story types for each age from 2 to 15
  for (let age = 2; age <= 15; age++) {
    const storiesPerAge = Math.floor(2600 / 14); // Distribute evenly across ages 2-15

    for (let i = 0; i < storiesPerAge; i++) {
      const categoryIndex = (sortOrder - 1) % baseCategories.length;
      const themeIndex = (sortOrder - 1) % themes.length;
      const settingIndex = (sortOrder - 1) % settings.length;
      const characterIndex = (sortOrder - 1) % characters.length;
      const colorIndex = (sortOrder - 1) % colorSchemes.length;

      const category = baseCategories[categoryIndex];
      const theme = themes[themeIndex];
      const setting = settings[settingIndex];
      const character = characters[characterIndex];

      // Create age-appropriate ranges
      const ageMin = Math.max(2, age - 1);
      const ageMax = Math.min(15, age + 2);

      const storyType = {
        id: `${category.toLowerCase()}_${setting}_${character}_${age}_${i}`.replace(/[^a-z0-9_]/g, ''),
        name: `${category} in ${setting.charAt(0).toUpperCase() + setting.slice(1)}`,
        description: `${getAgeAppropriateDescription(category, setting, character, age)}`,
        iconUrl: `https://storage.googleapis.com/pictotale-assets/icons/${category.toLowerCase()}.svg`,
        coverImageUrl: `https://storage.googleapis.com/pictotale-assets/covers/${category.toLowerCase()}_${setting}.jpg`,
        characteristics: getCharacteristics(category, theme, setting, character, age),
        colorScheme: colorSchemes[colorIndex],
        recommendedAgeMin: ageMin,
        recommendedAgeMax: ageMax,
        isActive: true,
        sortOrder: sortOrder,
        aiPromptTemplate: {
          basePrompt: `Create a ${category.toLowerCase()} story set in ${setting} featuring ${character} for age ${age}`,
          themes: [theme, 'age-appropriate learning', 'positive values'],
          vocabulary: getVocabularyLevel(age),
          structure: getStoryStructure(age)
        },
        sampleStoryTitles: generateSampleTitles(category, setting, character, age)
      };

      storyTypes.push(storyType);
      sortOrder++;
    }
  }

  return storyTypes;
}

// Helper functions
function getAgeAppropriateDescription(category, setting, character, age) {
  if (age <= 4) {
    return `Simple ${category.toLowerCase()} stories with ${character} in ${setting}. Perfect for toddlers and preschoolers.`;
  } else if (age <= 8) {
    return `Engaging ${category.toLowerCase()} tales featuring ${character} exploring ${setting}. Great for early readers.`;
  } else if (age <= 12) {
    return `Exciting ${category.toLowerCase()} adventures with ${character} in ${setting}. Ideal for middle childhood.`;
  } else {
    return `Complex ${category.toLowerCase()} narratives featuring ${character} in ${setting}. Perfect for young teens.`;
  }
}

function getCharacteristics(category, theme, setting, character, age) {
  const baseChars = [theme, `${character} characters`, `${setting} setting`];

  if (age <= 4) {
    return [...baseChars, 'simple concepts', 'repetitive patterns', 'bright colors'];
  } else if (age <= 8) {
    return [...baseChars, 'clear lessons', 'relatable situations', 'positive outcomes'];
  } else if (age <= 12) {
    return [...baseChars, 'character development', 'problem solving', 'moral lessons'];
  } else {
    return [...baseChars, 'complex themes', 'character growth', 'life lessons'];
  }
}

function getVocabularyLevel(age) {
  if (age <= 4) return 'simple words and short sentences';
  if (age <= 8) return 'age-appropriate vocabulary with some new words';
  if (age <= 12) return 'expanded vocabulary with explanations';
  return 'rich vocabulary appropriate for young teens';
}

function getStoryStructure(age) {
  if (age <= 4) return 'simple beginning, middle, end with repetition';
  if (age <= 8) return 'clear story arc with problem and solution';
  if (age <= 12) return 'developed plot with character growth';
  return 'complex narrative with multiple themes and character development';
}

function generateSampleTitles(category, setting, character, age) {
  const titles = [
    `The ${category} of ${setting.charAt(0).toUpperCase() + setting.slice(1)}`,
    `${character.charAt(0).toUpperCase() + character.slice(1)} in ${setting.charAt(0).toUpperCase() + setting.slice(1)}`,
    `The Great ${setting.charAt(0).toUpperCase() + setting.slice(1)} ${category}`
  ];
  return titles;
}

// Generate all 2600 story types
const storyTypesData = generateStoryTypes();
console.log(`Generated ${storyTypesData.length} story types for ages 2-15`);

// Daily Challenges Seed Data

const dailyChallengesData = [
  {
    id: 'adventure_week_1',
    title: 'Draw Your Dream Adventure',
    description: 'Draw yourself going on an amazing adventure! Where would you go and what would you discover?',
    promptText: 'Create a story about your greatest adventure dream',
    challengeImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/challenges/adventure.jpg',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    suggestedStoryTypes: ['adventure', 'fantasy'],
    rewards: {
      experiencePoints: 50,
      badge: 'adventure_explorer',
      title: 'Adventure Explorer'
    },
    difficultyLevel: 1,
    isActive: true
  },
  {
    id: 'friendship_week_1',
    title: 'Make a New Friend',
    description: 'Draw or tell us about making a new friend! What would you do together?',
    promptText: 'Tell a story about making a special new friend',
    challengeImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/challenges/friendship.jpg',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    suggestedStoryTypes: ['friendship', 'animal'],
    rewards: {
      experiencePoints: 40,
      badge: 'friendship_builder',
      title: 'Friendship Builder'
    },
    difficultyLevel: 1,
    isActive: true
  },
  {
    id: 'nature_week_1',
    title: 'Explore Nature',
    description: 'Draw your favorite place in nature! What animals live there? What makes it special?',
    promptText: 'Create a story about exploring the natural world',
    challengeImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/challenges/nature.jpg',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    suggestedStoryTypes: ['educational', 'animal', 'adventure'],
    rewards: {
      experiencePoints: 45,
      badge: 'nature_explorer',
      title: 'Nature Explorer'
    },
    difficultyLevel: 2,
    isActive: true
  }
];

// Main seeding function
async function seedStoryData() {
  const db = getFirestore();
  
  try {
    console.log('🌱 Starting PictoTale story data seeding...\n');
    
    // Seed Story Types (without using the StoryType class for now)
    console.log('📚 Seeding story types...');
    const storyTypeBatch = db.batch();
    
    for (const storyTypeData of storyTypesData) {
      const docRef = db.collection('storyTypes').doc(storyTypeData.id);
      storyTypeBatch.set(docRef, storyTypeData);
      console.log(`  ✅ ${storyTypeData.name} (${storyTypeData.id})`);
    }
    
    await storyTypeBatch.commit();
    console.log(`✅ Successfully seeded ${storyTypesData.length} story types\n`);
    
    // Seed Daily Challenges
    console.log('🎯 Seeding daily challenges...');
    const challengeBatch = db.batch();
    
    for (const challengeData of dailyChallengesData) {
      const docRef = db.collection('dailyChallenges').doc(challengeData.id);
      challengeBatch.set(docRef, challengeData);
      console.log(`  ✅ ${challengeData.title} (${challengeData.id})`);
    }
    
    await challengeBatch.commit();
    console.log(`✅ Successfully seeded ${dailyChallengesData.length} daily challenges\n`);
    
    console.log('🎉 All story data seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   - Story Types: ${storyTypesData.length}`);
    console.log(`   - Daily Challenges: ${dailyChallengesData.length}`);
    console.log('   - Collections: storyTypes, dailyChallenges');
    
    return {
      success: true,
      storyTypesCount: storyTypesData.length,
      challengesCount: dailyChallengesData.length
    };
    
  } catch (error) {
    console.error('❌ Error seeding story data:', error);
    throw error;
  }
}

// Function to clear existing data (use with caution!)
async function clearStoryData() {
  const db = getFirestore();
  
  try {
    console.log('🗑️  Clearing existing story data...');
    
    // Clear story types
    const storyTypesSnapshot = await db.collection('storyTypes').get();
    const storyTypeBatch = db.batch();
    storyTypesSnapshot.docs.forEach(doc => {
      storyTypeBatch.delete(doc.ref);
    });
    await storyTypeBatch.commit();
    console.log(`  ✅ Cleared ${storyTypesSnapshot.size} story types`);
    
    // Clear daily challenges
    const challengesSnapshot = await db.collection('dailyChallenges').get();
    const challengeBatch = db.batch();
    challengesSnapshot.docs.forEach(doc => {
      challengeBatch.delete(doc.ref);
    });
    await challengeBatch.commit();
    console.log(`  ✅ Cleared ${challengesSnapshot.size} daily challenges`);
    
    console.log('✅ Story data cleared successfully');
    
  } catch (error) {
    console.error('❌ Error clearing story data:', error);
    throw error;
  }
}

// Export functions for use in other files
module.exports = {
  seedStoryData,
  clearStoryData,
  storyTypesData,
  dailyChallengesData
};

// If this file is run directly, execute seeding
if (require.main === module) {
  seedStoryData()
    .then(() => {
      console.log('✅ Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}