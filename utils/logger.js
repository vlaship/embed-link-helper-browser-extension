/**
 * Error logging utilities for Social Media Redirector
 * Provides consistent logging across the extension
 */

const LOG_PREFIX = '[Social Redirector]';

/**
 * Log levels
 */
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

/**
 * Log an error message
 * @param {string} context - The context where the error occurred
 * @param {string} message - The error message
 * @param {Error|any} error - Optional error object or additional data
 */
function logError(context, message, error) {
  const fullMessage = `${LOG_PREFIX} [${context}] ${message}`;
  if (error) {
    console.error(fullMessage, error);
  } else {
    console.error(fullMessage);
  }
}

/**
 * Log a warning message
 * @param {string} context - The context where the warning occurred
 * @param {string} message - The warning message
 * @param {any} data - Optional additional data
 */
function logWarn(context, message, data) {
  const fullMessage = `${LOG_PREFIX} [${context}] ${message}`;
  if (data) {
    console.warn(fullMessage, data);
  } else {
    console.warn(fullMessage);
  }
}

/**
 * Log an info message
 * @param {string} context - The context
 * @param {string} message - The info message
 * @param {any} data - Optional additional data
 */
function logInfo(context, message, data) {
  const fullMessage = `${LOG_PREFIX} [${context}] ${message}`;
  if (data) {
    console.info(fullMessage, data);
  } else {
    console.info(fullMessage);
  }
}

/**
 * Log a debug message
 * @param {string} context - The context
 * @param {string} message - The debug message
 * @param {any} data - Optional additional data
 */
function logDebug(context, message, data) {
  const fullMessage = `${LOG_PREFIX} [${context}] ${message}`;
  if (data) {
    console.debug(fullMessage, data);
  } else {
    console.debug(fullMessage);
  }
}

/**
 * Log a storage error with specific handling
 * Requirement: 6.3
 * @param {string} operation - The storage operation that failed
 * @param {Error} error - The error object
 */
function logStorageError(operation, error) {
  logError('Storage', `Failed to ${operation}`, error);
}

/**
 * Log a URL transformation error
 * Requirement: 7.1, 7.2
 * @param {string} url - The URL that failed to transform
 * @param {Error} error - The error object
 */
function logUrlTransformError(url, error) {
  logError('URL Transform', `Failed to transform URL: ${url}`, error);
}

/**
 * Log a configuration error
 * Requirement: 6.3, 6.5
 * @param {string} message - The error message
 * @param {any} data - Optional additional data
 */
function logConfigError(message, data) {
  logError('Config', message, data);
}

/**
 * Log a DOM manipulation error
 * Requirement: 5.1, 5.3
 * @param {string} operation - The DOM operation that failed
 * @param {Error} error - The error object
 */
function logDomError(operation, error) {
  logError('DOM', `Failed to ${operation}`, error);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LogLevel,
    logError,
    logWarn,
    logInfo,
    logDebug,
    logStorageError,
    logUrlTransformError,
    logConfigError,
    logDomError
  };
}
