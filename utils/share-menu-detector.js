/**
 * Share Menu Detector Module
 * Detects share menu appearance and identifies associated posts
 * Requirements: 1.1, 2.1, 3.2, 6.1, 6.2
 */

/**
 * Platform-specific selectors for share menus
 */
const SHARE_MENU_SELECTORS = {
  twitter: {
    // Share menu container
    menu: [
      'div[data-testid="Dropdown"]',
      'div[role="menu"]',
      'div[data-testid="sheetDialog"]'
    ],
    // Share button that triggers the menu
    trigger: [
      'button[data-testid="share"]',
      'div[data-testid="share"]'
    ],
    // Menu items within the share menu
    menuItems: [
      'div[role="menuitem"]',
      'a[role="menuitem"]'
    ],
    // Post container selectors (from post-detector)
    postContainer: [
      'article[data-testid="tweet"]',
      'div[data-testid="cellInnerDiv"] article',
      'article[role="article"]'
    ]
  },
  instagram: {
    // Share menu container
    menu: [
      'div[role="dialog"]',
      'div[class*="Sheet"]'
    ],
    // Share button that triggers the menu
    trigger: [
      'svg[aria-label*="Share"]',
      'button[aria-label*="Share"]',
      'svg[aria-label*="share"]',
      'button[aria-label*="share"]'
    ],
    // Menu items within the share menu
    menuItems: [
      'button',
      'a'
    ],
    // Post container selectors (from post-detector)
    postContainer: [
      'article[role="presentation"]',
      'div[class*="x1iyjqo2"] article',
      'article'
    ]
  }
};

// Track the last clicked share button globally
let lastClickedShareButton = null;
let lastClickTime = 0;

/**
 * Detect share menu appearance using MutationObserver
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {Function} callback - Called when share menu is detected with (menuElement)
 * @returns {MutationObserver} The observer instance
 */
function observeShareMenus(platform, callback) {
  if (!platform || !SHARE_MENU_SELECTORS[platform]) {
    console.error(`[share-menu-detector] Invalid platform: ${platform}`);
    return null;
  }

  if (typeof callback !== 'function') {
    console.error('[share-menu-detector] Callback must be a function');
    return null;
  }

  const config = SHARE_MENU_SELECTORS[platform];
  const processedMenus = new WeakSet();
  
  // Set up click tracking for share buttons
  document.addEventListener('click', (event) => {
    const target = event.target;
    // Check if clicked element or its parents (up to 10 levels) is a share button
    let element = target;
    let depth = 0;
    while (element && depth < 10) {
      for (const selector of config.trigger) {
        try {
          if (element.matches && element.matches(selector)) {
            lastClickedShareButton = element;
            lastClickTime = Date.now();
            window.Logger.log('[share-menu-detector] Share button clicked', { 
              selector,
              element: element.outerHTML ? element.outerHTML.substring(0, 100) : 'unknown'
            });
            return;
          }
        } catch (e) {
          // Invalid selector
        }
      }
      
      // Also check if this element contains the share button selector text
      // This helps with Twitter's structure where the button might be deeply nested
      if (element.getAttribute) {
        const testId = element.getAttribute('data-testid');
        const ariaLabel = element.getAttribute('aria-label');
        
        if (testId === 'share' || (ariaLabel && ariaLabel.toLowerCase().includes('share'))) {
          lastClickedShareButton = element;
          lastClickTime = Date.now();
          window.Logger.log('[share-menu-detector] Share button clicked via attribute', { 
            testId,
            ariaLabel
          });
          return;
        }
      }
      
      element = element.parentElement;
      depth++;
    }
  }, true); // Use capture phase to catch it early

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check added nodes for share menus
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node;

          // Collect all potential menus (both the element itself and descendants)
          const potentialMenus = [];

          // Check if the added node itself is a share menu
          if (isShareMenu(element, platform)) {
            potentialMenus.push(element);
          }

          // Check if any descendants are share menus
          for (const selector of config.menu) {
            try {
              const menus = element.querySelectorAll(selector);
              menus.forEach(menu => {
                if (isShareMenu(menu, platform)) {
                  potentialMenus.push(menu);
                }
              });
            } catch (error) {
              window.Logger.warn(`[share-menu-detector] Selector failed: ${selector}`, error);
            }
          }

          // Filter out parent menus - only keep menus that don't contain other menus
          const innermostMenus = potentialMenus.filter(menu => {
            // Check if this menu contains any other menu from our list
            return !potentialMenus.some(otherMenu => 
              otherMenu !== menu && menu.contains(otherMenu)
            );
          });

          // Process only the innermost menus
          innermostMenus.forEach(menu => {
            if (!processedMenus.has(menu)) {
              processedMenus.add(menu);
              callback(menu);
            }
          });
        }
      }
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.Logger.log(`[share-menu-detector] Started observing ${platform} share menus`);
  return observer;
}

/**
 * Find the post container associated with a share menu
 * @param {HTMLElement} menuElement - The share menu element
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The associated post container
 */
