/**
 * Post Registry Module
 * 
 * Manages tracking of processed posts to prevent duplicate button injection.
 * Maintains a registry of post elements that have been processed.
 */

// WeakMap to track processed posts (automatically handles cleanup when elements are removed from DOM)
const processedPosts = new WeakMap();

// Set to track post identifiers for additional validation
const processedPostIds = new Set();

/**
 * Mark a post as processed
 * @param {HTMLElement} postElement - The post container element
 * @returns {void}
 */
function markPostProcessed(postElement) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    throw new Error('Invalid post element provided to markPostProcessed');
  }

  // Mark in WeakMap
  processedPosts.set(postElement, true);

  // Also track by a unique identifier if available
  const postId = extractPostIdentifier(postElement);
  if (postId) {
    processedPostIds.add(postId);
    console.log('[post-registry] Marked as processed, ID added to Set:', postId, 'Set size:', processedPostIds.size);
  } else {
    console.warn('[post-registry] Marked as processed but no ID extracted');
  }
}

/**
 * Check if a post has been processed
 * @param {HTMLElement} postElement - The post container element
 * @param {boolean} verifyButton - Whether to verify button exists in DOM (default: false for backwards compatibility)
 * @returns {boolean} - True if post has been processed
 */
function isPostProcessed(postElement, verifyButton = false) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    return false;
  }

  // If verification is enabled, check if the button actually exists in the DOM
  // This handles cases where Twitter/X removes and re-adds posts during scrolling
  if (verifyButton) {
    const hasButton = postElement.querySelector('.social-redirector-per-post-button');
    
    console.log('[post-registry] Verify check - hasButton:', !!hasButton);
    
    if (hasButton) {
      // Button exists, mark as processed in WeakMap for faster future checks
      processedPosts.set(postElement, true);
      console.log('[post-registry] Button exists, returning true');
      return true;
    }
    
    // No button found - return false to allow injection
    // This is the simple solution: if there's no button, inject one!
    console.log('[post-registry] No button found, returning false to allow injection');
    return false;
  }

  // Check WeakMap (without button verification)
  if (processedPosts.has(postElement)) {
    return true;
  }

  // Check by identifier as a fallback
  const postId = extractPostIdentifier(postElement);
  if (postId && processedPostIds.has(postId)) {
    return true;
  }

  return false;
}

/**
 * Clear the entire registry (useful for config updates)
 * @returns {void}
 */
function clearRegistry() {
  console.log('[post-registry] ⚠️ CLEARING REGISTRY - Set size before:', processedPostIds.size);
  console.trace('[post-registry] clearRegistry called from:');
  
  // Clear the Set of post IDs
  processedPostIds.clear();
  
  console.log('[post-registry] Registry cleared, Set size now:', processedPostIds.size);
  
  // Note: WeakMap cannot be cleared directly, but since we're clearing the Set,
  // new checks will rely on the Set being empty. The WeakMap will be garbage
  // collected naturally as elements are removed from the DOM.
}

/**
 * Clean up registry for posts that are no longer in the DOM
 * Requirement 5.3: Implement periodic registry cleanup
 * @returns {number} - Number of entries cleaned up
 */
function cleanupRegistry() {
  // DISABLED: This cleanup was removing IDs when Twitter does virtual scrolling
  // We want to KEEP the IDs so we can detect when posts are re-added
  console.log('[post-registry] Cleanup called but DISABLED to preserve IDs for virtual scrolling');
  return 0;
}

/**
 * Start periodic cleanup of the registry
 * Requirement 5.3: Implement periodic registry cleanup
 * @param {number} intervalMs - Cleanup interval in milliseconds (default: 30000 = 30 seconds)
 * @returns {number} - Interval ID that can be used to stop cleanup
 */
function startPeriodicCleanup(intervalMs = 30000) {
  console.log(`[post-registry] Starting periodic cleanup every ${intervalMs}ms`);
  return setInterval(() => {
    cleanupRegistry();
  }, intervalMs);
}

/**
 * Stop periodic cleanup
 * @param {number} intervalId - The interval ID returned by startPeriodicCleanup
 * @returns {void}
 */
function stopPeriodicCleanup(intervalId) {
  if (intervalId) {
    clearInterval(intervalId);
    console.log('[post-registry] Stopped periodic cleanup');
  }
}

