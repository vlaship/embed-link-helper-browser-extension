/**
 * Instagram Content Script - Per-Post Redirect Buttons
 * Injects individual redirect buttons into each Instagram post in the feed
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 * Note: browser-polyfill.js is loaded before this script in manifest.json
 */

(function() {
  'use strict';

  // Import utility modules (loaded via manifest.json)
  const { findPostContainers } = window.PostDetector || {};
  const { extractPostUrl } = window.PostUrlExtractor || {};
  const { createPerPostButton } = window.PerPostButton || {};
  const { findInjectionPoint, injectButton, removeButton } = window.ButtonInjector || {};
  const { markPostProcessed, isPostProcessed, clearRegistry, startPeriodicCleanup, stopPeriodicCleanup } = window.PostRegistry || {};

  // Constants
  const PLATFORM = 'instagram';
  const DEFAULT_TARGET_HOSTNAME = 'kkinstagram.com';
  const OBSERVER_THROTTLE_MS = 200; // Requirement 5.1: Throttle observer callbacks
  const INITIAL_PROCESS_DELAY_MS = 500;
  const REGISTRY_CLEANUP_INTERVAL_MS = 30000; // Requirement 5.3: Periodic cleanup every 30 seconds

  // State
  let currentConfig = null;
  let observer = null;
  let processingTimeout = null;
  let cleanupIntervalId = null;
  let pendingMutations = false;

  /**
   * Check if current URL matches Instagram pattern
   * @returns {boolean}
   */
  function isInstagramUrl() {
    return window.location.hostname === 'www.instagram.com' || window.location.hostname === 'instagram.com';
  }

  /**
   * Get configuration from background script
   * Requirement 6.5: Use default configuration as fallback
   * @returns {Promise<Object>}
   */
  async function getConfig() {
    try {
      const response = await browser.runtime.sendMessage({ action: 'getConfig' });
      if (response && response.config) {
        return response.config;
      } else {
        // Fallback to default
        return {
          instagram: {
            enabled: true,
            targetHostname: DEFAULT_TARGET_HOSTNAME
          }
        };
      }
    } catch (error) {
      console.error('[instagram-content] Error getting config:', error);
      return {
        instagram: {
          enabled: true,
          targetHostname: DEFAULT_TARGET_HOSTNAME
        }
      };
    }
  }

  /**
   * Get target hostname from config
   * @returns {string}
   */
  function getTargetHostname() {
    return currentConfig?.instagram?.targetHostname || DEFAULT_TARGET_HOSTNAME;
  }

  /**
   * Check if Instagram redirect is enabled
   * @returns {boolean}
   */
  function isEnabled() {
    return currentConfig?.instagram?.enabled !== false;
  }

  /**
   * Process a single post: extract URL, create button, and inject
   * Requirements: 2.1, 2.2, 2.5
   * @param {HTMLElement} postElement - The post container element
   */
  function processPost(postElement) {
    try {
      // Check if already processed (Requirement 2.5: idempotence)
      // Pass true to verify button actually exists in DOM (handles virtual scrolling)
      const alreadyProcessed = isPostProcessed(postElement, true);
      console.log('[instagram-content] Processing post, already processed:', alreadyProcessed);
      
      if (alreadyProcessed) {
        console.log('[instagram-content] Skipping post - already has button');
        return;
      }
      
      console.log('[instagram-content] Processing new post...');

      // Extract post URL (Requirement 2.3)
      const postUrl = extractPostUrl(postElement, PLATFORM);
      
      if (!postUrl) {
        console.warn('[instagram-content] Could not extract URL from post, skipping');
        markPostProcessed(postElement); // Mark to avoid retrying
        return;
      }

      // Create redirect button (Requirement 2.2)
      const targetHostname = getTargetHostname();
      const button = createPerPostButton(postUrl, targetHostname, PLATFORM);
      
      if (!button) {
        console.warn('[instagram-content] Could not create button for post, skipping');
        markPostProcessed(postElement);
        return;
      }

      // Find injection point
      const injectionPoint = findInjectionPoint(postElement, PLATFORM);
      
      if (!injectionPoint) {
        console.warn('[instagram-content] Could not find injection point for post, skipping');
        markPostProcessed(postElement);
        return;
      }

      // Inject button (Requirement 2.1)
      const injected = injectButton(button, injectionPoint, postElement, PLATFORM);
      
      if (injected) {
        markPostProcessed(postElement);
        console.log('[instagram-content] Successfully injected button into post');
      } else {
        console.warn('[instagram-content] Failed to inject button into post');
      }

    } catch (error) {
      console.error('[instagram-content] Error processing post:', error);
      // Mark as processed to avoid infinite retry loops
      try {
        markPostProcessed(postElement);
      } catch (e) {
        // Ignore marking errors
      }
    }
  }

  /**
   * Process all posts on the current page
   * Requirement 2.1: Inject buttons into all visible posts
   */
  function processAllPosts() {
    if (!isEnabled()) {
      console.log('[instagram-content] Instagram redirect is disabled');
      return;
    }

    try {
      // Find all post containers
      const posts = findPostContainers(PLATFORM);
      
      if (posts.length === 0) {
        console.log('[instagram-content] No posts found on page');
        return;
      }

      console.log(`[instagram-content] Found ${posts.length} posts to process`);

      // Process each post
      posts.forEach(post => processPost(post));

    } catch (error) {
      console.error('[instagram-content] Error processing posts:', error);
    }
  }

  /**
   * Handle new posts being added to the feed
   * Requirement 2.4: Handle dynamically loaded posts (infinite scroll)
   * Requirement 5.1: Throttle MutationObserver callbacks
   * @param {Array<MutationRecord>} mutations - DOM mutations
   */
  function handleMutations(mutations) {
    // Mark that we have pending mutations
    pendingMutations = true;

    // Clear any pending processing
    if (processingTimeout) {
      clearTimeout(processingTimeout);
    }

    // Throttle processing to avoid excessive calls (Requirement 5.1)
    processingTimeout = setTimeout(() => {
      if (!isEnabled() || !pendingMutations) {
        return;
      }

      // Reset pending flag
      pendingMutations = false;

      // Check if any new posts were added
      let hasNewPosts = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Optimize: Only check if added nodes contain articles (Requirement 5.3)
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'ARTICLE' || node.querySelector('article')) {
                hasNewPosts = true;
                break;
              }
            }
          }
          if (hasNewPosts) break;
        }
      }

      if (hasNewPosts) {
        console.log('[instagram-content] New content detected, processing posts');
        processAllPosts();
      }
    }, OBSERVER_THROTTLE_MS);
  }

  /**
   * Set up MutationObserver to detect dynamically loaded posts
   * Requirement 2.4: Inject buttons within 500ms of new posts loading
   * Requirement 5.3: Optimize selector queries
   */
  function setupObserver() {
    // Disconnect existing observer if any
    if (observer) {
      observer.disconnect();
    }

    // Create new observer
    observer = new MutationObserver(handleMutations);

    // Observe the main feed container (Requirement 5.3: Use specific selector)
    // Instagram uses a main element or body for the feed
    const feedElement = document.querySelector('main[role="main"]') || document.body;

    observer.observe(feedElement, {
      childList: true,
      subtree: true
    });

    console.log('[instagram-content] MutationObserver set up for dynamic content');
    
    // Start periodic registry cleanup (Requirement 5.3)
    if (cleanupIntervalId) {
      stopPeriodicCleanup(cleanupIntervalId);
    }
    cleanupIntervalId = startPeriodicCleanup(REGISTRY_CLEANUP_INTERVAL_MS);
  }

  /**
   * Handle configuration updates
   * Requirement 6.2: Update buttons when config changes
   */
  function handleConfigUpdate(newConfig) {
    console.log('[instagram-content] Configuration updated');
    
    const oldHostname = currentConfig?.instagram?.targetHostname;
    const newHostname = newConfig?.instagram?.targetHostname;
    
    currentConfig = newConfig;

    // If hostname changed or enabled status changed, reprocess all posts
    if (oldHostname !== newHostname || 
        currentConfig?.instagram?.enabled !== newConfig?.instagram?.enabled) {
      
      console.log('[instagram-content] Target hostname or enabled status changed, reprocessing posts');
      
      // Clear registry to allow reprocessing
      clearRegistry();
      
      // Remove all existing buttons
      const existingButtons = document.querySelectorAll('.social-redirector-per-post-button');
      existingButtons.forEach(button => {
        const wrapper = button.closest('.social-redirector-button-wrapper');
        if (wrapper) {
          wrapper.remove();
        } else {
          button.remove();
        }
      });
      
      // Remove injected attributes
      const processedPosts = document.querySelectorAll('[data-redirector-button-injected]');
      processedPosts.forEach(post => {
        post.removeAttribute('data-redirector-button-injected');
      });
      
      // Reprocess all posts
      if (isEnabled()) {
        processAllPosts();
      }
    }
  }

  /**
   * Initialize the content script
   */
  async function init() {
    // Check if we're on Instagram
    if (!isInstagramUrl()) {
      console.log('[instagram-content] Not on Instagram, exiting');
      return;
    }

    // Check if utility modules are loaded
    if (!findPostContainers || !extractPostUrl || !createPerPostButton || 
        !findInjectionPoint || !injectButton || !markPostProcessed || !isPostProcessed) {
      console.error('[instagram-content] Required utility modules not loaded');
      return;
    }

    console.log('[instagram-content] Initializing per-post redirect buttons');

    // Load configuration
    currentConfig = await getConfig();
    console.log('[instagram-content] Configuration loaded:', currentConfig);

    // Set up observer for dynamic content first (Requirement 2.4)
    setupObserver();

    // Process initial posts with retry logic for SPA
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const tryProcessPosts = () => {
      const posts = findPostContainers(PLATFORM);
      
      if (posts.length > 0) {
        console.log('[instagram-content] Found posts, processing...');
        processAllPosts();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[instagram-content] No posts found yet, retrying (${retryCount}/${maxRetries})...`);
        setTimeout(tryProcessPosts, retryDelay);
      } else {
        console.log('[instagram-content] No posts found after retries, observer will handle new content');
      }
    };

    // Start processing after initial delay
    setTimeout(tryProcessPosts, INITIAL_PROCESS_DELAY_MS);

    // Listen for configuration updates (Requirement 6.2)
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'configUpdated') {
        handleConfigUpdate(message.config);
      }
    });

    console.log('[instagram-content] Initialization complete');
  }

  // Initialize immediately - don't wait for DOMContentLoaded since we use document_end
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already ready, init immediately
    init();
  }

})();
