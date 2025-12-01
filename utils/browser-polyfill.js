/**
 * Cross-Browser Compatibility Layer
 * Provides a unified browser API that works consistently across Chrome and Firefox
 * 
 * This module wraps the webextension-polyfill library to ensure all browser API
 * calls use Promises and work identically in both Chrome and Firefox.
 */

// Import the webextension-polyfill library
// This converts Chrome's callback-based APIs to Promise-based APIs
// and provides a consistent 'browser' namespace
if (typeof browser === 'undefined') {
  // Chrome environment - needs polyfill
  if (typeof chrome !== 'undefined') {
    // In extension context, use the polyfill
    try {
      // Try to import from node_modules (for bundled builds)
      var browser = require('webextension-polyfill');
    } catch (e) {
      // Fallback: create a simple wrapper for Chrome's API
      var browser = {
        runtime: {
          sendMessage: (...args) => {
            return new Promise((resolve) => {
              chrome.runtime.sendMessage(...args, resolve);
            });
          },
          onMessage: chrome.runtime.onMessage,
          onInstalled: chrome.runtime.onInstalled
        },
        storage: {
          sync: {
            get: (keys) => {
              return new Promise((resolve) => {
                chrome.storage.sync.get(keys, resolve);
              });
            },
            set: (items) => {
              return new Promise((resolve) => {
                chrome.storage.sync.set(items, resolve);
              });
            },
            remove: (keys) => {
              return new Promise((resolve) => {
                chrome.storage.sync.remove(keys, resolve);
              });
            }
          }
        }
      };
    }
  }
}

/**
 * Get the browser API object
 * @returns {Object} Browser API object with Promise-based methods
 */
function getBrowserAPI() {
  return browser;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { browser, getBrowserAPI };
}
