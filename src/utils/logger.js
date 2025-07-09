const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const levels = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

const colors = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[32m',  // Green
  DEBUG: '\x1b[36m', // Cyan
  RESET: '\x1b[0m'   // Reset
};

const currentLogLevel = process.env.NODE_ENV === 'production' ? levels.WARN : levels.DEBUG;

const formatMessage = (level, message) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level}]: ${message}`;
};

const log = (level, message, error = null) => {
  if (levels[level] > currentLogLevel) return;
  
  const formattedMessage = formatMessage(level, message);
  const coloredMessage = `${colors[level]}${formattedMessage}${colors.RESET}`;
  
  // Console output
  console.log(coloredMessage);
  
  // File output
  const logFile = level === 'ERROR' ? 'error.log' : 'all.log';
  const logPath = path.join(logsDir, logFile);
  
  const fileMessage = error ? 
    `${formattedMessage}\n${error.stack || error}\n` : 
    `${formattedMessage}\n`;
  
  fs.appendFileSync(logPath, fileMessage);
};

const logger = {
  error: (message, error) => log('ERROR', message, error),
  warn: (message) => log('WARN', message),
  info: (message) => log('INFO', message),
  debug: (message) => log('DEBUG', message),
  http: (message) => log('INFO', message) // Alias for http logs
};

module.exports = logger;