/**
 * Extract a unique identifier from a post element
 * @param {HTMLElement} postElement - The post container element
 * @returns {string|null} - Unique identifier or null
 */
function extractPostIdentifier(postElement) {
  // Try various methods to get a unique identifier
  
  // Method 1: Check for data attributes
  if (postElement.dataset && postElement.dataset.postId) {
    console.log('[post-registry] Found postId in dataset:', postElement.dataset.postId);
    return postElement.dataset.postId;
  }
  
  // Method 2: Look for tweet ID in links (Twitter/X) - try multiple selectors
  const tweetSelectors = [
    'a[href*="/status/"]',
    'time[datetime] ~ a[href*="/status/"]',
    'a[role="link"][href*="/status/"]',
    '[data-testid="User-Name"] a[href*="/status/"]'
  ];
  
  for (const selector of tweetSelectors) {
    const tweetLink = postElement.querySelector(selector);
    if (tweetLink && tweetLink.href) {
      const match = tweetLink.href.match(/\/status\/(\d+)/);
      if (match) {
        const id = `twitter-${match[1]}`;
        console.log('[post-registry] Extracted Twitter ID:', id);
        return id;
      }
    }
  }
  
  // Method 3: Look for Instagram post ID in links
  const instaLink = postElement.querySelector('a[href*="/p/"], a[href*="/reel/"]');
  if (instaLink && instaLink.href) {
    const match = instaLink.href.match(/\/(p|reel)\/([^/]+)/);
    if (match) {
      const id = `instagram-${match[2]}`;
      console.log('[post-registry] Extracted Instagram ID:', id);
      return id;
    }
  }
  
  // Method 4: Try to find ANY link with status or post ID in the URL
  const allLinks = postElement.querySelectorAll('a[href]');
  for (const link of allLinks) {
    // Twitter
    const twitterMatch = link.href.match(/\/status\/(\d+)/);
    if (twitterMatch) {
      const id = `twitter-${twitterMatch[1]}`;
      console.log('[post-registry] Extracted Twitter ID from any link:', id);
      return id;
    }
    
    // Instagram
    const instaMatch = link.href.match(/\/(p|reel)\/([^/]+)/);
    if (instaMatch) {
      const id = `instagram-${instaMatch[2]}`;
      console.log('[post-registry] Extracted Instagram ID from any link:', id);
      return id;
    }
  }
  
  console.warn('[post-registry] Could not extract post ID, using fallback');
  
  // Method 5: Use a combination of attributes as fallback
  const tagName = postElement.tagName;
  let className = '';
  try {
    className = postElement.className || '';
  } catch (e) {
    className = '';
  }
  const textContent = postElement.textContent?.substring(0, 100) || '';
  
  // Create a simple hash-like identifier from text content
  if (textContent) {
    // Create a more stable ID by using first 100 chars of text
    const stableText = textContent.replace(/\s+/g, ' ').trim();
    const id = `fallback-${stableText.substring(0, 50)}`;
    console.log('[post-registry] Using fallback ID:', id.substring(0, 30) + '...');
    return id;
  }
  
  console.warn('[post-registry] No identifier could be extracted');
  return null;
}

/**
 * Find an element by its post ID
 * @param {string} postId - The post identifier
 * @returns {HTMLElement|null} - The element or null
 */
function findElementByPostId(postId) {
  // This is a helper for cleanup - try to find the element
  if (postId.startsWith('twitter-')) {
    const statusId = postId.replace('twitter-', '');
    const link = document.querySelector(`a[href*="/status/${statusId}"]`);
    return link ? link.closest('article') : null;
  }
  
  if (postId.startsWith('instagram-')) {
    const postCode = postId.replace('instagram-', '');
    const link = document.querySelector(`a[href*="/p/${postCode}"], a[href*="/reel/${postCode}"]`);
    return link ? link.closest('article') : null;
  }
  
  return null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    markPostProcessed,
    isPostProcessed,
    clearRegistry,
    cleanupRegistry,
    startPeriodicCleanup,
    stopPeriodicCleanup
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.PostRegistry = {
    markPostProcessed,
    isPostProcessed,
    clearRegistry,
    cleanupRegistry,
    startPeriodicCleanup,
    stopPeriodicCleanup
  };
}
