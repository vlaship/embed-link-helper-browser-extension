/**
 * URL Transformation Module
 * Handles URL parsing, hostname replacement, and validation
 */

/**
 * Validate a hostname string
 * Ensures hostname doesn't contain protocol, paths, or invalid characters
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
 * Parse a URL into its components
 * @param {string} urlString - The URL to parse
 * @returns {Object|null} Object containing URL components or null if invalid
 */
function parseUrl(urlString) {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      port: url.port
    };
  } catch (error) {
    console.error('Invalid URL:', urlString, error);
    return null;
  }
}

/**
 * Transform a URL by replacing its hostname while preserving all other components
 * @param {string} originalUrl - The original URL to transform
 * @param {string} targetHostname - The new hostname to use
 * @returns {string|null} The transformed URL or null if transformation fails
 */
function transformUrl(originalUrl, targetHostname) {
  // Validate target hostname
  if (!validateHostname(targetHostname)) {
    console.error('Invalid target hostname:', targetHostname);
    return null;
  }

  // Parse the original URL
  const urlComponents = parseUrl(originalUrl);
  if (!urlComponents) {
    return null;
  }

  // Reconstruct URL with new hostname, preserving all other components
  let transformedUrl = `${urlComponents.protocol}//${targetHostname}`;
  
  // Add port if present
  if (urlComponents.port) {
    transformedUrl += `:${urlComponents.port}`;
  }
  
  // Add pathname (always present, defaults to '/')
  transformedUrl += urlComponents.pathname;
  
  // Add search/query parameters if present
  if (urlComponents.search) {
    transformedUrl += urlComponents.search;
  }
  
  // Add hash fragment if present
  if (urlComponents.hash) {
    transformedUrl += urlComponents.hash;
  }

  return transformedUrl;
}

/**
 * Check if a URL matches Twitter/X pattern
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if URL matches Twitter/X pattern
 */
function isTwitterUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname === 'x.com' || url.hostname === 'www.x.com';
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL matches Instagram pattern
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if URL matches Instagram pattern
 */
function isInstagramUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname === 'www.instagram.com' || url.hostname === 'instagram.com';
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL should trigger redirect button injection
 * @param {string} urlString - The URL to check
 * @returns {boolean} True if URL matches supported patterns
 */
function shouldInjectButton(urlString) {
  return isTwitterUrl(urlString) || isInstagramUrl(urlString);
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  // Node.js/CommonJS environment (for testing)
  module.exports = {
    validateHostname,
    parseUrl,
    transformUrl,
    isTwitterUrl,
    isInstagramUrl,
    shouldInjectButton
  };
}

// Expose to window for browser extension content scripts
if (typeof window !== 'undefined') {
  window.UrlTransformer = {
    validateHostname,
    parseUrl,
    transformUrl,
    isTwitterUrl,
    isInstagramUrl,
    shouldInjectButton
  };
}
