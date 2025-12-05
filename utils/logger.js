/**
 * Logger utility that respects debug logging settings
 */

let debugEnabled = false;

/**
 * Initialize logger with config
 * @param {Object} config - Configuration object
 */
async function initLogger(config) {
  if (config && config.debugLogging !== undefined) {
    debugEnabled = config.debugLogging;
  } else {
    // If config is missing or debugLogging is undefined, default to false
    debugEnabled = false;
  }
}

/**
 * Update debug logging state
 * @param {boolean} enabled - Whether debug logging is enabled
 */
function setDebugLogging(enabled) {
  debugEnabled = enabled;
}

/**
 * Log message if debug logging is enabled
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
function log(message, ...args) {
  if (debugEnabled) {
    console.log(message, ...args);
  }
}

/**
 * Log warning if debug logging is enabled
 * @param {string} message - Warning message
 * @param {...any} args - Additional arguments
 */
function warn(message, ...args) {
  if (debugEnabled) {
    console.warn(message, ...args);
  }
}

/**
 * Log error (always logged regardless of debug setting)
 * @param {string} message - Error message
 * @param {...any} args - Additional arguments
 */
function error(message, ...args) {
  console.error(message, ...args);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initLogger,
    setDebugLogging,
    log,
    warn,
    error
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.Logger = {
    initLogger,
    setDebugLogging,
    log,
    warn,
    error
  };
}
