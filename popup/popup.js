// Popup script for Social Media Redirector extension
// Handles configuration UI and user interactions
// Note: browser-polyfill.js is loaded before this script in popup.html

// DOM elements
let twitterInput;
let instagramInput;
let saveButton;
let errorMessage;

/**
 * Initialize popup when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  twitterInput = document.getElementById('twitter-hostname');
  instagramInput = document.getElementById('instagram-hostname');
  saveButton = document.getElementById('save-button');
  errorMessage = document.getElementById('error-message');

  // Load current configuration
  await loadCurrentConfig();

  // Set up event listeners
  saveButton.addEventListener('click', saveConfiguration);

  // Allow saving with Enter key
  twitterInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveConfiguration();
    }
  });

  instagramInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveConfiguration();
    }
  });

  // Clear error message when user starts typing
  twitterInput.addEventListener('input', () => {
    displayError('');
  });

  instagramInput.addEventListener('input', () => {
    displayError('');
  });
});

/**
 * Load current configuration from storage and display in UI
 * Implements requirement 3.4: Display currently configured Target Hostnames
 */
async function loadCurrentConfig() {
  try {
    // Request config from background script
    const response = await browser.runtime.sendMessage({ action: 'getConfig' });

    if (response && response.success && response.config) {
      const config = response.config;

      // Populate input fields with current values
      if (config.twitter && config.twitter.targetHostname) {
        twitterInput.value = config.twitter.targetHostname;
      }

      if (config.instagram && config.instagram.targetHostname) {
        instagramInput.value = config.instagram.targetHostname;
      }
    } else {
      // If no config, leave placeholders visible
      console.log('No configuration found, using defaults');
    }
  } catch (error) {
    console.error('Error loading configuration:', error);
    displayError('Failed to load configuration. Please try again.');
  }
}

/**
 * Validate a hostname string
 * Ensures hostname doesn't contain protocol, paths, or invalid characters
 * Implements requirement 7.3: Validate hostname input
 * @param {string} hostname - The hostname to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }

  // Trim whitespace
  hostname = hostname.trim();

  // Check if empty after trimming
  if (hostname.length === 0) {
    return false;
  }

  // Check for protocol (http://, https://, etc.)
  if (hostname.includes('://')) {
    return false;
  }

  // Check for path separators
  if (hostname.includes('/')) {
    return false;
  }

  // Check for invalid characters (spaces, special chars except dots and hyphens)
  const validHostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
  if (!validHostnameRegex.test(hostname)) {
    return false;
  }

  // Check for consecutive dots
  if (hostname.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Save configuration with validation
 * Implements requirements 3.3: Persist new hostname values
 * Implements requirement 7.3: Validate before saving
 */
async function saveConfiguration() {
  try {
    // Get input values and trim whitespace
    const twitterHostname = twitterInput.value.trim();
    const instagramHostname = instagramInput.value.trim();

    // Validate Twitter hostname
    if (!validateHostname(twitterHostname)) {
      displayError('Invalid Twitter/X hostname. Please enter a valid hostname without protocol or paths.');
      return;
    }

    // Validate Instagram hostname
    if (!validateHostname(instagramHostname)) {
      displayError('Invalid Instagram hostname. Please enter a valid hostname without protocol or paths.');
      return;
    }

    // Create configuration object
    const config = {
      twitter: {
        enabled: true,
        targetHostname: twitterHostname
      },
      instagram: {
        enabled: true,
        targetHostname: instagramHostname
      }
    };

    // Send save request to background script
    const response = await browser.runtime.sendMessage({
      action: 'saveConfig',
      data: config
    });

    if (response && response.success) {
      // Show success feedback
      displayError(''); // Clear any errors
      saveButton.textContent = 'Saved!';
      saveButton.style.backgroundColor = '#4CAF50';

      // Reset button after 2 seconds
      setTimeout(() => {
        saveButton.textContent = 'Save Configuration';
        saveButton.style.backgroundColor = '';
      }, 2000);
    } else {
      displayError(response?.error || 'Failed to save configuration. Please try again.');
    }
  } catch (error) {
    console.error('Error saving configuration:', error);
    displayError('Failed to save configuration. Please try again.');
  }
}

/**
 * Display error message in the UI
 * Implements requirement: Add error message display functionality
 * @param {string} message - Error message to display
 */
function displayError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
  }
}
