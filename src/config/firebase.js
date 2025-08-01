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
    } else {
      throw new Error('No Firebase credentials found. Please set either FIREBASE_SERVICE_ACCOUNT_PATH or Firebase environment variables.');
    }

    firebaseAdmin = admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    logger.info('Firebase Admin initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
};

const getAuth = () => admin.auth();
const getFirestore = () => admin.firestore();

module.exports = {
  initializeFirebase,
  getAuth,
  getFirestore,
  admin
};