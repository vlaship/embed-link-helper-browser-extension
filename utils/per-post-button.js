/**
 * Per-Post Button Component
 * Creates and manages redirect buttons for individual posts
 * Requirements: 3.5, 1.2, 2.2
 */

/**
 * Platform-specific button configurations
 */
const BUTTON_CONFIG = {
  twitter: {
    icon: '📋',
    text: 'Copy Link',
    ariaLabel: 'Copy alternative link to clipboard',
    className: 'social-redirector-per-post-button twitter-button'
  },
  instagram: {
    icon: '📋',
    text: 'Copy Link',
    ariaLabel: 'Copy alternative link to clipboard',
    className: 'social-redirector-per-post-button instagram-button'
  }
};

/**
 * Create a per-post redirect button
 * @param {string} postUrl - The URL of the specific post
 * @param {string} targetHostname - The target hostname to redirect to
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The created button element or null if invalid parameters
 */
function createPerPostButton(postUrl, targetHostname, platform) {
  // Validate parameters
  if (!postUrl || typeof postUrl !== 'string') {
    console.error('[per-post-button] Invalid postUrl:', postUrl);
    return null;
  }

  if (!targetHostname || typeof targetHostname !== 'string') {
    console.error('[per-post-button] Invalid targetHostname:', targetHostname);
    return null;
  }

  if (!platform || !BUTTON_CONFIG[platform]) {
    console.error('[per-post-button] Invalid platform:', platform);
    return null;
  }

  const config = BUTTON_CONFIG[platform];

  // Create button element
  const button = document.createElement('button');
  button.className = config.className;
  button.setAttribute('aria-label', config.ariaLabel);
  button.setAttribute('type', 'button');
  button.setAttribute('data-post-url', postUrl);
  button.setAttribute('data-platform', platform);

  // Add icon and text content (Requirement 3.5)
  const iconSpan = document.createElement('span');
  iconSpan.className = 'button-icon';
  iconSpan.textContent = config.icon;
  iconSpan.setAttribute('aria-hidden', 'true');

  const textSpan = document.createElement('span');
  textSpan.className = 'button-text';
  textSpan.textContent = config.text;

  button.appendChild(iconSpan);
  button.appendChild(textSpan);

  // Apply platform-specific styles
  applyPlatformStyles(button, platform);

  // Attach click handler
  button.addEventListener('click', (event) => {
    handleButtonClick(event, postUrl, targetHostname, platform);
  });

  return button;
}

/**
 * Apply platform-specific inline styles to button
 * @param {HTMLElement} button - The button element
 * @param {string} platform - 'twitter' or 'instagram'
 */
function applyPlatformStyles(button, platform) {
  // Base styles for all buttons
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    border: 'none',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    lineHeight: '1',
    whiteSpace: 'nowrap'
  };

  // Platform-specific styles (Requirements 3.1, 3.2)
  const platformStyles = {
    twitter: {
      backgroundColor: 'rgba(29, 155, 240, 0.1)',
      color: 'rgb(29, 155, 240)',
      ':hover': {
        backgroundColor: 'rgba(29, 155, 240, 0.2)'
      }
    },
    instagram: {
      backgroundColor: 'rgba(219, 39, 119, 0.1)',
      color: 'rgb(219, 39, 119)',
      ':hover': {
        backgroundColor: 'rgba(219, 39, 119, 0.2)'
      }
    }
  };

  const styles = { ...baseStyles, ...platformStyles[platform] };

  // Apply base styles
  Object.keys(styles).forEach(property => {
    if (property !== ':hover' && typeof styles[property] === 'string') {
      button.style[property] = styles[property];
    }
  });

  // Add hover effect (Requirement 3.3)
  button.addEventListener('mouseenter', () => {
    if (platformStyles[platform][':hover']) {
      button.style.backgroundColor = platformStyles[platform][':hover'].backgroundColor;
    }
  });

  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = platformStyles[platform].backgroundColor;
  });
}

/**
 * Handle button click event
 * @param {Event} event - The click event
 * @param {string} postUrl - The original post URL
 * @param {string} targetHostname - The target hostname
 * @param {string} platform - The platform name
 */
