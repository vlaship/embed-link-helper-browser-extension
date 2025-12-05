/**
 * Share Menu Integration Module
 * Unified share menu logic for Twitter and Instagram
 */

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
  const menuId = `menu-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  menuElement.setAttribute('data-menu-id', menuId);
  return menuId;
}

/**
 * Initialize share menu integration for a platform
 * @param {Object} config - Platform configuration
 * @param {string} config.platform - Platform name ('twitter' or 'instagram')
 * @param {string} config.platformKey - Config key for the platform
 * @param {Function} config.getConfig - Function to get current configuration
 * @returns {Promise<Object>} Integration controller with cleanup methods
 */
async function initializeShareMenuIntegration(config) {
  const { platform, platformKey, getConfig } = config;
  
  let observer = null;
  let currentConfig = null;
  const processedMenus = new WeakSet();
  
  /**
   * Handle share menu detection
   * @param {HTMLElement} menuElement - The detected share menu element
   */
  function handleShareMenuDetected(menuElement) {
    const menuId = getMenuIdentifier(menuElement);
    window.Logger.log(`[${platform}-share-menu] Share menu detected`, { menuId });
    
    // Layer 1: WeakSet check
    if (processedMenus.has(menuElement)) {
      window.Logger.log(`[${platform}-share-menu] Menu already in WeakSet, skipping`, { menuId });
      return;
    }
    
    // Layer 2: DOM check for existing menu item in this menu
    const existingItem = menuElement.querySelector('.embed-link-menu-item');
    if (existingItem) {
      window.Logger.log(`[${platform}-share-menu] Menu item already exists in DOM, skipping`, {
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
        window.Logger.log(`[${platform}-share-menu] Parent element already has menu item, skipping nested menu`, { menuId });
        processedMenus.add(menuElement);
        return;
      }
      currentParent = currentParent.parentElement;
    }
    
    // Mark as processed BEFORE injection to prevent race conditions
    processedMenus.add(menuElement);
    
    try {
      // Check if platform redirect is enabled
      if (!currentConfig || !currentConfig[platformKey].enabled) {
        window.Logger.log(`[${platform}-share-menu] ${platform} redirect is disabled, skipping injection`);
        return;
      }
      
      // Find the associated post
      const postElement = window.ShareMenuDetector.findAssociatedPost(menuElement, platform);
      if (!postElement) {
        window.Logger.warn(`[${platform}-share-menu] Could not find associated post`);
        return;
      }
      
      // Extract post URL
      const postUrl = window.PostUrlExtractor.extractPostUrl(postElement, platform);
      if (!postUrl) {
        window.Logger.warn(`[${platform}-share-menu] Could not extract post URL`);
        return;
      }
      
      window.Logger.log(`[${platform}-share-menu] Post URL extracted:`, postUrl);
      
      // Get target hostname from config
      const targetHostname = currentConfig[platformKey].targetHostname;
      
      // Create menu item
      const menuItem = window.ShareMenuInjector.createEmbedLinkMenuItem(
        postUrl,
        targetHostname,
        platform
      );
      
      if (!menuItem) {
        console.error(`[${platform}-share-menu] Failed to create menu item`);
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
      const injected = window.ShareMenuInjector.injectMenuItem(menuItem, menuElement, platform);
      
      if (injected) {
        window.Logger.log(`[${platform}-share-menu] Menu item injected successfully`, { menuId });
      } else {
        window.Logger.warn(`[${platform}-share-menu] Failed to inject menu item`, { menuId });
      }
    } catch (error) {
      console.error(`[${platform}-share-menu] Error processing share menu:`, error);
    }
  }
  
  /**
   * Handle menu item click
   * @param {Event} event - The click event
   * @param {string} postUrl - The original post URL
   * @param {string} targetHostname - The target hostname for transformation
   */
  async function handleMenuItemClick(event, postUrl, targetHostname) {
    window.Logger.log(`[${platform}-share-menu] Menu item clicked`);
    
    const menuItem = event.currentTarget;
    
    try {
      // Transform URL
      const transformedUrl = window.UrlTransformer.transformUrl(postUrl, targetHostname);
      
      if (!transformedUrl) {
        console.error(`[${platform}-share-menu] URL transformation failed`);
        window.FeedbackManager.showErrorFeedback(menuItem, 'Failed to transform URL', platform);
        window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
        return;
      }
      
      window.Logger.log(`[${platform}-share-menu] URL transformed:`, transformedUrl);
      
      // Copy to clipboard using clipboard manager
      const success = await window.ClipboardManager.copyToClipboard(transformedUrl);
      
      if (success) {
        window.Logger.log(`[${platform}-share-menu] URL copied to clipboard`);
        window.FeedbackManager.showSuccessFeedback(menuItem, platform);
        window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
      } else {
        console.error(`[${platform}-share-menu] Clipboard copy failed`);
        window.FeedbackManager.showErrorFeedback(menuItem, 'Copy failed', platform);
        window.FeedbackManager.hideFeedbackAfterDelay(menuItem, 2000);
      }
    } catch (error) {
      console.error(`[${platform}-share-menu] Error handling menu item click:`, error);
      window.FeedbackManager.showErrorFeedback(menuItem, 'Error', platform);
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
    
    window.Logger.log(`[${platform}-share-menu] Configuration updated`);
    
    const newConfig = changes.config.newValue;
    
    if (!newConfig) {
      return;
    }
    
    // Update current config
    currentConfig = newConfig;
    
    // If platform redirect was disabled, stop observing
    if (!newConfig[platformKey].enabled && observer) {
      window.Logger.log(`[${platform}-share-menu] ${platform} redirect disabled, stopping observer`);
      observer.disconnect();
      observer = null;
    }
    
    // If platform redirect was enabled, start observing
    if (newConfig[platformKey].enabled && !observer) {
      window.Logger.log(`[${platform}-share-menu] ${platform} redirect enabled, starting observer`);
      observer = window.ShareMenuDetector.observeShareMenus(platform, handleShareMenuDetected);
    }
  }
  
  try {
    // Load configuration
    currentConfig = await getConfig();
    
    // Initialize logger with config
    if (window.Logger) {
      await window.Logger.initLogger(currentConfig);
    }
    
    window.Logger.log(`[${platform}-share-menu] Initializing ${platform} share menu integration`);
    
    // Verify utilities are loaded
    if (!window.UrlTransformer) {
      window.Logger.error(`[${platform}-share-menu] UrlTransformer not loaded!`);
    }
    if (!window.FeedbackManager) {
      window.Logger.error(`[${platform}-share-menu] FeedbackManager not loaded!`);
    }
    if (!window.PostUrlExtractor) {
      window.Logger.error(`[${platform}-share-menu] PostUrlExtractor not loaded!`);
    }
    if (!window.ShareMenuDetector) {
      window.Logger.error(`[${platform}-share-menu] ShareMenuDetector not loaded!`);
    }
    if (!window.ShareMenuInjector) {
      window.Logger.error(`[${platform}-share-menu] ShareMenuInjector not loaded!`);
    }
    if (!window.ClipboardManager) {
      window.Logger.error(`[${platform}-share-menu] ClipboardManager not loaded!`);
    }
    
    // Check if platform redirect is enabled
    if (!currentConfig[platformKey].enabled) {
      window.Logger.log(`[${platform}-share-menu] ${platform} redirect is disabled, not initializing`);
      return {
        cleanup: () => {},
        isActive: () => false
      };
    }
    
    // Start observing share menus
    observer = window.ShareMenuDetector.observeShareMenus(platform, handleShareMenuDetected);
    
    // Listen for configuration updates
    browser.storage.onChanged.addListener(handleConfigUpdate);
    
    window.Logger.log(`[${platform}-share-menu] Initialization complete`);
    
    // Return integration controller
    return {
      cleanup: () => {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
        browser.storage.onChanged.removeListener(handleConfigUpdate);
      },
      isActive: () => observer !== null
    };
  } catch (error) {
    window.Logger.error(`[${platform}-share-menu] Initialization error:`, error);
    return {
      cleanup: () => {},
      isActive: () => false
    };
  }
}

// Export for CommonJS (Node.js/testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeShareMenuIntegration,
    getMenuIdentifier
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.ShareMenuIntegration = {
    initializeShareMenuIntegration,
    getMenuIdentifier
  };
}
