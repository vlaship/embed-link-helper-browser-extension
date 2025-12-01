/**
 * Post Detection Utilities
 * Provides platform-specific selectors and functions to detect post containers
 * on Twitter/X and Instagram timelines.
 */

/**
 * Platform-specific selector configurations
 */
const SELECTORS = {
  twitter: {
    primary: [
      'article[data-testid="tweet"]',
      'div[data-testid="cellInnerDiv"] article'
    ],
    fallback: [
      'article[role="article"]',
      'div[data-testid="tweet"]'
    ]
  },
  instagram: {
    primary: [
      'article[role="presentation"]',
      'div[class*="x1iyjqo2"] article'
    ],
    fallback: [
      'article',
      'div[role="presentation"]'
    ]
  }
};

/**
 * Find all post containers on the page for a given platform
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {HTMLElement} [root=document] - Root element to search within
 * @returns {Array<HTMLElement>} Array of post container elements
 */
function findPostContainers(platform, root = document) {
  if (!platform || !SELECTORS[platform]) {
    console.warn(`[post-detector] Invalid platform: ${platform}`);
    return [];
  }

  const config = SELECTORS[platform];
  const foundPosts = new Set();

  // Try primary selectors first
  for (const selector of config.primary) {
    try {
      const elements = root.querySelectorAll(selector);
      elements.forEach(el => {
        if (isPostContainer(el, platform)) {
          foundPosts.add(el);
        }
      });
    } catch (error) {
      console.warn(`[post-detector] Primary selector failed: ${selector}`, error);
    }
  }

  // If no posts found with primary selectors, try fallback selectors
  if (foundPosts.size === 0) {
    for (const selector of config.fallback) {
      try {
        const elements = root.querySelectorAll(selector);
        elements.forEach(el => {
          if (isPostContainer(el, platform)) {
            foundPosts.add(el);
          }
        });
      } catch (error) {
        console.warn(`[post-detector] Fallback selector failed: ${selector}`, error);
      }
    }
  }

  return Array.from(foundPosts);
}

/**
 * Validate if an element is a valid post container
 * @param {HTMLElement} element - Element to validate
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if element is a valid post container
 */
function isPostContainer(element, platform) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  // Platform-specific validation
  if (platform === 'twitter') {
    return isTwitterPostContainer(element);
  } else if (platform === 'instagram') {
    return isInstagramPostContainer(element);
  }

  return false;
}

/**
 * Validate if an element is a valid Twitter/X post container
 * @param {HTMLElement} element - Element to validate
 * @returns {boolean} True if element is a valid tweet container
 */
function isTwitterPostContainer(element) {
  // Must be an article element
  if (element.tagName !== 'ARTICLE') {
    return false;
  }

  // Should have some content (not empty)
  if (!element.textContent || element.textContent.trim().length === 0) {
    return false;
  }

  // Should have reasonable dimensions (not hidden)
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Additional validation: should contain tweet-like structure
  // Look for common tweet elements (links, text content, etc.)
  const hasLinks = element.querySelectorAll('a').length > 0;
  const hasText = element.querySelector('[lang]') !== null || 
                  element.querySelector('[dir]') !== null;

  return hasLinks || hasText;
}

/**
 * Validate if an element is a valid Instagram post container
 * @param {HTMLElement} element - Element to validate
 * @returns {boolean} True if element is a valid post container
 */
function isInstagramPostContainer(element) {
  // Must be an article element
  if (element.tagName !== 'ARTICLE') {
    return false;
  }

  // Should have some content (not empty)
  if (!element.textContent || element.textContent.trim().length === 0) {
    return false;
  }

  // Should have reasonable dimensions (not hidden)
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    return false;
  }

  // Additional validation: should contain post-like structure
  // Look for common post elements (images, links, etc.)
  const hasImages = element.querySelectorAll('img').length > 0;
  const hasLinks = element.querySelectorAll('a').length > 0;

  return hasImages || hasLinks;
}

/**
 * Get selector configuration for a platform
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {Object|null} Selector configuration object
 */
function getSelectorConfig(platform) {
  return SELECTORS[platform] || null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    findPostContainers,
    isPostContainer,
    getSelectorConfig,
    SELECTORS
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.PostDetector = {
    findPostContainers,
    isPostContainer,
    getSelectorConfig,
    SELECTORS
  };
}
