/**
 * Post URL Extraction Module
 * Extracts unique URLs from individual Twitter/X and Instagram posts
 */

/**
 * Extract URL from a Twitter/X post container
 * Handles regular tweets, retweets, and quoted tweets
 * @param {HTMLElement} tweetElement - The tweet container element
 * @returns {string|null} The tweet URL or null if not found
 */
function extractTweetUrl(tweetElement) {
  if (!tweetElement || !(tweetElement instanceof HTMLElement)) {
    console.warn('[post-url-extractor] Invalid tweet element provided');
    return null;
  }

  try {
    // Strategy 1: Look for timestamp link (most reliable)
    // Twitter uses <time> elements with parent <a> tags containing the status URL
    const timeElement = tweetElement.querySelector('time');
    if (timeElement) {
      const timeLink = timeElement.closest('a');
      if (timeLink && timeLink.href) {
        const url = timeLink.href;
        if (validateTwitterUrl(url)) {
          return url;
        }
      }
    }

    // Strategy 2: Look for any link matching the status URL pattern
    // Pattern: /username/status/1234567890
    const links = tweetElement.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      if (link.href && validateTwitterUrl(link.href)) {
        return link.href;
      }
    }

    // Strategy 3: Check for retweet - look for the original tweet's URL
    // Retweets often have the original tweet link in a specific structure
    const retweetLinks = tweetElement.querySelectorAll('a[href*="x.com"][href*="/status/"]');
    for (const link of retweetLinks) {
      if (link.href && validateTwitterUrl(link.href)) {
        return link.href;
      }
    }

    // Strategy 4: Look in data attributes (fallback)
    const articleElement = tweetElement.tagName === 'ARTICLE' ? tweetElement : tweetElement.querySelector('article');
    if (articleElement && articleElement.attributes) {
      // Check for any data attributes that might contain the URL
      try {
        for (const attr of articleElement.attributes) {
          if (attr.value && attr.value.includes('/status/')) {
            try {
              const url = new URL(attr.value, 'https://x.com');
              if (validateTwitterUrl(url.href)) {
                return url.href;
              }
            } catch (e) {
              // Invalid URL in attribute, continue
            }
          }
        }
      } catch (e) {
        // attributes might not be iterable in test environment
      }
    }

    console.warn('[post-url-extractor] Could not extract URL from tweet element');
    return null;
  } catch (error) {
    console.error('[post-url-extractor] Error extracting tweet URL:', error);
    return null;
  }
}

/**
 * Extract URL from an Instagram post container
 * Handles feed posts, reels, and profile posts
 * @param {HTMLElement} postElement - The post container element
 * @returns {string|null} The post URL or null if not found
 */
function extractInstagramPostUrl(postElement) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    console.warn('[post-url-extractor] Invalid post element provided');
    return null;
  }

  try {
    // Strategy 1: Look for post header link
    // Instagram posts typically have a link in the header with the post URL
    const headerLinks = postElement.querySelectorAll('header a[href*="/p/"], header a[href*="/reel/"], header a[href*="/tv/"]');
    for (const link of headerLinks) {
      if (link.href && validateInstagramUrl(link.href)) {
        return link.href;
      }
    }

    // Strategy 2: Look for any link matching the post URL pattern
    // Pattern: /p/ABC123/ or /reel/ABC123/ or /tv/ABC123/
    const postLinks = postElement.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]');
    for (const link of postLinks) {
      if (link.href && validateInstagramUrl(link.href)) {
        return link.href;
      }
    }

    // Strategy 3: Look for time element's parent link (similar to Twitter)
    const timeElement = postElement.querySelector('time');
    if (timeElement) {
      const timeLink = timeElement.closest('a');
      if (timeLink && timeLink.href && validateInstagramUrl(timeLink.href)) {
        return timeLink.href;
      }
    }

    // Strategy 4: Look in article element for links
    const articleElement = postElement.tagName === 'ARTICLE' ? postElement : postElement.querySelector('article');
    if (articleElement) {
      const articleLinks = articleElement.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]');
      for (const link of articleLinks) {
        if (link.href && validateInstagramUrl(link.href)) {
          return link.href;
        }
      }
    }

    console.warn('[post-url-extractor] Could not extract URL from Instagram post element');
    return null;
  } catch (error) {
    console.error('[post-url-extractor] Error extracting Instagram post URL:', error);
    return null;
  }
}

/**
 * Validate if a URL matches Twitter/X post URL pattern
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid Twitter post URL
 */
function validateTwitterUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Check protocol (must be https)
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Check hostname
    if (urlObj.hostname !== 'x.com' && 
        urlObj.hostname !== 'www.x.com' && 
        urlObj.hostname !== 'twitter.com' && 
        urlObj.hostname !== 'www.twitter.com') {
      return false;
    }

    // Check pathname pattern: /username/status/1234567890
    const pathPattern = /^\/[^\/]+\/status\/\d+/;
    if (!pathPattern.test(urlObj.pathname)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate if a URL matches Instagram post URL pattern
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid Instagram post URL
 */
function validateInstagramUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Check protocol (must be https)
    if (urlObj.protocol !== 'https:') {
      return false;
    }
    
    // Check hostname
    if (urlObj.hostname !== 'www.instagram.com' && 
        urlObj.hostname !== 'instagram.com') {
      return false;
    }

    // Check pathname pattern: /p/ABC123/ or /reel/ABC123/
    const pathPattern = /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/;
    if (!pathPattern.test(urlObj.pathname)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate a post URL for a given platform
 * @param {string} url - The URL to validate
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if valid post URL for the platform
 */
function validatePostUrl(url, platform) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  if (!platform || typeof platform !== 'string') {
    return false;
  }

  if (platform === 'twitter') {
    return validateTwitterUrl(url);
  } else if (platform === 'instagram') {
    return validateInstagramUrl(url);
  }

  return false;
}

/**
 * Extract post URL based on platform
 * @param {HTMLElement} postElement - The post container element
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {string|null} The post URL or null if not found
 */
function extractPostUrl(postElement, platform) {
  if (!postElement || !(postElement instanceof HTMLElement)) {
    console.warn('[post-url-extractor] Invalid post element provided');
    return null;
  }

  if (!platform || typeof platform !== 'string') {
    console.warn('[post-url-extractor] Invalid platform provided');
    return null;
  }

  if (platform === 'twitter') {
    return extractTweetUrl(postElement);
  } else if (platform === 'instagram') {
    return extractInstagramPostUrl(postElement);
  }

  console.warn(`[post-url-extractor] Unsupported platform: ${platform}`);
  return null;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractTweetUrl,
    extractInstagramPostUrl,
    extractPostUrl,
    validatePostUrl,
    validateTwitterUrl,
    validateInstagramUrl
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.PostUrlExtractor = {
    extractTweetUrl,
    extractInstagramPostUrl,
    extractPostUrl,
    validatePostUrl,
    validateTwitterUrl,
    validateInstagramUrl
  };
}
