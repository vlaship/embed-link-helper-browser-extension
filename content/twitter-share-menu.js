/**
 * Twitter/X Share Menu Integration
 * Injects "Copy embed link" into native share menus
 */

// Import utilities (these are loaded via manifest)
// ShareMenuDetector, ShareMenuInjector, FeedbackManager, PostUrlExtractor, UrlTransformer

let observer = null;
let currentConfig = null;
const processedMenus = new WeakSet();

/**
 * Get a unique identifier for a menu element (for logging and tracking)
 * @param {HTMLElement} menuElement - The menu element
 * @returns {string} A unique identifier
 */
function getMenuIdentifier(menuElement) {
  // Use existing data attribute if available
  if (menuElement.hasAttribute('data-menu-id')) {
    return menuElement.getAttribute('data-menu-id');
  }
  
  // Generate and store a unique ID
  const menuId = `menu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  menuElement.setAttribute('data-menu-id', menuId);
  return menuId;
}

/**
 * Initialize share menu observer
 */
async function init() {
  try {
    // Load configuration
    currentConfig = await getConfig();
    
    // Initialize logger with config
    if (window.Logger) {
      await window.Logger.initLogger(currentConfig);
    }
    
    window.Logger.log('[twitter-share-menu] Initializing Twitter share menu integration');
    
    // Verify utilities are loaded
    if (!window.UrlTransformer) {
      window.Logger.error('[twitter-share-menu] UrlTransformer not loaded!');
    }
    if (!window.FeedbackManager) {
      window.Logger.error('[twitter-share-menu] FeedbackManager not loaded!');
    }
    if (!window.PostUrlExtractor) {
      window.Logger.error('[twitter-share-menu] PostUrlExtractor not loaded!');
    }
    if (!window.ShareMenuDetector) {
      window.Logger.error('[twitter-share-menu] ShareMenuDetector not loaded!');
    }
    if (!window.ShareMenuInjector) {
      window.Logger.error('[twitter-share-menu] ShareMenuInjector not loaded!');
    }
    
    // Check if Twitter redirect is enabled
    if (!currentConfig.twitter.enabled) {
      window.Logger.log('[twitter-share-menu] Twitter redirect is disabled, not initializing');
      return;
    }
    
    // Start observing share menus
    observer = window.ShareMenuDetector.observeShareMenus('twitter', handleShareMenuDetected);
    
    // Listen for configuration updates
    browser.storage.onChanged.addListener(handleConfigUpdate);
    
    window.Logger.log('[twitter-share-menu] Initialization complete');
  } catch (error) {
    window.Logger.error('[twitter-share-menu] Initialization error:', error);
  }
}

/**
 * Handle share menu detection
 * @param {HTMLElement} menuElement - The detected share menu element
 */
function handleShareMenuDetected(menuElement) {
  const menuId = getMenuIdentifier(menuElement);
  window.Logger.log('[twitter-share-menu] Share menu detected', { menuId });
  
  // Layer 1: WeakSet check
  if (processedMenus.has(menuElement)) {
    window.Logger.log('[twitter-share-menu] Menu already in WeakSet, skipping', { menuId });
    return;
  }
  
  // Layer 2: DOM check for existing menu item in this menu
  const existingItem = menuElement.querySelector('.embed-link-menu-item');
  if (existingItem) {
    window.Logger.log('[twitter-share-menu] Menu item already exists in DOM, skipping', {
      menuId,
      existingItemId: existingItem.getAttribute('data-item-id')
    });
    // Add to WeakSet even though we're skipping, to prevent future checks
    processedMenus.add(menuElement);
    return;
  }
  
  // Layer 3: Check if this menu is inside a parent element that already has our menu item
  // This handles nested menu structures where parent and child are detected separately
  let currentParent = menuElement.parentElement;
  while (currentParent && currentParent !== document.body) {
    const parentMenuItem = currentParent.querySelector('.embed-link-menu-item');
    if (parentMenuItem) {
      window.Logger.log('[twitter-share-menu] Parent element already has menu item, skipping nested menu', { menuId });
      processedMenus.add(menuElement);
      return;
    }
    currentParent = currentParent.parentElement;
  }
  
  // Mark as processed BEFORE injection to prevent race conditions
  processedMenus.add(menuElement);
  
  try {
    // Check if Twitter redirect is enabled
    if (!currentConfig || !currentConfig.twitter.enabled) {
      window.Logger.log('[twitter-share-menu] Twitter redirect is disabled, skipping injection');
      return;
    }
    
    // Find the associated post
    const postElement = window.ShareMenuDetector.findAssociatedPost(menuElement, 'twitter');
    if (!postElement) {
      window.Logger.warn('[twitter-share-menu] Could not find associated post');
      return;
    }
    
    // Extract post URL
    const postUrl = window.PostUrlExtractor.extractPostUrl(postElement, 'twitter');
    if (!postUrl) {
      window.Logger.warn('[twitter-share-menu] Could not extract post URL');
      return;
    }
    
    window.Logger.log('[twitter-share-menu] Post URL extracted:', postUrl);
    
    // Get target hostname from config
    const targetHostname = currentConfig.twitter.targetHostname;
    
    // Create menu item
    const menuItem = window.ShareMenuInjector.createEmbedLinkMenuItem(
      postUrl,
      targetHostname,
      'twitter'
    );
    
    if (!menuItem) {
      console.error('[twitter-share-menu] Failed to create menu item');
      return;
    }
    
    // Add click handler
    menuItem.addEventListener('click', (event) => {
      handleMenuItemClick(event, postUrl, targetHostname);
    });
    
    // Add keyboard handler for accessibility
    menuItem.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleMenuItemClick(event, postUrl, targetHostname);
      }
    });
    
    // Inject menu item
    const injected = window.ShareMenuInjector.injectMenuItem(menuItem, menuElement, 'twitter');
    
    if (injected) {
      window.Logger.log('[twitter-share-menu] Menu item injected successfully', { menuId });
    } else {
      window.Logger.warn('[twitter-share-menu] Failed to inject menu item', { menuId });
    }
  } catch (error) {
    console.error('[twitter-share-menu] Error processing share menu:', error);
  }
}

/**
 * Handle menu item click
 * @param {Event} event - The click event
 * @param {string} postUrl - The original post URL
 * @param {string} targetHostname - The target hostname for transformation
 */
async function handleMenuItemClick(event, postUrl, targetHostname) {
  window.Logger.log('[twitter-share-menu] Menu item clicked');
  
  const menuItem = event.currentTarget;
  
  try {
    // Transform URL
    const transformedUrl = window.UrlTransformer.transformUrl(postUrl, targetHostname);
    
    if (!transformedUrl) {
      console.error('[twitter-share-menu] URL transformation failed');
      window.FeedbackManager.showErrorFeedback(menuItem, 'Failed to transform URL', 'twitter');
      window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
      return;
    }
    
    window.Logger.log('[twitter-share-menu] URL transformed:', transformedUrl);
    
    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(transformedUrl);
      window.Logger.log('[twitter-share-menu] URL copied to clipboard');
      
      // Show success feedback
      window.FeedbackManager.showSuccessFeedback(menuItem, 'twitter');
      window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
    } catch (clipboardError) {
      console.error('[twitter-share-menu] Clipboard write failed:', clipboardError);
      
      // Try fallback method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = transformedUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        window.Logger.log('[twitter-share-menu] URL copied using fallback method');
        window.FeedbackManager.showSuccessFeedback(menuItem, 'twitter');
        window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
      } catch (fallbackError) {
        console.error('[twitter-share-menu] Fallback copy failed:', fallbackError);
        window.FeedbackManager.showErrorFeedback(menuItem, 'Copy failed', 'twitter');
        window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
      }
    }
  } catch (error) {
    console.error('[twitter-share-menu] Error handling menu item click:', error);
    window.FeedbackManager.showErrorFeedback(menuItem, 'Error', 'twitter');
    window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
  }
}

/**
 * Handle configuration updates
 * @param {Object} changes - Storage changes object
 * @param {string} areaName - Storage area name
 */
function handleConfigUpdate(changes, areaName) {
  if (areaName !== 'sync' || !changes.config) {
    return;
  }
  
  window.Logger.log('[twitter-share-menu] Configuration updated');
  
  const newConfig = changes.config.newValue;
  
  if (!newConfig) {
    return;
  }
  
  // Update current config
  currentConfig = newConfig;
  
  // If Twitter redirect was disabled, stop observing
  if (!newConfig.twitter.enabled && observer) {
    window.Logger.log('[twitter-share-menu] Twitter redirect disabled, stopping observer');
    observer.disconnect();
    observer = null;
  }
  
  // If Twitter redirect was enabled, start observing
  if (newConfig.twitter.enabled && !observer) {
    window.Logger.log('[twitter-share-menu] Twitter redirect enabled, starting observer');
    observer = window.ShareMenuDetector.observeShareMenus('twitter', handleShareMenuDetected);
  }
}

/**
 * Get configuration from storage
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig() {
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
    console.error('[twitter-share-menu] Error loading config:', error);
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
    handleShareMenuDetected,
    handleMenuItemClick,
    handleConfigUpdate,
    getConfig,
    getMenuIdentifier
  };
}
