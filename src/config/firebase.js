const admin = require('firebase-admin');
const logger = require('../utils/logger');
const path = require('path');

let firebaseAdmin;

const initializeFirebase = () => {
  try {
    let serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    // If the path starts with './', make it relative to project root, not this file
    if (serviceAccountPath && serviceAccountPath.startsWith('./')) {
      serviceAccountPath = path.join(process.cwd(), serviceAccountPath.substring(2));
    }
    
    logger.info(`Loading Firebase service account from: ${serviceAccountPath}`);
    
    const serviceAccount = require(serviceAccountPath);
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
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