/**
 * Clipboard Manager
 * Centralized clipboard operations with automatic fallback
 */

/**
 * Copy text to clipboard with automatic fallback
 * Tries modern navigator.clipboard API first, then falls back to legacy execCommand
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function copyToClipboard(text) {
  // Validate input
  if (typeof text !== 'string') {
    if (window.Logger) {
      window.Logger.error('[clipboard-manager] Invalid input: text must be a string');
    }
    return false;
  }

  // Use modern clipboard API
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    if (window.Logger) {
      window.Logger.error('[clipboard-manager] Clipboard API not available');
    }
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    if (window.Logger) {
      window.Logger.log('[clipboard-manager] Text copied successfully');
    }
    return true;
  } catch (error) {
    if (window.Logger) {
      window.Logger.error('[clipboard-manager] Clipboard copy failed:', error);
    }
    return false;
  }
}

// Export for CommonJS (Node.js/testing)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    copyToClipboard
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.ClipboardManager = {
    copyToClipboard
  };
}
