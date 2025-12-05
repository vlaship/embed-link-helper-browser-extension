/**
 * Configuration Management Module
 * Handles default configuration, storage operations, and validation
 */

// Default configuration values
const DEFAULT_CONFIG = {
  twitter: {
    enabled: true,
    targetHostname: "fixvx.com"
  },
  instagram: {
    enabled: true,
    targetHostname: "kkinstagram.com"
  },
  debugLogging: false
};

/**
 * Get the default configuration
 * @returns {Object} Default configuration object
 */
function getDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)); // Deep clone
}

/**
 * Validate a hostname string
 * Ensures hostname doesn't contain protocol, paths, or invalid characters
 * @param {string} hostname - The hostname to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }

  // Trim whitespace
  hostname = hostname.trim();

  // Check if empty after trimming
  if (hostname.length === 0) {
    return false;
  }

  // Check for protocol (http://, https://, etc.)
  if (hostname.includes('://')) {
    return false;
  }

  // Check for path separators
  if (hostname.includes('/')) {
    return false;
  }

  // Check for invalid characters (spaces, special chars except dots and hyphens)
  const validHostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (!validHostnameRegex.test(hostname)) {
    return false;
  }

  // Check for consecutive dots
  if (hostname.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Validate a complete configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Validate twitter configuration
  if (config.twitter) {
    if (typeof config.twitter.enabled !== 'boolean') {
      return false;
    }
    // If targetHostname is present (even if empty), validate it
    if (config.twitter.targetHostname !== undefined && !validateHostname(config.twitter.targetHostname)) {
      return false;
    }
  }

  // Validate instagram configuration
  if (config.instagram) {
    if (typeof config.instagram.enabled !== 'boolean') {
      return false;
    }
    // If targetHostname is present (even if empty), validate it
    if (config.instagram.targetHostname !== undefined && !validateHostname(config.instagram.targetHostname)) {
      return false;
    }
  }

  return true;
}

/**
 * Get configuration from browser storage
 * Falls back to default configuration if storage is empty or fails
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
  try {
    // Use browser namespace (provided by polyfill in Chrome, native in Firefox)
    const result = await browser.storage.sync.get('config');
    
    // If no config in storage, return default
    if (!result.config) {
      return getDefaultConfig();
    }

    // Validate retrieved config
    if (!validateConfig(result.config)) {
      console.warn('Invalid config in storage, using defaults');
      return getDefaultConfig();
    }

    // Merge with defaults to ensure all fields exist
    const defaultConfig = getDefaultConfig();
    const mergedConfig = {
      twitter: {
        ...defaultConfig.twitter,
        ...result.config.twitter
      },
      instagram: {
        ...defaultConfig.instagram,
        ...result.config.instagram
      },
      debugLogging: result.config.debugLogging !== undefined ? result.config.debugLogging : defaultConfig.debugLogging
    };
    
    // Validate merged config (in case partial config has invalid values)
    if (!validateConfig(mergedConfig)) {
      console.warn('Merged config is invalid, using defaults');
      return getDefaultConfig();
    }
    
    return mergedConfig;
  } catch (error) {
    console.error('Error retrieving config from storage:', error);
    return getDefaultConfig();
  }
}

/**
 * Save configuration to browser storage
 * @param {Object} config - Configuration object to save
 * @returns {Promise<void>}
 * @throws {Error} If config is invalid or storage operation fails
 */
async function saveConfig(config) {
  // Validate config before saving
  if (!validateConfig(config)) {
    throw new Error('Invalid configuration: validation failed');
  }

  try {
    // Use browser namespace (provided by polyfill in Chrome, native in Firefox)
    await browser.storage.sync.set({ config });
  } catch (error) {
    console.error('Error saving config to storage:', error);
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
}

/**
 * Clear configuration from storage (resets to defaults)
 * @returns {Promise<void>}
 */
async function clearConfig() {
  try {
    await browser.storage.sync.remove('config');
  } catch (error) {
    console.error('Error clearing config from storage:', error);
    throw new Error(`Failed to clear configuration: ${error.message}`);
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS environment (for testing)
  module.exports = {
    DEFAULT_CONFIG,
    getDefaultConfig,
    validateHostname,
    validateConfig,
    getConfig,
    saveConfig,
    clearConfig
  };
} else if (typeof window !== 'undefined') {
  // Browser environment - expose to window object
  window.Config = {
    DEFAULT_CONFIG,
    getDefaultConfig,
    validateHostname,
    validateConfig,
    getConfig,
    saveConfig,
    clearConfig
  };
}

