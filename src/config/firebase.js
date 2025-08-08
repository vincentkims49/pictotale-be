const admin = require('firebase-admin');
const logger = require('../utils/logger');
const path = require('path');

let firebaseAdmin;

const initializeFirebase = () => {
  try {
    let credential;

    // Try to use environment variables first
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      logger.info('Using Firebase credentials from environment variables');
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      });
    }
    // Fallback to service account file
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

      // If the path starts with './', make it relative to project root, not this file
      if (serviceAccountPath.startsWith('./')) {
        serviceAccountPath = path.join(process.cwd(), serviceAccountPath.substring(2));
      }

      logger.info(`Loading Firebase service account from: ${serviceAccountPath}`);
      const serviceAccount = require(serviceAccountPath);
      credential = admin.credential.cert(serviceAccount);
    }
    // Development mode - use mock credentials for testing
    else if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn('⚠️  No Firebase credentials found. Using mock credentials for development/testing.');
      logger.warn('⚠️  Authentication will be simulated. Set proper Firebase credentials for production.');

      // Use mock credentials for development
      credential = admin.credential.cert({
        projectId: 'mock-project-id',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY\n-----END PRIVATE KEY-----\n',
        clientEmail: 'mock@mock-project.iam.gserviceaccount.com'
      });
    } else {
      throw new Error('No Firebase credentials found. Please set either FIREBASE_SERVICE_ACCOUNT_PATH or Firebase environment variables.');
    }

    firebaseAdmin = admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'mock-project-id',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    logger.info('🔥 Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error);

    // In development, continue without Firebase for JWT testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      logger.warn('⚠️  Continuing without Firebase for development testing...');
      return;
    }

    throw error;
  }
};

const getAuth = () => {
  if (!firebaseAdmin && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
    // Mock auth for development
    return {
      getUser: async (uid) => ({
        uid,
        email: `mock-${uid}@example.com`,
        emailVerified: true,
        disabled: false
      }),
      verifyIdToken: async (token) => ({
        uid: 'mock-uid',
        email: 'mock@example.com'
      }),
      revokeRefreshTokens: async (uid) => true
    };
  }
  return admin.auth();
};

const getFirestore = () => {
  if (!firebaseAdmin && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
    // Mock Firestore for development
    return {
      collection: () => ({
        doc: () => ({
          get: async () => ({ exists: false }),
          set: async () => true,
          update: async () => true,
          delete: async () => true
        })
      })
    };
  }
  return admin.firestore();
};

module.exports = {
  initializeFirebase,
  getAuth,
  getFirestore,
  admin
};