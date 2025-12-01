/**
 * Twitter/X Content Script - Per-Post Redirect Buttons
 * Injects individual redirect buttons into each tweet in the timeline
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
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
  const PLATFORM = 'twitter';
  const DEFAULT_TARGET_HOSTNAME = 'fixvx.com';
  const OBSERVER_THROTTLE_MS = 100; // Requirement 5.1: Throttle observer callbacks (reduced for faster re-injection)
  const INITIAL_PROCESS_DELAY_MS = 500;
  const REGISTRY_CLEANUP_INTERVAL_MS = 30000; // Requirement 5.3: Periodic cleanup every 30 seconds
  const RECHECK_INTERVAL_MS = 2000; // Periodic recheck for missing buttons

  // State
  let currentConfig = null;
  let observer = null;
  let processingTimeout = null;
  let cleanupIntervalId = null;
  let recheckIntervalId = null;
  let pendingMutations = false;

  /**
   * Check if current URL matches Twitter/X pattern
   * @returns {boolean}
   */
  function isTwitterUrl() {
    return window.location.hostname === 'x.com' || window.location.hostname === 'www.x.com';
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
          twitter: {
            enabled: true,
            targetHostname: DEFAULT_TARGET_HOSTNAME
          }
        };
      }
    } catch (error) {
      console.error('[twitter-content] Error getting config:', error);
      return {
        twitter: {
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
    return currentConfig?.twitter?.targetHostname || DEFAULT_TARGET_HOSTNAME;
  }

  /**
   * Check if Twitter redirect is enabled
   * @returns {boolean}
   */
  function isEnabled() {
    return currentConfig?.twitter?.enabled !== false;
  }

  /**
   * Process a single tweet: extract URL, create button, and inject
   * Requirements: 1.1, 1.2, 1.5
   * @param {HTMLElement} tweetElement - The tweet container element
   */
  function processTweet(tweetElement) {
    try {
      // Check if already processed (Requirement 1.5: idempotence)
      // Pass true to verify button actually exists in DOM (handles virtual scrolling)
      const alreadyProcessed = isPostProcessed(tweetElement, true);
      console.log('[twitter-content] Processing tweet, already processed:', alreadyProcessed);
      
      if (alreadyProcessed) {
        console.log('[twitter-content] Skipping tweet - already has button');
        return;
      }
      
      console.log('[twitter-content] Processing new tweet...');

      // Extract tweet URL (Requirement 1.3)
      const tweetUrl = extractPostUrl(tweetElement, PLATFORM);
      
      if (!tweetUrl) {
        console.warn('[twitter-content] Could not extract URL from tweet, skipping');
        markPostProcessed(tweetElement); // Mark to avoid retrying
        return;
      }

      // Create redirect button (Requirement 1.2)
      const targetHostname = getTargetHostname();
      const button = createPerPostButton(tweetUrl, targetHostname, PLATFORM);
      
      if (!button) {
        console.warn('[twitter-content] Could not create button for tweet, skipping');
        markPostProcessed(tweetElement);
        return;
      }

      // Find injection point
      const injectionPoint = findInjectionPoint(tweetElement, PLATFORM);
      
      if (!injectionPoint) {
        console.warn('[twitter-content] Could not find injection point for tweet, skipping');
        markPostProcessed(tweetElement);
        return;
      }

      // Inject button (Requirement 1.1)
      const injected = injectButton(button, injectionPoint, tweetElement, PLATFORM);
      
      if (injected) {
        markPostProcessed(tweetElement);
        console.log('[twitter-content] Successfully injected button into tweet');
      } else {
        console.warn('[twitter-content] Failed to inject button into tweet');
      }

    } catch (error) {
      console.error('[twitter-content] Error processing tweet:', error);
      // Mark as processed to avoid infinite retry loops
      try {
        markPostProcessed(tweetElement);
      } catch (e) {
        // Ignore marking errors
      }
    }
  }

  /**
   * Process all tweets on the current page
   * Requirement 1.1: Inject buttons into all visible tweets
   */
  function processAllTweets() {
    if (!isEnabled()) {
      console.log('[twitter-content] Twitter redirect is disabled');
      return;
    }

    try {
      // Find all tweet containers
      const tweets = findPostContainers(PLATFORM);
      
      if (tweets.length === 0) {
        console.log('[twitter-content] No tweets found on page');
        return;
      }

      console.log(`[twitter-content] Found ${tweets.length} tweets to process`);

      // Process each tweet
      tweets.forEach(tweet => processTweet(tweet));

    } catch (error) {
      console.error('[twitter-content] Error processing tweets:', error);
    }
  }

  /**
   * Handle new tweets being added to the timeline
   * Requirement 1.4: Handle dynamically loaded tweets (infinite scroll)
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

      // Check if any new tweets were added OR if existing tweets need buttons
      let hasNewTweets = false;
      let tweetsNeedingButtons = [];
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          // Optimize: Only check if added nodes contain articles (Requirement 5.3)
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'ARTICLE') {
                hasNewTweets = true;
                tweetsNeedingButtons.push(node);
              } else if (node.querySelector) {
                const articles = node.querySelectorAll('article');
                if (articles.length > 0) {
                  hasNewTweets = true;
                  tweetsNeedingButtons.push(...articles);
                }
              }
            }
          }
        }
      }

      if (hasNewTweets) {
        console.log('[twitter-content] New content detected, processing tweets');
        
        // Process the specific tweets that were added for faster injection
        if (tweetsNeedingButtons.length > 0) {
          console.log(`[twitter-content] Processing ${tweetsNeedingButtons.length} newly added tweets`);
          tweetsNeedingButtons.forEach(tweet => processTweet(tweet));
        } else {
          // Fallback to processing all tweets
          processAllTweets();
        }
      }
    }, OBSERVER_THROTTLE_MS);
  }

  /**
   * Periodic recheck to ensure all visible tweets have buttons
   * This catches tweets that were missed by the MutationObserver
   */
  function recheckVisibleTweets() {
    if (!isEnabled()) {
      return;
    }

    console.log('[twitter-content] Periodic recheck for missing buttons');
    processAllTweets();
  }

  /**
   * Set up MutationObserver to detect dynamically loaded tweets
   * Requirement 1.4: Inject buttons within 500ms of new tweets loading
   * Requirement 5.3: Optimize selector queries
   */
  function setupObserver() {
    // Disconnect existing observer if any
    if (observer) {
      observer.disconnect();
    }

    // Create new observer
    observer = new MutationObserver(handleMutations);

    // Observe the main timeline container (Requirement 5.3: Use specific selector)
    // Twitter/X uses a primary timeline element
    const timelineElement = document.querySelector('main[role="main"]') || document.body;

    observer.observe(timelineElement, {
      childList: true,
      subtree: true
    });

    console.log('[twitter-content] MutationObserver set up for dynamic content');
    
    // Start periodic registry cleanup (Requirement 5.3)
    if (cleanupIntervalId) {
      stopPeriodicCleanup(cleanupIntervalId);
    }
    cleanupIntervalId = startPeriodicCleanup(REGISTRY_CLEANUP_INTERVAL_MS);

    // Start periodic recheck for missing buttons (handles virtual scrolling edge cases)
    if (recheckIntervalId) {
      clearInterval(recheckIntervalId);
    }
    recheckIntervalId = setInterval(recheckVisibleTweets, RECHECK_INTERVAL_MS);
    console.log('[twitter-content] Periodic recheck started every', RECHECK_INTERVAL_MS, 'ms');
  }

  /**
   * Handle configuration updates
   * Requirement 6.1: Update buttons when config changes
   */
  function handleConfigUpdate(newConfig) {
    console.log('[twitter-content] Configuration updated');
    
    const oldHostname = currentConfig?.twitter?.targetHostname;
    const newHostname = newConfig?.twitter?.targetHostname;
    
    currentConfig = newConfig;

    // If hostname changed or enabled status changed, reprocess all tweets
    if (oldHostname !== newHostname || 
        currentConfig?.twitter?.enabled !== newConfig?.twitter?.enabled) {
      
      console.log('[twitter-content] Target hostname or enabled status changed, reprocessing tweets');
      
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
      
      // Reprocess all tweets
      if (isEnabled()) {
        processAllTweets();
      }
    }
  }

  /**
   * Initialize the content script
   */
  async function init() {
    // Check if we're on Twitter/X
    if (!isTwitterUrl()) {
      console.log('[twitter-content] Not on Twitter/X, exiting');
      return;
    }

    // Check if utility modules are loaded
    if (!findPostContainers || !extractPostUrl || !createPerPostButton || 
        !findInjectionPoint || !injectButton || !markPostProcessed || !isPostProcessed) {
      console.error('[twitter-content] Required utility modules not loaded');
      return;
    }

    console.log('[twitter-content] Initializing per-post redirect buttons');

    // Load configuration
    currentConfig = await getConfig();
    console.log('[twitter-content] Configuration loaded:', currentConfig);

    // Set up observer for dynamic content first (Requirement 1.4)
    setupObserver();

    // Process initial tweets with retry logic for SPA
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 500;

    const tryProcessTweets = () => {
      const tweets = findPostContainers(PLATFORM);
      
      if (tweets.length > 0) {
        console.log('[twitter-content] Found tweets, processing...');
        processAllTweets();
      } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[twitter-content] No tweets found yet, retrying (${retryCount}/${maxRetries})...`);
        setTimeout(tryProcessTweets, retryDelay);
      } else {
        console.log('[twitter-content] No tweets found after retries, observer will handle new content');
      }
    };

    // Start processing after initial delay
    setTimeout(tryProcessTweets, INITIAL_PROCESS_DELAY_MS);

    // Listen for configuration updates (Requirement 6.1)
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === 'configUpdated') {
        handleConfigUpdate(message.config);
      }
    });

    console.log('[twitter-content] Initialization complete');
  }

  // Initialize immediately - don't wait for DOMContentLoaded since we use document_end
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM is already ready, init immediately
    init();
  }

})();