function handleButtonClick(event, postUrl, targetHostname, platform) {
  // Prevent event bubbling to avoid triggering post click handlers
  event.stopPropagation();
  event.preventDefault();

  try {
    // Transform the URL
    const transformedUrl = transformPostUrl(postUrl, targetHostname);

    if (!transformedUrl) {
      console.error('[per-post-button] Failed to transform URL:', postUrl);
      showFeedback(event.target, '❌ Error', false);
      return;
    }

    console.log(`[per-post-button] Copying to clipboard: ${transformedUrl}`);

    // Copy to clipboard instead of navigating
    copyToClipboard(transformedUrl, event.target);
  } catch (error) {
    console.error('[per-post-button] Error handling button click:', error);
    showFeedback(event.target, '❌ Error', false);
  }
}

/**
 * Copy text to clipboard
 * @param {string} text - The text to copy
 * @param {HTMLElement} button - The button element for feedback
 */
async function copyToClipboard(text, button) {
  try {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showFeedback(button, '✓ Copied!', true);
    } else {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        showFeedback(button, '✓ Copied!', true);
      } else {
        showFeedback(button, '❌ Failed', false);
      }
    }
  } catch (error) {
    console.error('[per-post-button] Failed to copy to clipboard:', error);
    showFeedback(button, '❌ Failed', false);
  }
}

/**
 * Show temporary feedback on button
 * @param {HTMLElement} button - The button element
 * @param {string} message - The feedback message
 * @param {boolean} success - Whether the operation was successful
 */
function showFeedback(button, message, success) {
  const textSpan = button.querySelector('.button-text');
  if (!textSpan) return;
  
  const originalText = textSpan.textContent;
  textSpan.textContent = message;
  
  // Change button style temporarily
  const originalBg = button.style.backgroundColor;
  if (success) {
    button.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
  } else {
    button.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
  }
  
  // Reset after 2 seconds
  setTimeout(() => {
    textSpan.textContent = originalText;
    button.style.backgroundColor = originalBg;
  }, 2000);
}

/**
 * Transform post URL to target hostname
 * @param {string} postUrl - The original post URL
 * @param {string} targetHostname - The target hostname
 * @returns {string|null} The transformed URL or null if transformation fails
 */
function transformPostUrl(postUrl, targetHostname) {
  try {
    const url = new URL(postUrl);
    
    // Reconstruct URL with new hostname, preserving path, query, and hash
    let transformedUrl = `${url.protocol}//${targetHostname}`;
    
    if (url.port) {
      transformedUrl += `:${url.port}`;
    }
    
    transformedUrl += url.pathname;
    
    if (url.search) {
      transformedUrl += url.search;
    }
    
    if (url.hash) {
      transformedUrl += url.hash;
    }

    return transformedUrl;
  } catch (error) {
    console.error('[per-post-button] Invalid URL:', postUrl, error);
    return null;
  }
}

/**
 * Update button's target hostname
 * @param {HTMLElement} button - The button element to update
 * @param {string} newTargetHostname - The new target hostname
 * @returns {boolean} True if update successful
 */
function updateButtonTarget(button, newTargetHostname) {
  if (!button || !newTargetHostname) {
    return false;
  }

  const postUrl = button.getAttribute('data-post-url');
  const platform = button.getAttribute('data-platform');

  if (!postUrl || !platform) {
    return false;
  }

  // Remove old click handler by cloning the button
  const newButton = button.cloneNode(true);
  
  // Add new click handler with updated target
  newButton.addEventListener('click', (event) => {
    handleButtonClick(event, postUrl, newTargetHostname, platform);
  });

  // Replace old button with new one
  if (button.parentNode) {
    button.parentNode.replaceChild(newButton, button);
    return true;
  }

  return false;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPerPostButton,
    applyPlatformStyles,
    transformPostUrl,
    updateButtonTarget,
    copyToClipboard,
    showFeedback,
    BUTTON_CONFIG
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.PerPostButton = {
    createPerPostButton,
    applyPlatformStyles,
    transformPostUrl,
    updateButtonTarget,
    copyToClipboard,
    showFeedback,
    BUTTON_CONFIG
  };
}
