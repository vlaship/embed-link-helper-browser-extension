/**
 * Instagram Share Menu Integration
 * Thin wrapper that configures the share menu integration module for Instagram
 */

// Import utilities (these are loaded via manifest)
// ShareMenuIntegration, Config

let integration = null;

/**
 * Initialize Instagram share menu integration
 */
async function init() {
  try {
    // Initialize using the share menu integration module
    integration = await window.ShareMenuIntegration.initializeShareMenuIntegration({
      platform: 'instagram',
      platformKey: 'instagram',
      getConfig: getConfig
    });
    
    // Store integration for cleanup if needed
    window.instagramIntegration = integration;
  } catch (error) {
    console.error('[instagram-share-menu] Initialization error:', error);
  }
}

/**
 * Get configuration from storage
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
  // Delegate to Config module if available
  if (window.Config && window.Config.getConfig) {
    return await window.Config.getConfig();
  }
  
  // Fallback to direct storage access
  try {
    const result = await browser.storage.sync.get('config');
    
    if (!result.config) {
      // Return default config
      return {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      };
    }
    
    return result.config;
  } catch (error) {
    console.error('[instagram-share-menu] Error loading config:', error);
    // Return default config on error
    return {
      twitter: {
        enabled: true,
        targetHostname: 'fixvx.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'kkinstagram.com'
      }
    };
  }
}

// Initialize when DOM is ready (skip in test environment)
if (typeof process === 'undefined' || process.env.NODE_ENV !== 'test') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    init,
    getConfig
  };
}
