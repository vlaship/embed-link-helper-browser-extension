/**
 * URL Transformer Tests
 * Unit tests and property-based tests for URL transformation functionality
 */

const fc = require('fast-check');
const {
  validateHostname,
  parseUrl,
  transformUrl,
  isTwitterUrl,
  isInstagramUrl,
  shouldInjectButton
} = require('./url-transformer');

describe('URL Transformer', () => {
  
  // ============================================================================
  // UNIT TESTS
  // ============================================================================
  
  describe('Unit Tests', () => {
    
    describe('validateHostname', () => {
      test('accepts valid simple hostname', () => {
        expect(validateHostname('example.com')).toBe(true);
      });

      test('accepts valid subdomain hostname', () => {
        expect(validateHostname('sub.example.com')).toBe(true);
      });

      test('accepts valid hostname with hyphens', () => {
        expect(validateHostname('my-site.co.uk')).toBe(true);
      });

      test('accepts valid hostname with numbers', () => {
        expect(validateHostname('test123.org')).toBe(true);
      });

      test('rejects hostname with protocol', () => {
        expect(validateHostname('https://example.com')).toBe(false);
      });

      test('rejects hostname with path', () => {
        expect(validateHostname('example.com/path')).toBe(false);
      });

      test('rejects hostname with consecutive dots', () => {
        expect(validateHostname('example..com')).toBe(false);
      });

      test('rejects empty string', () => {
        expect(validateHostname('')).toBe(false);
      });

      test('rejects hostname with spaces', () => {
        expect(validateHostname('example .com')).toBe(false);
      });

      test('rejects null input', () => {
        expect(validateHostname(null)).toBe(false);
      });

      test('rejects undefined input', () => {
        expect(validateHostname(undefined)).toBe(false);
      });

      test('rejects hostname with leading hyphen', () => {
        expect(validateHostname('-example.com')).toBe(false);
      });

      test('rejects hostname with trailing hyphen', () => {
        expect(validateHostname('example-.com')).toBe(false);
      });
    });

    describe('parseUrl', () => {
      test('parses simple URL correctly', () => {
        const result = parseUrl('https://example.com/path');
        expect(result).toEqual({
          protocol: 'https:',
          hostname: 'example.com',
          pathname: '/path',
          search: '',
          hash: '',
          port: ''
        });
      });

      test('parses URL with query parameters', () => {
        const result = parseUrl('https://example.com/path?foo=bar&baz=qux');
        expect(result.search).toBe('?foo=bar&baz=qux');
      });

      test('parses URL with hash fragment', () => {
        const result = parseUrl('https://example.com/path#section');
        expect(result.hash).toBe('#section');
      });

      test('parses URL with port', () => {
        const result = parseUrl('https://example.com:8080/path');
        expect(result.port).toBe('8080');
      });

      test('parses URL with all components', () => {
        const result = parseUrl('https://example.com:8080/path?query=1#hash');
        expect(result).toEqual({
          protocol: 'https:',
          hostname: 'example.com',
          pathname: '/path',
          search: '?query=1',
          hash: '#hash',
          port: '8080'
        });
      });

      test('returns null for malformed URL', () => {
        expect(parseUrl('not a url')).toBe(null);
      });

      test('returns null for empty string', () => {
        expect(parseUrl('')).toBe(null);
      });
    });

    describe('transformUrl', () => {
      test('transforms URL with valid hostname', () => {
        const result = transformUrl('https://x.com/user/status/123', 'fixvx.com');
        expect(result).toBe('https://fixvx.com/user/status/123');
      });

      test('preserves query parameters', () => {
        const result = transformUrl('https://x.com/path?foo=bar', 'fixvx.com');
        expect(result).toBe('https://fixvx.com/path?foo=bar');
      });

      test('preserves hash fragment', () => {
        const result = transformUrl('https://x.com/path#section', 'fixvx.com');
        expect(result).toBe('https://fixvx.com/path#section');
      });

      test('preserves port', () => {
        const result = transformUrl('https://x.com:8080/path', 'fixvx.com');
        expect(result).toBe('https://fixvx.com:8080/path');
      });

      test('preserves all components', () => {
        const result = transformUrl('https://x.com:8080/path?q=1#hash', 'fixvx.com');
        expect(result).toBe('https://fixvx.com:8080/path?q=1#hash');
      });

      test('returns null for invalid hostname', () => {
        const result = transformUrl('https://x.com/path', 'https://invalid.com');
        expect(result).toBe(null);
      });

      test('returns null for malformed URL', () => {
        const result = transformUrl('not a url', 'fixvx.com');
        expect(result).toBe(null);
      });
    });

    describe('isTwitterUrl', () => {
      test('returns true for x.com URL', () => {
        expect(isTwitterUrl('https://x.com/user/status/123')).toBe(true);
      });

      test('returns true for www.x.com URL', () => {
        expect(isTwitterUrl('https://www.x.com/user/status/123')).toBe(true);
      });

      test('returns false for Instagram URL', () => {
        expect(isTwitterUrl('https://www.instagram.com/p/abc/')).toBe(false);
      });

      test('returns false for other domain', () => {
        expect(isTwitterUrl('https://example.com/path')).toBe(false);
      });

      test('returns false for malformed URL', () => {
        expect(isTwitterUrl('not a url')).toBe(false);
      });
    });

    describe('isInstagramUrl', () => {
      test('returns true for www.instagram.com URL', () => {
        expect(isInstagramUrl('https://www.instagram.com/p/abc/')).toBe(true);
      });

      test('returns true for instagram.com URL', () => {
        expect(isInstagramUrl('https://instagram.com/p/abc/')).toBe(true);
      });

      test('returns false for Twitter URL', () => {
        expect(isInstagramUrl('https://x.com/user/status/123')).toBe(false);
      });

      test('returns false for other domain', () => {
        expect(isInstagramUrl('https://example.com/path')).toBe(false);
      });

      test('returns false for malformed URL', () => {
        expect(isInstagramUrl('not a url')).toBe(false);
      });
    });

    describe('shouldInjectButton', () => {
      test('returns true for Twitter URL', () => {
        expect(shouldInjectButton('https://x.com/user/status/123')).toBe(true);
      });

      test('returns true for Instagram URL', () => {
        expect(shouldInjectButton('https://www.instagram.com/p/abc/')).toBe(true);
      });

      test('returns false for other domain', () => {
        expect(shouldInjectButton('https://example.com/path')).toBe(false);
      });
    });
  });

  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
    // Custom generators
    const validHostnameGen = fc.domain();
    
    const invalidHostnameGen = fc.oneof(
      // Hostname with protocol
      fc.domain().map(d => `https://${d}`),
      fc.domain().map(d => `http://${d}`),
      // Hostname with path
      fc.domain().map(d => `${d}/path`),
      fc.domain().map(d => `${d}/path/to/resource`),
      // Hostname with consecutive dots
      fc.domain().map(d => d.replace('.', '..')),
      // Empty string
      fc.constant(''),
      // Hostname with spaces
      fc.domain().map(d => d.replace('.', ' .')),
      // Hostname with leading hyphen
      fc.domain().map(d => `-${d}`),
      // Hostname with trailing hyphen
      fc.domain().map(d => `${d}-`)
    );

    const validUrlGen = fc.webUrl();

    const malformedUrlGen = fc.oneof(
      fc.string().filter(s => {
        try {
          new URL(s);
          return false;
        } catch {
          return true;
        }
      }),
      fc.constant('not a url'),
      fc.constant('just some text'),
      fc.constant('://missing-protocol'),
      fc.constant('http://'),
      fc.constant('')
    );

    // Property 1: Component preservation during transformation
    test('Property 1: Component preservation during transformation', () => {
      /**
       * Feature: testing-implementation, Property 1: Component preservation during transformation
       * Validates: Requirements 1.1
       */
      fc.assert(
        fc.property(validUrlGen, validHostnameGen, (url, hostname) => {
          const original = parseUrl(url);
          if (!original) return true; // Skip if URL parsing fails
          
          const transformed = transformUrl(url, hostname);
          if (!transformed) return true; // Skip if transformation fails
          
          const result = parseUrl(transformed);
          if (!result) return false; // Transformation should produce valid URL
          
          // Verify all components except hostname are preserved
          return (
            result.protocol === original.protocol &&
            result.pathname === original.pathname &&
            result.search === original.search &&
            result.hash === original.hash &&
            result.port === original.port
          );
        }),
        { numRuns: 100 }
      );
    });

    // Property 2: Invalid hostname rejection
    test('Property 2: Invalid hostname rejection', () => {
      /**
       * Feature: testing-implementation, Property 2: Invalid hostname rejection
       * Validates: Requirements 1.2
       */
      fc.assert(
        fc.property(validUrlGen, invalidHostnameGen, (url, invalidHostname) => {
          const result = transformUrl(url, invalidHostname);
          return result === null;
        }),
        { numRuns: 100 }
      );
    });

    // Property 3: Malformed URL handling
    test('Property 3: Malformed URL handling', () => {
      /**
       * Feature: testing-implementation, Property 3: Malformed URL handling
       * Validates: Requirements 1.3
       */
      fc.assert(
        fc.property(malformedUrlGen, (malformedUrl) => {
          let exceptionThrown = false;
          let result;
          
          try {
            result = parseUrl(malformedUrl);
          } catch (error) {
            exceptionThrown = true;
          }
          
          // Should not throw exceptions and should return null
          return !exceptionThrown && result === null;
        }),
        { numRuns: 100 }
      );
    });

    // Property 4: Transformation round-trip validity
    test('Property 4: Transformation round-trip validity', () => {
      /**
       * Feature: testing-implementation, Property 4: Transformation round-trip validity
       * Validates: Requirements 1.5
       */
      fc.assert(
        fc.property(validUrlGen, validHostnameGen, (url, hostname) => {
          const transformed = transformUrl(url, hostname);
          if (transformed === null) return true; // Skip if transformation fails
          
          const parsed = parseUrl(transformed);
          // Transformed URL should be parseable
          return parsed !== null && parsed.hostname === hostname;
        }),
        { numRuns: 100 }
      );
    });

    // Property 5: Hostname validation correctness
    test('Property 5: Hostname validation correctness', () => {
      /**
       * Feature: testing-implementation, Property 5: Hostname validation correctness
       * Validates: Requirements 4.3
       */
      fc.assert(
        fc.property(
          fc.oneof(validHostnameGen, invalidHostnameGen),
          (hostname) => {
            const isValid = validateHostname(hostname);
            
            // Check if hostname has invalid characteristics
            const hasProtocol = typeof hostname === 'string' && hostname.includes('://');
            const hasPath = typeof hostname === 'string' && hostname.includes('/');
            const hasConsecutiveDots = typeof hostname === 'string' && hostname.includes('..');
            const isEmpty = !hostname || hostname.trim() === '';
            const hasSpaces = typeof hostname === 'string' && hostname.includes(' ');
            const hasLeadingHyphen = typeof hostname === 'string' && hostname.startsWith('-');
            const hasTrailingHyphen = typeof hostname === 'string' && hostname.endsWith('-');
            
            const shouldBeInvalid = hasProtocol || hasPath || hasConsecutiveDots || 
                                   isEmpty || hasSpaces || hasLeadingHyphen || hasTrailingHyphen;
            
            // If it should be invalid, validation should return false
            if (shouldBeInvalid) {
              return !isValid;
            }
            
            // Otherwise, we can't definitively say (depends on regex)
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 6: Transformation consistency
    test('Property 6: Transformation consistency', () => {
      /**
       * Feature: testing-implementation, Property 6: Transformation consistency
       * Validates: Requirements 4.4
       */
      fc.assert(
        fc.property(
          validUrlGen,
          validHostnameGen,
          validHostnameGen,
          (url, hostnameA, hostnameB) => {
            // Transform with A, then with B
            const step1 = transformUrl(url, hostnameA);
            if (step1 === null) return true; // Skip if first transformation fails
            
            const step2 = transformUrl(step1, hostnameB);
            
            // Transform directly with B
            const direct = transformUrl(url, hostnameB);
            
            // Both should produce the same result
            return step2 === direct;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 7: Graceful error handling
    test('Property 7: Graceful error handling', () => {
      /**
       * Feature: testing-implementation, Property 7: Graceful error handling
       * Validates: Requirements 4.5
       */
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            malformedUrlGen,
            fc.string()
          ),
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            invalidHostnameGen,
            fc.string()
          ),
          (url, hostname) => {
            let exceptionThrown = false;
            
            try {
              // Try all functions with invalid inputs
              validateHostname(hostname);
              parseUrl(url);
              transformUrl(url, hostname);
              isTwitterUrl(url);
              isInstagramUrl(url);
              shouldInjectButton(url);
            } catch (error) {
              exceptionThrown = true;
            }
            
            // No exceptions should be thrown
            return !exceptionThrown;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
