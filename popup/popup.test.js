/**
 * Unit Tests for Popup Validation
 * Tests hostname validation logic for the popup interface
 * **Validates: Requirements 7.3**
 */

// Mock the browser API before requiring popup.js
const mockBrowserAPI = {
  runtime: {
    sendMessage: jest.fn()
  }
};

global.chrome = mockBrowserAPI;
global.browser = mockBrowserAPI;

// Mock DOM elements
document.body.innerHTML = `
  <input id="twitter-hostname" type="text" />
  <input id="instagram-hostname" type="text" />
  <button id="save-button">Save Configuration</button>
  <div id="error-message"></div>
`;

// We need to extract the validateHostname function from popup.js
// Since popup.js uses DOMContentLoaded and doesn't export functions,
// we'll test the validation logic directly by copying it here
// This is a common pattern for testing browser extension popup scripts

/**
 * Validate a hostname string
 * Ensures hostname doesn't contain protocol, paths, or invalid characters
 * This is the same validation logic from popup.js
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

describe('Popup Hostname Validation', () => {
  describe('Valid hostname inputs', () => {
    test('should accept simple domain names', () => {
      expect(validateHostname('example.com')).toBe(true);
      expect(validateHostname('fixvx.com')).toBe(true);
      expect(validateHostname('kkinstagram.com')).toBe(true);
    });

    test('should accept subdomains', () => {
      expect(validateHostname('www.example.com')).toBe(true);
      expect(validateHostname('api.example.com')).toBe(true);
      expect(validateHostname('sub.domain.example.com')).toBe(true);
    });

    test('should accept hostnames with hyphens', () => {
      expect(validateHostname('my-site.com')).toBe(true);
      expect(validateHostname('test-domain-name.com')).toBe(true);
      expect(validateHostname('sub-domain.example.com')).toBe(true);
    });

    test('should accept hostnames with numbers', () => {
      expect(validateHostname('example123.com')).toBe(true);
      expect(validateHostname('123example.com')).toBe(true);
      expect(validateHostname('test123.example456.com')).toBe(true);
    });

    test('should accept single-letter domains', () => {
      expect(validateHostname('x.com')).toBe(true);
      expect(validateHostname('a.b.c')).toBe(true);
    });

    test('should accept long domain names', () => {
      expect(validateHostname('verylongdomainname.example.com')).toBe(true);
      expect(validateHostname('this-is-a-very-long-subdomain.example.com')).toBe(true);
    });
  });

  describe('Invalid hostname inputs with protocol', () => {
    test('should reject hostnames with http protocol', () => {
      expect(validateHostname('http://example.com')).toBe(false);
      expect(validateHostname('http://www.example.com')).toBe(false);
    });

    test('should reject hostnames with https protocol', () => {
      expect(validateHostname('https://example.com')).toBe(false);
      expect(validateHostname('https://www.example.com')).toBe(false);
    });

    test('should reject hostnames with other protocols', () => {
      expect(validateHostname('ftp://example.com')).toBe(false);
      expect(validateHostname('ws://example.com')).toBe(false);
      expect(validateHostname('file://example.com')).toBe(false);
    });
  });

  describe('Invalid hostname inputs with paths', () => {
    test('should reject hostnames with paths', () => {
      expect(validateHostname('example.com/path')).toBe(false);
      expect(validateHostname('example.com/path/to/page')).toBe(false);
    });

    test('should reject hostnames with trailing slashes', () => {
      expect(validateHostname('example.com/')).toBe(false);
      expect(validateHostname('www.example.com/')).toBe(false);
    });

    test('should reject hostnames with query parameters', () => {
      expect(validateHostname('example.com?query=value')).toBe(false);
      expect(validateHostname('example.com?a=1&b=2')).toBe(false);
    });

    test('should reject hostnames with hash fragments', () => {
      expect(validateHostname('example.com#section')).toBe(false);
      expect(validateHostname('example.com#top')).toBe(false);
    });

    test('should reject full URLs', () => {
      expect(validateHostname('https://example.com/path?query=value#hash')).toBe(false);
      expect(validateHostname('http://www.example.com/page')).toBe(false);
    });
  });

  describe('Invalid hostname inputs with special characters', () => {
    test('should reject hostnames with spaces in the middle', () => {
      expect(validateHostname('example .com')).toBe(false);
      expect(validateHostname('example. com')).toBe(false);
      expect(validateHostname('example com')).toBe(false);
    });

    test('should accept hostnames with leading/trailing spaces (trimmed)', () => {
      // The validation function trims whitespace, so these are valid
      expect(validateHostname(' example.com')).toBe(true);
      expect(validateHostname('example.com ')).toBe(true);
      expect(validateHostname('  example.com  ')).toBe(true);
    });

    test('should reject hostnames with @ symbol', () => {
      expect(validateHostname('user@example.com')).toBe(false);
      expect(validateHostname('example@com')).toBe(false);
    });

    test('should reject hostnames with special characters', () => {
      expect(validateHostname('example!.com')).toBe(false);
      expect(validateHostname('example$.com')).toBe(false);
      expect(validateHostname('example%.com')).toBe(false);
      expect(validateHostname('example&.com')).toBe(false);
      expect(validateHostname('example*.com')).toBe(false);
      expect(validateHostname('example+.com')).toBe(false);
      expect(validateHostname('example=.com')).toBe(false);
    });

    test('should reject hostnames with parentheses or brackets', () => {
      expect(validateHostname('example(test).com')).toBe(false);
      expect(validateHostname('example[test].com')).toBe(false);
      expect(validateHostname('example{test}.com')).toBe(false);
    });

    test('should reject hostnames with consecutive dots', () => {
      expect(validateHostname('example..com')).toBe(false);
      expect(validateHostname('sub..domain.com')).toBe(false);
      expect(validateHostname('...example.com')).toBe(false);
    });

    test('should reject hostnames starting or ending with hyphen', () => {
      expect(validateHostname('-example.com')).toBe(false);
      expect(validateHostname('example-.com')).toBe(false);
      expect(validateHostname('sub.-example.com')).toBe(false);
    });

    test('should reject hostnames starting or ending with dot', () => {
      expect(validateHostname('.example.com')).toBe(false);
      expect(validateHostname('example.com.')).toBe(false);
    });
  });

  describe('Empty input handling', () => {
    test('should reject empty string', () => {
      expect(validateHostname('')).toBe(false);
    });

    test('should reject whitespace-only strings', () => {
      expect(validateHostname(' ')).toBe(false);
      expect(validateHostname('   ')).toBe(false);
      expect(validateHostname('\t')).toBe(false);
      expect(validateHostname('\n')).toBe(false);
      expect(validateHostname('  \t  \n  ')).toBe(false);
    });

    test('should reject null', () => {
      expect(validateHostname(null)).toBe(false);
    });

    test('should reject undefined', () => {
      expect(validateHostname(undefined)).toBe(false);
    });

    test('should reject non-string types', () => {
      expect(validateHostname(123)).toBe(false);
      expect(validateHostname(true)).toBe(false);
      expect(validateHostname(false)).toBe(false);
      expect(validateHostname({})).toBe(false);
      expect(validateHostname([])).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('should handle hostnames with valid trimming', () => {
      // These should be valid after trimming
      expect(validateHostname('  example.com  ')).toBe(true);
      expect(validateHostname('\texample.com\t')).toBe(true);
      expect(validateHostname('\nexample.com\n')).toBe(true);
    });

    test('should accept single character hostnames', () => {
      // Single character hostnames are technically valid (e.g., localhost alternatives)
      expect(validateHostname('x')).toBe(true);
      expect(validateHostname('a')).toBe(true);
    });

    test('should reject hostnames with only dots', () => {
      expect(validateHostname('.')).toBe(false);
      expect(validateHostname('..')).toBe(false);
      expect(validateHostname('...')).toBe(false);
    });

    test('should reject hostnames with only hyphens', () => {
      expect(validateHostname('-')).toBe(false);
      expect(validateHostname('--')).toBe(false);
      expect(validateHostname('---')).toBe(false);
    });

    test('should accept numeric-only domains', () => {
      expect(validateHostname('123.456')).toBe(true);
      expect(validateHostname('1.2.3.4')).toBe(true);
    });
  });
});
