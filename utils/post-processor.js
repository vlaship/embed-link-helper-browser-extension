/**
 * Post Processing Pipeline
 * Main orchestration module that coordinates post detection, URL extraction,
 * button creation, and injection.
 * Requirements: 5.4, 7.1, 8.5
 */

// Import required modules
const { findPostContainers } = require('./post-detector');
const { extractPostUrl } = require('./post-url-extractor');
const { createPerPostButton } = require('./per-post-button');
const { findInjectionPoint, injectButton } = require('./button-injector');
const { markPostProcessed, isPostProcessed } = require('./post-registry');

/**
 * Process a single post: extract URL, create button, and inject
 * @param {HTMLElement} postElement - The post container element
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {string} targetHostname - The target hostname for redirects
 * @returns {Object} Result object with success status and any errors
 */
function processPost(postElement, platform, targetHostname) {
  const result = {
    success: false,
    postElement,
    error: null,
    skipped: false,
    reason: null
  };

  try {
    // Validate inputs
    if (!postElement || !(postElement instanceof HTMLElement)) {
      result.error = new Error('Invalid post element');
      result.reason = 'invalid_element';
      console.error('[post-processor] Invalid post element provided');
      return result;
    }

    if (!platform || typeof platform !== 'string') {
      result.error = new Error('Invalid platform');
      result.reason = 'invalid_platform';
      console.error('[post-processor] Invalid platform provided');
      return result;
    }

    if (!targetHostname || typeof targetHostname !== 'string') {
      result.error = new Error('Invalid target hostname');
      result.reason = 'invalid_hostname';
      console.error('[post-processor] Invalid target hostname provided');
      return result;
    }

    // Check if post already processed
    if (isPostProcessed(postElement)) {
      result.skipped = true;
      result.reason = 'already_processed';
      return result;
    }

    // Step 1: Extract post URL
    let postUrl;
    try {
      postUrl = extractPostUrl(postElement, platform);
    } catch (error) {
      // Requirement 7.1: Handle malformed posts gracefully
      result.error = error;
      result.reason = 'url_extraction_failed';
      console.error('[post-processor] Error extracting URL from post:', error);
      // Requirement 8.5: Log detailed error information
      console.error('[post-processor] Post element:', postElement);
      console.error('[post-processor] Platform:', platform);
      return result;
    }

    // If no URL found, skip this post (Requirement 4.3)
    if (!postUrl) {
      result.skipped = true;
      result.reason = 'no_url_found';
      console.warn('[post-processor] No URL found for post, skipping');
      // Mark as processed to avoid retrying
      markPostProcessed(postElement);
      return result;
    }

    // Step 2: Create redirect button
    let button;
    try {
      button = createPerPostButton(postUrl, targetHostname, platform);
    } catch (error) {
      // Requirement 7.1: Handle errors gracefully
      result.error = error;
      result.reason = 'button_creation_failed';
      console.error('[post-processor] Error creating button:', error);
      // Requirement 8.5: Log detailed error information
      console.error('[post-processor] Post URL:', postUrl);
      console.error('[post-processor] Target hostname:', targetHostname);
      return result;
    }

    if (!button) {
      result.skipped = true;
      result.reason = 'button_creation_returned_null';
      console.warn('[post-processor] Button creation returned null, skipping');
      return result;
    }

    // Step 3: Find injection point
    let injectionPoint;
    try {
      injectionPoint = findInjectionPoint(postElement, platform);
    } catch (error) {
      // Requirement 7.1: Handle errors gracefully
      result.error = error;
      result.reason = 'injection_point_search_failed';
      console.error('[post-processor] Error finding injection point:', error);
      // Requirement 8.5: Log detailed error information
      console.error('[post-processor] Post element:', postElement);
      return result;
    }

    // If no injection point found, skip this post (Requirement 7.3)
    if (!injectionPoint) {
      result.skipped = true;
      result.reason = 'no_injection_point';
      console.warn('[post-processor] No injection point found for post, skipping');
      // Mark as processed to avoid retrying
      markPostProcessed(postElement);
      return result;
    }

    // Step 4: Inject button
    let injected;
    try {
      injected = injectButton(button, injectionPoint, postElement, platform);
    } catch (error) {
      // Requirement 7.1: Handle errors gracefully
      result.error = error;
      result.reason = 'button_injection_failed';
      console.error('[post-processor] Error injecting button:', error);
      // Requirement 8.5: Log detailed error information
      console.error('[post-processor] Button:', button);
      console.error('[post-processor] Injection point:', injectionPoint);
      return result;
    }

    if (!injected) {
      result.skipped = true;
      result.reason = 'injection_returned_false';
      console.warn('[post-processor] Button injection returned false, skipping');
      return result;
    }

    // Step 5: Mark post as processed
    try {
      markPostProcessed(postElement);
    } catch (error) {
      // Even if marking fails, the button was injected successfully
      console.warn('[post-processor] Error marking post as processed:', error);
    }

    // Success!
    result.success = true;
    return result;

  } catch (error) {
    // Requirement 7.1: Catch any unexpected errors gracefully
    result.error = error;
    result.reason = 'unexpected_error';
    console.error('[post-processor] Unexpected error processing post:', error);
    // Requirement 8.5: Log detailed error information
    console.error('[post-processor] Stack trace:', error.stack);
    return result;
  }
}

