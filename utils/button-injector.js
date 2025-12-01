/**
 * Button Injection Module
 * Handles finding injection points and injecting/removing per-post buttons
 * Requirements: 3.4, 7.3
 */

/**
 * Platform-specific injection point selectors
 */
const INJECTION_SELECTORS = {
  twitter: {
    // Action bar selectors for Twitter/X
    primary: [
      'div[role="group"]', // Main action bar with like/retweet/reply buttons
      'div[data-testid="tweet"] div[role="group"]',
      'article div[role="group"]'
    ],
    // Fallback selectors
    fallback: [
      'div[aria-label*="Reply"]',
      'div[aria-label*="Retweet"]',
      'div[aria-label*="Like"]'
    ]
  },
  instagram: {
    // Action bar selectors for Instagram
    primary: [
      'section[class*="x1iyjqo2"]', // Action section with like/comment/share
      'section > div > div', // Action bar container
      'div[role="button"][tabindex="0"]' // Individual action buttons
    ],
    // Fallback selectors
    fallback: [
      'section span[aria-label*="Like"]',
      'section span[aria-label*="Comment"]',
      'section span[aria-label*="Share"]'
    ]
  }
};

/**
 * Data attribute to mark posts with injected buttons
 */
const BUTTON_INJECTED_ATTR = 'data-redirector-button-injected';

/**
 * Find the injection point within a post container
 * @param {HTMLElement} postElement - The post container element
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The injection point element or null if not found
 */
function findInjectionPoint(postElement, platform) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    console.warn('[button-injector] Invalid post element provided');
    return null;
  }

  if (!platform || !INJECTION_SELECTORS[platform]) {
    console.warn('[button-injector] Invalid platform:', platform);
    return null;
  }

  const config = INJECTION_SELECTORS[platform];

  try {
    // Try primary selectors first
    for (const selector of config.primary) {
      const elements = postElement.querySelectorAll(selector);
      
      // For Twitter, we want the action bar (role="group")
      if (platform === 'twitter') {
        for (const element of elements) {
          // Validate it's an action bar by checking for action buttons
          const hasActionButtons = element.querySelector('[data-testid*="reply"], [data-testid*="retweet"], [data-testid*="like"]') ||
                                   element.querySelectorAll('[role="button"]').length >= 3;
          
          if (hasActionButtons) {
            return element;
          }
        }
      }
      
      // For Instagram, we want the action section
      if (platform === 'instagram') {
        for (const element of elements) {
          // Validate it's an action section by checking for buttons or action elements
          const hasActionElements = element.querySelector('svg') || 
                                    element.querySelectorAll('[role="button"]').length > 0;
          
          if (hasActionElements && element.offsetHeight > 0) {
            return element;
          }
        }
      }
    }

    // Try fallback selectors
    for (const selector of config.fallback) {
      const element = postElement.querySelector(selector);
      if (element) {
        // Return the parent container that holds action buttons
        const actionContainer = element.closest('div[role="group"]') || 
                               element.closest('section') ||
                               element.parentElement;
        
        if (actionContainer && actionContainer.offsetHeight > 0) {
          return actionContainer;
        }
      }
    }

    // Requirement 7.3: Handle missing injection points gracefully
    console.warn('[button-injector] Could not find injection point for platform:', platform);
    return null;
  } catch (error) {
    console.error('[button-injector] Error finding injection point:', error);
    return null;
  }
}

/**
 * Inject a button into a post at the specified injection point
 * Requirement 3.4: Position consistency
 * @param {HTMLElement} button - The button element to inject
 * @param {HTMLElement} injectionPoint - The injection point element
 * @param {HTMLElement} postElement - The post container element
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if injection successful, false otherwise
 */
function injectButton(button, injectionPoint, postElement, platform) {
  if (!button || !(button instanceof HTMLElement)) {
    console.warn('[button-injector] Invalid button element provided');
    return false;
  }

  if (!injectionPoint || !(injectionPoint instanceof HTMLElement)) {
    console.warn('[button-injector] Invalid injection point provided');
    return false;
  }

  if (!postElement || !(postElement instanceof HTMLElement)) {
    console.warn('[button-injector] Invalid post element provided');
    return false;
  }

  try {
    // Check if button already exists in this post (verify actual DOM presence)
    const existingButton = postElement.querySelector('.social-redirector-per-post-button');
    if (existingButton) {
      console.log('[button-injector] Button already exists in this post');
      return false;
    }

    // Create a wrapper for consistent positioning
    const buttonWrapper = document.createElement('div');
    buttonWrapper.className = `social-redirector-button-wrapper ${platform}-wrapper`;
    buttonWrapper.style.display = 'inline-flex';
    buttonWrapper.style.alignItems = 'center';
    buttonWrapper.style.marginLeft = platform === 'twitter' ? '8px' : '12px';
    buttonWrapper.appendChild(button);

    // Requirement 3.4: Inject at consistent position (always append to action bar)
    injectionPoint.appendChild(buttonWrapper);

    // Mark post as having button injected (for quick reference)
    postElement.setAttribute(BUTTON_INJECTED_ATTR, 'true');

    console.log('[button-injector] Button successfully injected');
    return true;
  } catch (error) {
    console.error('[button-injector] Error injecting button:', error);
    return false;
  }
}

/**
 * Remove button from a post container
 * @param {HTMLElement} postElement - The post container element
 * @returns {boolean} True if removal successful, false otherwise
 */
function removeButton(postElement) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    console.warn('[button-injector] Invalid post element provided');
    return false;
  }

  try {
    // Find and remove the button wrapper
    const buttonWrapper = postElement.querySelector('.social-redirector-button-wrapper');
    
    if (buttonWrapper) {
      buttonWrapper.remove();
      postElement.removeAttribute(BUTTON_INJECTED_ATTR);
      console.log('[button-injector] Button successfully removed');
      return true;
    }

    // If no wrapper found, try to find button directly
    const button = postElement.querySelector('.social-redirector-per-post-button');
    if (button) {
      button.remove();
      postElement.removeAttribute(BUTTON_INJECTED_ATTR);
      console.log('[button-injector] Button successfully removed');
      return true;
    }

    console.log('[button-injector] No button found to remove');
    return false;
  } catch (error) {
    console.error('[button-injector] Error removing button:', error);
    return false;
  }
}

/**
 * Check if a post already has a button injected
 * @param {HTMLElement} postElement - The post container element
 * @returns {boolean} True if button is already injected
 */
function hasButton(postElement) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    return false;
  }

  return postElement.hasAttribute(BUTTON_INJECTED_ATTR) ||
         postElement.querySelector('.social-redirector-per-post-button') !== null;
}

/**
 * Get injection point configuration for a platform
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {Object|null} Injection point configuration
 */
function getInjectionConfig(platform) {
  return INJECTION_SELECTORS[platform] || null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findInjectionPoint,
    injectButton,
    removeButton,
    hasButton,
    getInjectionConfig,
    INJECTION_SELECTORS
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.ButtonInjector = {
    findInjectionPoint,
    injectButton,
    removeButton,
    hasButton,
    getInjectionConfig,
    INJECTION_SELECTORS
  };
}
