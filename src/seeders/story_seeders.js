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

// Story Types Seed Data
const storyTypesData = [
  {
    id: 'adventure',
    name: 'Adventure',
    description: 'Exciting journeys and quests with brave heroes exploring new worlds',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/adventure.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/adventure.jpg',
    characteristics: [
      'brave heroes',
      'exciting quests',
      'mysterious places',
      'treasure hunting',
      'overcoming challenges'
    ],
    colorScheme: '#FF6B35',
    recommendedAgeMin: 4,
    recommendedAgeMax: 12,
    isActive: true,
    sortOrder: 1,
    aiPromptTemplate: {
      basePrompt: 'Create an exciting adventure story with brave characters who go on a quest',
      themes: ['courage', 'exploration', 'friendship', 'problem-solving'],
      vocabulary: 'age-appropriate with action words',
      structure: 'clear beginning with setup, exciting middle with challenges, satisfying resolution'
    },
    sampleStoryTitles: [
      'The Treasure of Rainbow Island',
      'Maya\'s Magical Mountain Quest',
      'The Secret of the Crystal Cave'
    ]
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Magical worlds filled with unicorns, dragons, fairies, and enchanted forests',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/fantasy.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/fantasy.jpg',
    characteristics: [
      'magical creatures',
      'enchanted forests',
      'fairy tale elements',
      'talking animals',
      'magical powers'
    ],
    colorScheme: '#9B59B6',
    recommendedAgeMin: 3,
    recommendedAgeMax: 10,
    isActive: true,
    sortOrder: 2,
    aiPromptTemplate: {
      basePrompt: 'Create a magical fantasy story with enchanted creatures and wonderful magic',
      themes: ['magic', 'wonder', 'kindness', 'believing in yourself'],
      vocabulary: 'whimsical and magical words',
      structure: 'fairy tale structure with magical elements throughout'
    },
    sampleStoryTitles: [
      'Luna the Unicorn\'s First Rainbow',
      'The Dragon Who Loved to Paint',
      'Fairy Village\'s Missing Sparkle'
    ]
  },
  {
    id: 'friendship',
    name: 'Friendship',
    description: 'Heartwarming tales about making friends, helping others, and working together',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/friendship.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/friendship.jpg',
    characteristics: [
      'making new friends',
      'helping others',
      'sharing and caring',
      'teamwork',
      'kindness'
    ],
    colorScheme: '#F39C12',
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    isActive: true,
    sortOrder: 3,
    aiPromptTemplate: {
      basePrompt: 'Create a heartwarming story about friendship, kindness, and helping others',
      themes: ['friendship', 'empathy', 'cooperation', 'inclusion'],
      vocabulary: 'warm and emotional words',
      structure: 'character meets challenge, friends help, everyone learns and grows'
    },
    sampleStoryTitles: [
      'The New Kid at Playground Park',
      'Benny Bear\'s Big Heart',
      'The Friendship Garden'
    ]
  },
  {
    id: 'educational',
    name: 'Educational',
    description: 'Fun learning adventures about science, nature, history, and discovering new things',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/educational.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/educational.jpg',
    characteristics: [
      'learning new things',
      'science experiments',
      'nature exploration',
      'historical adventures',
      'problem solving'
    ],
    colorScheme: '#27AE60',
    recommendedAgeMin: 5,
    recommendedAgeMax: 12,
    isActive: true,
    sortOrder: 4,
    aiPromptTemplate: {
      basePrompt: 'Create an educational story that teaches something new in a fun and engaging way',
      themes: ['curiosity', 'learning', 'discovery', 'science'],
      vocabulary: 'educational but simple terms with explanations',
      structure: 'introduce concept, explore through story, reinforce learning'
    },
    sampleStoryTitles: [
      'Zoe\'s Amazing Space Adventure',
      'The Life Cycle of Bella Butterfly',
      'How Rainbows Are Made'
    ]
  },
  {
    id: 'mystery',
    name: 'Mystery',
    description: 'Gentle mysteries and detective stories perfect for young investigators',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/mystery.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/mystery.jpg',
    characteristics: [
      'solving puzzles',
      'finding clues',
      'detective work',
      'gentle suspense',
      'logical thinking'
    ],
    colorScheme: '#8E44AD',
    recommendedAgeMin: 6,
    recommendedAgeMax: 12,
    isActive: true,
    sortOrder: 5,
    aiPromptTemplate: {
      basePrompt: 'Create a child-friendly mystery story with clues to solve and a satisfying resolution',
      themes: ['problem-solving', 'observation', 'logic', 'persistence'],
      vocabulary: 'mystery terms but not scary',
      structure: 'introduce mystery, gather clues, solve with logic and teamwork'
    },
    sampleStoryTitles: [
      'The Case of the Missing Cookie Jar',
      'Detective Sophie and the Lost Teddy Bear',
      'The Mystery of the Singing Garden'
    ]
  },
  {
    id: 'animal',
    name: 'Animal Adventures',
    description: 'Stories about amazing animals, pets, and wildlife adventures',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/animal.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/animal.jpg',
    characteristics: [
      'talking animals',
      'pet adventures',
      'wildlife exploration',
      'animal friendships',
      'nature conservation'
    ],
    colorScheme: '#E67E22',
    recommendedAgeMin: 3,
    recommendedAgeMax: 10,
    isActive: true,
    sortOrder: 6,
    aiPromptTemplate: {
      basePrompt: 'Create a story featuring animals as main characters with important life lessons',
      themes: ['nature', 'animal care', 'responsibility', 'habitat protection'],
      vocabulary: 'animal-related words and sounds',
      structure: 'animal character faces challenge, learns lesson, shares with others'
    },
    sampleStoryTitles: [
      'Rusty the Rescue Dog\'s Big Day',
      'The Elephant Who Forgot How to Trumpet',
      'Penguins on a Polar Adventure'
    ]
  },
  {
    id: 'superhero',
    name: 'Superhero',
    description: 'Kid-friendly superhero stories about using powers to help others',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/superhero.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/superhero.jpg',
    characteristics: [
      'special powers',
      'helping others',
      'saving the day',
      'teamwork',
      'being brave'
    ],
    colorScheme: '#E74C3C',
    recommendedAgeMin: 4,
    recommendedAgeMax: 10,
    isActive: true,
    sortOrder: 7,
    aiPromptTemplate: {
      basePrompt: 'Create a superhero story where the hero uses their powers to help others and make the world better',
      themes: ['helping others', 'responsibility', 'courage', 'doing the right thing'],
      vocabulary: 'action words and positive superhero terminology',
      structure: 'discover powers, learn responsibility, use powers to help, save the day'
    },
    sampleStoryTitles: [
      'Captain Kindness Saves the School',
      'The Little Hero Who Could Fly',
      'Super Sam and the Recycling Mission'
    ]
  },
  {
    id: 'family',
    name: 'Family & Home',
    description: 'Warm stories about family life, traditions, and growing up',
    iconUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/icons/family.svg',
    coverImageUrl: 'https://storage.googleapis.com/pictotale-backend.firebasestorage.app/pictotale-assets/covers/family.jpg',
    characteristics: [
      'family traditions',
      'growing up',
      'home life',
      'sibling relationships',
      'family love'
    ],
    colorScheme: '#F1948A',
    recommendedAgeMin: 3,
    recommendedAgeMax: 8,
    isActive: true,
    sortOrder: 8,
    aiPromptTemplate: {
      basePrompt: 'Create a heartwarming story about family life, traditions, or growing up',
      themes: ['family love', 'traditions', 'growing up', 'home'],
      vocabulary: 'family-related and emotional words',
      structure: 'family situation, challenge or celebration, love and support resolution'
    },
    sampleStoryTitles: [
      'Grandma\'s Recipe for Love',
      'The Day I Became a Big Sister',
      'Our Family\'s Special Tradition'
    ]
  }
];

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