/**
 * Check if an element is in the viewport
 * Requirement 5.2: Only process visible posts
 * @param {HTMLElement} element - The element to check
 * @param {number} threshold - Percentage of element that must be visible (0-1)
 * @returns {boolean} - True if element is in viewport
 */
function isInViewport(element, threshold = 0.1) {
  try {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;

    // Calculate visible area
    const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
    const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);

    // Check if at least threshold% is visible
    const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, windowWidth) - Math.max(rect.left, 0);
    const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
    const totalArea = rect.height * rect.width;

    return vertInView && horInView && (totalArea === 0 || visibleArea / totalArea >= threshold);
  } catch (error) {
    // If we can't determine viewport status, assume it's visible to avoid skipping posts
    console.warn('[post-processor] Error checking viewport status:', error);
    return true;
  }
}

/**
 * Process multiple posts in batch
 * Requirement 5.4: Batch processing for multiple posts
 * Requirement 5.2: Only process visible posts
 * @param {Array<HTMLElement>} postElements - Array of post container elements
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {string} targetHostname - The target hostname for redirects
 * @param {Object} options - Processing options
 * @param {boolean} options.onlyVisible - Only process posts in viewport (default: true)
 * @returns {Object} Summary of batch processing results
 */
function processBatch(postElements, platform, targetHostname, options = {}) {
  const { onlyVisible = true } = options;
  
  const summary = {
    total: 0,
    successful: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    results: []
  };

  // Validate inputs
  if (!Array.isArray(postElements)) {
    console.error('[post-processor] Invalid postElements: not an array');
    return summary;
  }

  if (!platform || typeof platform !== 'string') {
    console.error('[post-processor] Invalid platform provided to processBatch');
    return summary;
  }

  if (!targetHostname || typeof targetHostname !== 'string') {
    console.error('[post-processor] Invalid target hostname provided to processBatch');
    return summary;
  }

  summary.total = postElements.length;

  // Filter to only visible posts if requested (Requirement 5.2)
  let postsToProcess = postElements;
  if (onlyVisible) {
    postsToProcess = postElements.filter(post => isInViewport(post));
    if (postsToProcess.length < postElements.length) {
      console.log(`[post-processor] Filtered to ${postsToProcess.length} visible posts out of ${postElements.length} total`);
    }
  }

  // Process each post
  for (const postElement of postsToProcess) {
    try {
      const result = processPost(postElement, platform, targetHostname);
      summary.results.push(result);

      if (result.success) {
        summary.successful++;
      } else if (result.skipped) {
        summary.skipped++;
      } else {
        summary.failed++;
        if (result.error) {
          summary.errors.push({
            error: result.error,
            reason: result.reason,
            postElement: result.postElement
          });
        }
      }
    } catch (error) {
      // Requirement 7.1: Handle errors gracefully without crashing
      summary.failed++;
      summary.errors.push({
        error,
        reason: 'batch_processing_error',
        postElement
      });
      console.error('[post-processor] Error in batch processing:', error);
      // Requirement 8.5: Log detailed error information
      console.error('[post-processor] Failed post element:', postElement);
    }
  }

  // Log summary
  console.log(`[post-processor] Batch processing complete: ${summary.successful} successful, ${summary.skipped} skipped, ${summary.failed} failed out of ${summary.total} total`);

  if (summary.errors.length > 0) {
    console.warn(`[post-processor] ${summary.errors.length} errors occurred during batch processing`);
  }

  return summary;
}

/**
 * Process all posts on the current page
 * Requirement 5.2: Only process visible posts
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {string} targetHostname - The target hostname for redirects
 * @param {HTMLElement} [root=document] - Root element to search within
 * @param {Object} options - Processing options
 * @param {boolean} options.onlyVisible - Only process posts in viewport (default: true)
 * @returns {Object} Summary of processing results
 */
function processAllPosts(platform, targetHostname, root = document, options = {}) {
  try {
    // Find all post containers
    const postElements = findPostContainers(platform, root);

    if (postElements.length === 0) {
      console.log('[post-processor] No posts found on page');
      return {
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        results: []
      };
    }

    console.log(`[post-processor] Found ${postElements.length} posts to process`);

    // Process in batch with viewport detection (Requirement 5.2)
    return processBatch(postElements, platform, targetHostname, options);

  } catch (error) {
    // Requirement 7.1: Handle errors gracefully
    console.error('[post-processor] Error in processAllPosts:', error);
    // Requirement 8.5: Log detailed error information
    console.error('[post-processor] Platform:', platform);
    console.error('[post-processor] Target hostname:', targetHostname);
    console.error('[post-processor] Stack trace:', error.stack);

    return {
      total: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
      errors: [{ error, reason: 'process_all_posts_error' }],
      results: []
    };
  }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    processPost,
    processBatch,
    processAllPosts,
    isInViewport
  };
}
