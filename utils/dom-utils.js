/**
 * Shared DOM manipulation utilities for Social Media Redirector
 * Requirements: 5.1, 5.2, 5.3
 */

/**
 * Check if an element with the given ID exists in the DOM
 * @param {string} elementId - The ID to check
 * @returns {boolean} True if element exists
 */
function elementExists(elementId) {
  return document.getElementById(elementId) !== null;
}

/**
 * Remove an element from the DOM by ID
 * @param {string} elementId - The ID of the element to remove
 * @returns {boolean} True if element was removed
 */
function removeElement(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.remove();
    return true;
  }
  return false;
}

/**
 * Create a redirect button element with shared styling
 * Requirements: 5.1, 5.2, 5.3, 5.4
 * @param {Object} options - Button configuration
 * @param {string} options.id - Button element ID
 * @param {string} options.platform - Platform name ('twitter' or 'instagram')
 * @param {string} options.targetHostname - Target hostname for redirect
 * @param {Function} options.onClick - Click handler function
 * @returns {HTMLElement} The created button element
 */
function createRedirectButton(options) {
  const { id, platform, targetHostname, onClick } = options;
  
  const button = document.createElement('button');
  button.id = id;
  button.className = `social-redirector-button ${platform}`;
  button.textContent = '🔄 View on Alternative';
  button.title = `Redirect to ${targetHostname || 'alternative hostname'}`;
  
  // Add click handler
  if (onClick) {
    button.addEventListener('click', onClick);
  }
  
  return button;
}

/**
 * Inject a button into the page body
 * Requirements: 5.3
 * @param {HTMLElement} button - The button element to inject
 * @returns {boolean} True if injection was successful
 */
function injectButton(button) {
  if (!button || !document.body) {
    return false;
  }
  
  try {
    document.body.appendChild(button);
    return true;
  } catch (error) {
    console.error('Failed to inject button:', error);
    return false;
  }
}

/**
 * Set up a MutationObserver to detect URL changes in SPAs
 * Requirements: 5.5
 * @param {Function} callback - Function to call when URL changes
 * @returns {MutationObserver} The created observer
 */
function observeUrlChanges(callback) {
  let lastUrl = window.location.href;
  
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (lastUrl !== currentUrl) {
      lastUrl = currentUrl;
      if (callback) {
        callback(currentUrl);
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

/**
 * Wait for DOM to be ready
 * @param {Function} callback - Function to call when DOM is ready
 */
function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

// Export functions for use in content scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    elementExists,
    removeElement,
    createRedirectButton,
    injectButton,
    observeUrlChanges,
    onDomReady
  };
}
