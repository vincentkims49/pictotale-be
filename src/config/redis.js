const redis = require('redis');
const logger = require('../utils/logger');

let client = null;
let isConnected = false;

const connectRedis = async () => {
  try {
    client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis connection attempts exhausted');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
      isConnected = true;
    });

    client.on('end', () => {
      logger.info('Redis client disconnected');
      isConnected = false;
    });

    await client.connect();
    
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    isConnected = false;
    return null;
  }
};

// Initialize Redis connection with graceful failure
const initializeRedis = async () => {
  try {
    await connectRedis();
  } catch (error) {
    logger.warn('Redis initialization failed - continuing without Redis:', error.message);
    client = null;
    isConnected = false;
  }
};

// Initialize immediately
initializeRedis();

// Create Redis wrapper with the methods your auth controller expects
const redisWrapper = {
  // Method your auth controller calls
  setex: async (key, ttl, value) => {
    if (client && isConnected) {
      try {
        // Note: Redis v4+ uses setEx instead of setex
        return await client.setEx(key, ttl, value);
      } catch (error) {
        logger.error('Redis setex error:', error);
        return null;
      }
    }
    logger.warn('Redis not available, skipping setex operation');
    return null;
  },
  
  get: async (key) => {
    if (client && isConnected) {
      try {
        return await client.get(key);
      } catch (error) {
        logger.error('Redis get error:', error);
        return null;
      }
    }
    logger.warn('Redis not available, skipping get operation');
    return null;
  },
  
  del: async (key) => {
    if (client && isConnected) {
      try {
        return await client.del(key);
      } catch (error) {
        logger.error('Redis del error:', error);
        return null;
      }
    }
    logger.warn('Redis not available, skipping del operation');
    return null;
  },
  
  exists: async (key) => {
    if (client && isConnected) {
      try {
        return await client.exists(key);
      } catch (error) {
        logger.error('Redis exists error:', error);
        return false;
      }
    }
    return false;
  },
  
  // Utility methods
  getClient: () => client,
  isConnected: () => isConnected
};

module.exports = redisWrapper;