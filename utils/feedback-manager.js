/**
 * Feedback Manager Module
 * Manages visual feedback for user actions in share menus
 */

/**
 * Show success feedback
 * @param {HTMLElement} menuItem - The menu item that was clicked
 * @param {string} platform - 'twitter' or 'instagram'
 */
function showSuccessFeedback(menuItem, platform) {
  if (!menuItem) return;

  // Create or update feedback element
  let feedbackElement = menuItem.querySelector('.embed-link-feedback');
  
  if (!feedbackElement) {
    feedbackElement = document.createElement('span');
    feedbackElement.className = 'embed-link-feedback';
    menuItem.appendChild(feedbackElement);
  }

  // Set success message and styling
  feedbackElement.textContent = '✓ Copied!';
  feedbackElement.style.cssText = `
    margin-left: 8px;
    color: #00ba7c;
    font-size: 14px;
    font-weight: 500;
    display: inline-block;
    animation: fadeIn 0.2s ease-in;
  `;

  // Platform-specific adjustments
  if (platform === 'twitter') {
    feedbackElement.style.color = '#00ba7c';
  } else if (platform === 'instagram') {
    feedbackElement.style.color = '#0095f6';
  }

  // Add fade-in animation if not already present
  if (!document.getElementById('embed-link-feedback-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'embed-link-feedback-styles';
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-5px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

/**
 * Show error feedback
 * @param {HTMLElement} menuItem - The menu item that was clicked
 * @param {string} message - Error message to display
 * @param {string} platform - 'twitter' or 'instagram'
 */
function showErrorFeedback(menuItem, message, platform) {
  if (!menuItem) return;

  // Create or update feedback element
  let feedbackElement = menuItem.querySelector('.embed-link-feedback');
  
  if (!feedbackElement) {
    feedbackElement = document.createElement('span');
    feedbackElement.className = 'embed-link-feedback';
    menuItem.appendChild(feedbackElement);
  }

  // Set error message and styling
  feedbackElement.textContent = `✗ ${message || 'Failed'}`;
  feedbackElement.style.cssText = `
    margin-left: 8px;
    color: #f91880;
    font-size: 14px;
    font-weight: 500;
    display: inline-block;
    animation: fadeIn 0.2s ease-in;
  `;

  // Platform-specific adjustments
  if (platform === 'twitter') {
    feedbackElement.style.color = '#f91880';
  } else if (platform === 'instagram') {
    feedbackElement.style.color = '#ed4956';
  }

  // Add fade-in animation if not already present
  if (!document.getElementById('embed-link-feedback-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'embed-link-feedback-styles';
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-5px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

/**
 * Hide feedback after delay
 * @param {HTMLElement} menuItem - The menu item element
 * @param {number} delay - Delay in milliseconds (default: 2000)
 * @returns {number} Timeout ID
 */
function hideFeedbackAfterDelay(menuItem, delay = 2000) {
  if (!menuItem) return null;

  const timeoutId = setTimeout(() => {
    const feedbackElement = menuItem.querySelector('.embed-link-feedback');
    if (feedbackElement) {
      // Fade out animation
      feedbackElement.style.animation = 'fadeOut 0.2s ease-out';
      
      // Remove after animation completes
      setTimeout(() => {
        if (feedbackElement.parentNode) {
          feedbackElement.remove();
        }
      }, 200);
    }
  }, delay);

  return timeoutId;
}

// Export functions for use in content scripts and tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showSuccessFeedback,
    showErrorFeedback,
    hideFeedbackAfterDelay
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.FeedbackManager = {
    showSuccessFeedback,
    showErrorFeedback,
    hideFeedbackAfterDelay
  };
}