function findAssociatedPost(menuElement, platform) {
  if (!menuElement || !(menuElement instanceof HTMLElement)) {
    window.Logger.warn('[share-menu-detector] Invalid menu element provided');
    return null;
  }

  if (!platform || !SHARE_MENU_SELECTORS[platform]) {
    window.Logger.warn(`[share-menu-detector] Invalid platform: ${platform}`);
    return null;
  }

  const config = SHARE_MENU_SELECTORS[platform];

  try {
    // Strategy 0: Use the last clicked share button if it was clicked recently (within 2 seconds)
    const timeSinceClick = Date.now() - lastClickTime;
    if (lastClickedShareButton && timeSinceClick < 2000) {
      window.Logger.log('[share-menu-detector] Using tracked share button', { timeSinceClick });
      let current = lastClickedShareButton;
      while (current && current !== document.body) {
        for (const selector of config.postContainer) {
          if (current.matches && current.matches(selector)) {
            window.Logger.log('[share-menu-detector] Found post via tracked share button');
            return current;
          }
        }
        current = current.parentElement;
      }
    }
    
    // Strategy 1: Look for the share button that triggered this menu
    // The share button is typically within the post container
    const shareButtons = document.querySelectorAll(config.trigger.join(', '));
    
    let closestButton = null;
    let closestDistance = Infinity;
    
    for (const button of shareButtons) {
      // Check if this button is likely the one that opened the menu
      // by checking proximity to the menu
      const buttonRect = button.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      
      // Calculate distance between button and menu
      const distance = Math.sqrt(
        Math.pow(buttonRect.left - menuRect.left, 2) + 
        Math.pow(buttonRect.top - menuRect.top, 2)
      );
      
      // Track the closest button
      if (distance < closestDistance) {
        closestDistance = distance;
        closestButton = button;
      }
    }
    
    // If we found a close button (within 500px), find its post container
    if (closestButton && closestDistance < 500) {
      let current = closestButton;
      while (current && current !== document.body) {
        for (const selector of config.postContainer) {
          if (current.matches && current.matches(selector)) {
            window.Logger.log('[share-menu-detector] Found post via closest share button', { distance: closestDistance });
            return current;
          }
        }
        current = current.parentElement;
      }
    }

    // Strategy 2: Look for the closest post container in the DOM
    // This is a fallback when we can't find the share button
    const allPosts = document.querySelectorAll(config.postContainer.join(', '));
    
    if (allPosts.length === 1) {
      // If there's only one post visible, it's likely the associated one
      window.Logger.log('[share-menu-detector] Found single post in DOM');
      return allPosts[0];
    }

    // Strategy 3: Find the post that is closest to the menu and in viewport
    // Prioritize posts that are actually visible
    let closestPost = null;
    let closestPostDistance = Infinity;
    
    for (const post of allPosts) {
      const postRect = post.getBoundingClientRect();
      const menuRect = menuElement.getBoundingClientRect();
      
      // Check if post is at least partially in viewport
      const isInViewport = postRect.bottom > 0 && postRect.top < window.innerHeight;
      
      if (isInViewport) {
        // Calculate distance from post center to menu
        const postCenterX = postRect.left + postRect.width / 2;
        const postCenterY = postRect.top + postRect.height / 2;
        const menuCenterX = menuRect.left + menuRect.width / 2;
        const menuCenterY = menuRect.top + menuRect.height / 2;
        
        const distance = Math.sqrt(
          Math.pow(postCenterX - menuCenterX, 2) + 
          Math.pow(postCenterY - menuCenterY, 2)
        );
        
        if (distance < closestPostDistance) {
          closestPostDistance = distance;
          closestPost = post;
        }
      }
    }
    
    if (closestPost) {
      window.Logger.log('[share-menu-detector] Found closest post in viewport', { distance: closestPostDistance });
      return closestPost;
    }

    window.Logger.warn('[share-menu-detector] Could not find associated post for share menu');
    return null;
  } catch (error) {
    console.error('[share-menu-detector] Error finding associated post:', error);
    return null;
  }
}

/**
 * Check if an element is a share menu
 * @param {HTMLElement} element - Element to check
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if element is a share menu
 */
function isShareMenu(element, platform) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (!platform || !SHARE_MENU_SELECTORS[platform]) {
    return false;
  }

  const config = SHARE_MENU_SELECTORS[platform];

  try {
    // Check if element matches any menu selector
    let matchesSelector = false;
    for (const selector of config.menu) {
      try {
        if (element.matches(selector)) {
          matchesSelector = true;
          break;
        }
      } catch (error) {
        // Invalid selector, continue
      }
    }

    if (!matchesSelector) {
      return false;
    }

    // Additional validation: should contain menu items
    let hasMenuItems = false;
    for (const itemSelector of config.menuItems) {
      try {
        const items = element.querySelectorAll(itemSelector);
        if (items.length > 0) {
          hasMenuItems = true;
          break;
        }
      } catch (error) {
        // Invalid selector, continue
      }
    }

    if (!hasMenuItems) {
      return false;
    }

    // Should be visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    // Should have some content
    if (!element.textContent || element.textContent.trim().length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('[share-menu-detector] Error validating share menu:', error);
    return false;
  }
}

/**
 * Get selector configuration for a platform
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {Object|null} Selector configuration object
 */
function getSelectorConfig(platform) {
  return SHARE_MENU_SELECTORS[platform] || null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    observeShareMenus,
    findAssociatedPost,
    isShareMenu,
    getSelectorConfig,
    SHARE_MENU_SELECTORS
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.ShareMenuDetector = {
    observeShareMenus,
    findAssociatedPost,
    isShareMenu,
    getSelectorConfig,
    SHARE_MENU_SELECTORS
  };
}
