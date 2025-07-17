const nodemailer = require('nodemailer');
const logger = require('./logger');
const redisClient = require('./redisClient'); // Assuming you have a Redis client module.

const sendEmail = async (options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent: ${info.messageId}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw new Error('Email could not be sent');
  }
};

// Function to create session
const createSession = async (sessionData, req) => {
  try {
    // Log session creation
    logger.info(`Creating session for user: ${sessionData.uid}`);

    // Store the session data in Redis or in-memory session store
    req.session.user = sessionData;
    
    // Log session stored in Redis
    await redisClient.set(`session:${req.sessionID}`, JSON.stringify(sessionData)); // Assuming `redisClient.set` is your session storage method
    logger.info(`Session stored in Redis for session ID: ${req.sessionID}`);
  } catch (error) {
    logger.error(`Error storing session for user: ${sessionData.uid}`, error);
    throw new Error('Session could not be created');
  }
};

// Function to retrieve session
const retrieveSession = async (sessionId) => {
  try {
    // Log session retrieval
    logger.info(`Retrieving session for session ID: ${sessionId}`);

    const sessionData = await redisClient.get(`session:${sessionId}`); // Assuming `redisClient.get` is your session retrieval method
    if (!sessionData) {
      logger.warn(`No session found for session ID: ${sessionId}`);
      return null;
    }

    logger.info(`Session retrieved for session ID: ${sessionId}`);
    return JSON.parse(sessionData);
  } catch (error) {
    logger.error(`Error retrieving session for session ID: ${sessionId}`, error);
    throw new Error('Session retrieval failed');
  }
};

// Example of session check middleware
const checkAuth = async (req, res, next) => {
  try {
    // Log session check
    logger.info('Checking session authentication...');
    
    const session = await retrieveSession(req.sessionID);
    if (!session || !session.user) {
      logger.warn('No valid session found, authentication failed.');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Log successful authentication
    logger.info(`Authenticated user: ${session.user.email}`);
    next(); // Proceed with the request if authenticated
  } catch (error) {
    logger.error('Authentication middleware failed', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

module.exports = {
  sendEmail,
  createSession,
  retrieveSession,
  checkAuth
};
