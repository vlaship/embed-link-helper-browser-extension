// Background script for Embed Link Helper extension
// Manages extension lifecycle, storage operations, and message passing

// For Chrome MV3 service workers, we need to import the polyfill
// Firefox MV2 loads it via manifest background.scripts
if (typeof importScripts === 'function') {
  try {
    importScripts('../lib/browser-polyfill.js');
  } catch (e) {
    console.log('Polyfill already loaded or not needed');
  }
}

console.log('Embed Link Helper background script loaded');

// Default configuration values
const DEFAULT_CONFIG = {
  twitter: {
    enabled: true,
    targetHostname: "fixvx.com"
  },
  instagram: {
    enabled: true,
    targetHostname: "kkinstagram.com"
  }
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
 * @param {string} hostname - The hostname to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }

  hostname = hostname.trim();

  if (hostname.length === 0) {
    return false;
  }

  if (hostname.includes('://')) {
    return false;
  }

  if (hostname.includes('/')) {
    return false;
  }

  const validHostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (!validHostnameRegex.test(hostname)) {
    return false;
  }

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

  if (config.twitter) {
    if (typeof config.twitter.enabled !== 'boolean') {
      return false;
    }
    if (config.twitter.targetHostname && !validateHostname(config.twitter.targetHostname)) {
      return false;
    }
  }

  if (config.instagram) {
    if (typeof config.instagram.enabled !== 'boolean') {
      return false;
    }
    if (config.instagram.targetHostname && !validateHostname(config.instagram.targetHostname)) {
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
async function getStoredConfig() {
  try {
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
    return {
      twitter: {
        ...defaultConfig.twitter,
        ...result.config.twitter
      },
      instagram: {
        ...defaultConfig.instagram,
        ...result.config.instagram
      }
    };
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
async function saveStoredConfig(config) {
  // Validate config before saving
  if (!validateConfig(config)) {
    throw new Error('Invalid configuration: validation failed');
  }

  try {
    await browser.storage.sync.set({ config });
  } catch (error) {
    console.error('Error saving config to storage:', error);
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
}

/**
 * Initialize extension with default configuration on install
 */
browser.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details.reason);
  
  try {
    // Check if config already exists
    const result = await browser.storage.sync.get('config');
    
    // Only set default config if none exists
    if (!result.config) {
      console.log('Initializing default configuration');
      await saveStoredConfig(getDefaultConfig());
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    // Even if initialization fails, extension will use defaults at runtime
  }
});

/**
 * Message handler for communication with popup and content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);

  // Handle getConfig action
  if (message.action === 'getConfig') {
    getStoredConfig()
      .then(config => {
        sendResponse({ success: true, config });
      })
      .catch(error => {
        console.error('Error handling getConfig:', error);
        sendResponse({ 
          success: false, 
          error: error.message,
          config: getDefaultConfig() // Fallback to defaults
        });
      });
    
    // Return true to indicate async response
    return true;
  }

  // Handle saveConfig action
  if (message.action === 'saveConfig') {
    if (!message.data) {
      sendResponse({ 
        success: false, 
        error: 'No configuration data provided' 
      });
      return false;
    }

    saveStoredConfig(message.data)
      .then(async () => {
        // Broadcast config update to all tabs (Requirements 6.1, 6.2, 6.3)
        try {
          const tabs = await browser.tabs.query({});
          for (const tab of tabs) {
            // Only send to tabs with content scripts (Twitter/X and Instagram)
            if (tab.url && (tab.url.includes('x.com') || tab.url.includes('instagram.com'))) {
              try {
                await browser.tabs.sendMessage(tab.id, {
                  action: 'configUpdated',
                  config: message.data
                });
              } catch (error) {
                // Tab might not have content script loaded yet, ignore
                console.log(`Could not send config update to tab ${tab.id}:`, error.message);
              }
            }
          }
        } catch (error) {
          console.error('Error broadcasting config update:', error);
          // Don't fail the save operation if broadcast fails
        }
        
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error handling saveConfig:', error);
        sendResponse({ 
          success: false, 
          error: error.message 
        });
      });
    
    // Return true to indicate async response
    return true;
  }

  // Unknown action
  console.warn('Unknown message action:', message.action);
  sendResponse({ 
    success: false, 
    error: 'Unknown action' 
  });
  return false;
});
