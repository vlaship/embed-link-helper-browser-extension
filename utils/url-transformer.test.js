/**
 * Property-Based Tests for URL Transformation Module
 * Tests URL transformation preservation and validation
 */

const fc = require('fast-check');
const {
  validateHostname,
  parseUrl,
  transformUrl,
  isTwitterUrl,
  isInstagramUrl,
  shouldInjectButton
} = require('./url-transformer.js');

/**
 * **Feature: social-media-redirector, Property 1: URL Transformation Preservation**
 * **Validates: Requirements 7.1, 7.2, 7.4**
 * 
 * For any valid Twitter/X or Instagram URL with path, query parameters, and hash fragments,
 * transforming the URL by replacing only the hostname should preserve all other URL components exactly.
 */
describe('Property 1: URL Transformation Preservation', () => {
  test('should preserve path, query, and hash when transforming URLs', async () => {
    // Generator for valid hostnames (source and target)
    const hostnameArbitrary = fc.domain();

    // Generator for URL paths (including empty, simple, and complex paths)
    const pathArbitrary = fc.oneof(
      fc.constant(''),
      fc.constant('/'),
      fc.webPath()
    );

    // Generator for query parameters
    const queryArbitrary = fc.oneof(
      fc.constant(''),
      fc.webQueryParameters()
    );

    // Generator for hash fragments
    const hashArbitrary = fc.oneof(
      fc.constant(''),
      fc.webFragments()
    );

    // Generator for complete URLs
    const urlComponentsArbitrary = fc.record({
      sourceHostname: hostnameArbitrary,
      targetHostname: hostnameArbitrary,
      path: pathArbitrary,
      query: queryArbitrary,
      hash: hashArbitrary
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        // Construct original URL
        const originalUrl = `https://${components.sourceHostname}${components.path}${components.query}${components.hash}`;
        
        // Transform the URL
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        // If transformation failed (invalid hostname), skip this test case
        if (transformedUrl === null) {
          return true;
        }
        
        // Parse both URLs
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        // Verify transformation succeeded
        expect(transformedParsed).not.toBeNull();
        
        // Verify hostname was changed
        expect(transformedParsed.hostname).toBe(components.targetHostname);
        
        // Verify all other components are preserved
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
        expect(transformedParsed.protocol).toBe(originalParsed.protocol);
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve complex paths with multiple segments', async () => {
    // Generator for multi-segment paths
    const complexPathArbitrary = fc.array(
      fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-', '_'), { minLength: 1, maxLength: 10 }),
      { minLength: 1, maxLength: 5 }
    ).map(segments => '/' + segments.join('/'));

    const urlComponentsArbitrary = fc.record({
      sourceHostname: fc.domain(),
      targetHostname: fc.domain(),
      path: complexPathArbitrary,
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        const originalUrl = `https://${components.sourceHostname}${components.path}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve query parameters with special characters', async () => {
    // Generator for query parameters with various characters
    const queryParamArbitrary = fc.record({
      key: fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 1, maxLength: 10 }),
      value: fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', ' ', '-', '_'), { minLength: 0, maxLength: 20 })
    });

    const urlComponentsArbitrary = fc.record({
      sourceHostname: fc.domain(),
      targetHostname: fc.domain(),
      path: fc.webPath(),
      queryParams: fc.array(queryParamArbitrary, { minLength: 1, maxLength: 5 }),
      hash: fc.webFragments()
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        // Build query string
        const queryString = '?' + components.queryParams
          .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
          .join('&');
        
        const originalUrl = `https://${components.sourceHostname}${components.path}${queryString}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve hash fragments with various content', async () => {
    // Generator for hash fragments
    const hashArbitrary = fc.stringOf(
      fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-', '_', '/'),
      { minLength: 1, maxLength: 20 }
    ).map(s => '#' + s);

    const urlComponentsArbitrary = fc.record({
      sourceHostname: fc.domain(),
      targetHostname: fc.domain(),
      path: fc.webPath(),
      query: fc.webQueryParameters(),
      hash: hashArbitrary
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        const originalUrl = `https://${components.sourceHostname}${components.path}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        expect(transformedParsed.hash).toBe(originalParsed.hash);
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve URLs with all components present', async () => {
    // Test with all URL components present
    const fullUrlArbitrary = fc.record({
      sourceHostname: fc.domain(),
      targetHostname: fc.domain(),
      path: fc.webPath().filter(p => p.length > 1), // Non-empty path
      query: fc.webQueryParameters().filter(q => q.length > 1), // Non-empty query
      hash: fc.webFragments().filter(h => h.length > 1) // Non-empty hash
    });

    await fc.assert(
      fc.asyncProperty(fullUrlArbitrary, async (components) => {
        const originalUrl = `https://${components.sourceHostname}${components.path}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        // Verify all components are preserved
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
        expect(transformedParsed.protocol).toBe(originalParsed.protocol);
        
        // Verify hostname was changed
        expect(transformedParsed.hostname).toBe(components.targetHostname);
        expect(transformedParsed.hostname).not.toBe(originalParsed.hostname);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle Twitter/X specific URL patterns', async () => {
    // Generator for Twitter/X style paths
    const twitterPathArbitrary = fc.oneof(
      fc.constant('/'),
      fc.tuple(
        fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 3, maxLength: 15 }),
        fc.constantFrom('status', 'photo', 'video'),
        fc.integer({ min: 1, max: 999999999 })
      ).map(([user, type, id]) => `/${user}/${type}/${id}`)
    );

    const urlComponentsArbitrary = fc.record({
      targetHostname: fc.domain(),
      path: twitterPathArbitrary,
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        const originalUrl = `https://x.com${components.path}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle Instagram specific URL patterns', async () => {
    // Generator for Instagram style paths
    const instagramPathArbitrary = fc.oneof(
      fc.constant('/'),
      fc.tuple(
        fc.constantFrom('p', 'reel', 'tv'),
        fc.stringOf(fc.constantFrom('A', 'B', 'C', '1', '2', '3', '_', '-'), { minLength: 5, maxLength: 15 })
      ).map(([type, id]) => `/${type}/${id}/`)
    );

    const urlComponentsArbitrary = fc.record({
      targetHostname: fc.domain(),
      path: instagramPathArbitrary,
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        const originalUrl = `https://www.instagram.com${components.path}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve empty path as root path', async () => {
    const urlComponentsArbitrary = fc.record({
      sourceHostname: fc.domain(),
      targetHostname: fc.domain(),
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    });

    await fc.assert(
      fc.asyncProperty(urlComponentsArbitrary, async (components) => {
        // URL with no explicit path (should default to '/')
        const originalUrl = `https://${components.sourceHostname}${components.query}${components.hash}`;
        const transformedUrl = transformUrl(originalUrl, components.targetHostname);
        
        if (transformedUrl === null) {
          return true;
        }
        
        const originalParsed = parseUrl(originalUrl);
        const transformedParsed = parseUrl(transformedUrl);
        
        // Pathname should be preserved (defaults to '/' when not specified)
        expect(transformedParsed.pathname).toBe(originalParsed.pathname);
        expect(transformedParsed.search).toBe(originalParsed.search);
        expect(transformedParsed.hash).toBe(originalParsed.hash);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property 3: Hostname Validation Rejection**
 * **Validates: Requirements 7.3**
 * 
 * For any string that is not a valid hostname format (contains invalid characters, 
 * protocols, or paths), the validation function should reject it and prevent it 
 * from being saved.
 */
describe('Property 3: Hostname Validation Rejection', () => {
  test('should reject hostnames with protocols', async () => {
    // Generator for hostnames with protocols
    const protocolArbitrary = fc.constantFrom('http://', 'https://', 'ftp://', 'ws://', 'wss://');
    const hostnameWithProtocolArbitrary = fc.tuple(
      protocolArbitrary,
      fc.domain()
    ).map(([protocol, domain]) => protocol + domain);

    await fc.assert(
      fc.asyncProperty(hostnameWithProtocolArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames with paths', async () => {
    // Generator for hostnames with paths
    const hostnameWithPathArbitrary = fc.tuple(
      fc.domain(),
      fc.webPath().filter(p => p.length > 1)
    ).map(([domain, path]) => domain + path);

    await fc.assert(
      fc.asyncProperty(hostnameWithPathArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames with consecutive dots', async () => {
    // Generator for hostnames with consecutive dots
    const hostnameWithDoubleDotArbitrary = fc.tuple(
      fc.stringMatching(/^[a-z]{2,10}$/),
      fc.stringMatching(/^[a-z]{2,10}$/)
    ).map(([part1, part2]) => `${part1}..${part2}`);

    await fc.assert(
      fc.asyncProperty(hostnameWithDoubleDotArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject empty or whitespace-only hostnames', async () => {
    // Generator for empty or whitespace strings
    const emptyOrWhitespaceArbitrary = fc.oneof(
      fc.constant(''),
      fc.constant(' '),
      fc.constant('  '),
      fc.constant('\t'),
      fc.constant('\n'),
      fc.constant('   \t  \n  ')
    );

    await fc.assert(
      fc.asyncProperty(emptyOrWhitespaceArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames with invalid characters', async () => {
    // Generator for hostnames with invalid special characters
    const invalidCharArbitrary = fc.constantFrom('@', '#', '$', '%', '^', '&', '*', '(', ')', '=', '+', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '?', '!', '~', '`', ' ');
    
    const hostnameWithInvalidCharArbitrary = fc.tuple(
      fc.stringMatching(/^[a-z]{2,10}$/),
      invalidCharArbitrary,
      fc.stringMatching(/^[a-z]{2,10}$/)
    ).map(([part1, invalidChar, part2]) => `${part1}${invalidChar}${part2}`);

    await fc.assert(
      fc.asyncProperty(hostnameWithInvalidCharArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames starting or ending with hyphen', async () => {
    // Generator for hostnames starting or ending with hyphen
    const invalidHyphenHostnameArbitrary = fc.oneof(
      fc.stringMatching(/^[a-z]{2,10}$/).map(s => `-${s}`),
      fc.stringMatching(/^[a-z]{2,10}$/).map(s => `${s}-`),
      fc.stringMatching(/^[a-z]{2,10}$/).map(s => `-${s}-`)
    );

    await fc.assert(
      fc.asyncProperty(invalidHyphenHostnameArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames starting or ending with dot', async () => {
    // Generator for hostnames starting or ending with dot
    const invalidDotHostnameArbitrary = fc.oneof(
      fc.domain().map(d => `.${d}`),
      fc.domain().map(d => `${d}.`)
    );

    await fc.assert(
      fc.asyncProperty(invalidDotHostnameArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject non-string values', async () => {
    // Generator for non-string values
    const nonStringArbitrary = fc.oneof(
      fc.integer(),
      fc.float(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.object(),
      fc.array(fc.anything())
    );

    await fc.assert(
      fc.asyncProperty(nonStringArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames with query parameters', async () => {
    // Generator for hostnames with query parameters (explicitly add ? to ensure it's present)
    const hostnameWithQueryArbitrary = fc.tuple(
      fc.domain(),
      fc.string({ minLength: 1, maxLength: 20 })
    ).map(([domain, queryContent]) => `${domain}?${queryContent}`);

    await fc.assert(
      fc.asyncProperty(hostnameWithQueryArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should reject hostnames with hash fragments', async () => {
    // Generator for hostnames with hash fragments (explicitly add # to ensure it's present)
    const hostnameWithHashArbitrary = fc.tuple(
      fc.domain(),
      fc.string({ minLength: 1, maxLength: 20 })
    ).map(([domain, hashContent]) => `${domain}#${hashContent}`);

    await fc.assert(
      fc.asyncProperty(hostnameWithHashArbitrary, async (invalidHostname) => {
        // Validate hostname - should reject
        const isValid = validateHostname(invalidHostname);
        expect(isValid).toBe(false);
        
        // Verify transformUrl rejects it
        const result = transformUrl('https://example.com/path', invalidHostname);
        expect(result).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should accept valid hostnames', async () => {
    // Generator for valid hostnames (to ensure we're not rejecting everything)
    const validHostnameArbitrary = fc.domain();

    await fc.assert(
      fc.asyncProperty(validHostnameArbitrary, async (validHostname) => {
        // Validate hostname - should accept
        const isValid = validateHostname(validHostname);
        expect(isValid).toBe(true);
        
        // Verify transformUrl accepts it
        const result = transformUrl('https://example.com/path', validHostname);
        expect(result).not.toBeNull();
        expect(result).toContain(validHostname);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property 5: URL Pattern Matching Specificity**
 * **Validates: Requirements 1.1, 7.5**
 * 
 * For any URL that does not match the Twitter/X or Instagram patterns, 
 * the extension should not inject a redirect button.
 */
describe('Property 5: URL Pattern Matching Specificity', () => {
  test('should only match Twitter/X URLs (x.com and www.x.com)', async () => {
    // Generator for various URLs - some Twitter/X, some not
    const urlArbitrary = fc.oneof(
      // Valid Twitter/X URLs
      fc.record({
        hostname: fc.constantFrom('x.com', 'www.x.com'),
        path: fc.webPath(),
        query: fc.webQueryParameters(),
        hash: fc.webFragments()
      }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`),
      
      // Invalid Twitter/X URLs (wrong hostname)
      fc.record({
        hostname: fc.domain().filter(d => d !== 'x.com' && d !== 'www.x.com'),
        path: fc.webPath(),
        query: fc.webQueryParameters(),
        hash: fc.webFragments()
      }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`)
    );

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        const result = isTwitterUrl(url);
        
        // Parse URL to check hostname
        try {
          const parsedUrl = new URL(url);
          const expectedResult = parsedUrl.hostname === 'x.com' || parsedUrl.hostname === 'www.x.com';
          
          // Verify the function correctly identifies Twitter/X URLs
          expect(result).toBe(expectedResult);
        } catch (error) {
          // Invalid URL should return false
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should only match Instagram URLs (instagram.com and www.instagram.com)', async () => {
    // Generator for various URLs - some Instagram, some not
    const urlArbitrary = fc.oneof(
      // Valid Instagram URLs
      fc.record({
        hostname: fc.constantFrom('instagram.com', 'www.instagram.com'),
        path: fc.webPath(),
        query: fc.webQueryParameters(),
        hash: fc.webFragments()
      }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`),
      
      // Invalid Instagram URLs (wrong hostname)
      fc.record({
        hostname: fc.domain().filter(d => d !== 'instagram.com' && d !== 'www.instagram.com'),
        path: fc.webPath(),
        query: fc.webQueryParameters(),
        hash: fc.webFragments()
      }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`)
    );

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        const result = isInstagramUrl(url);
        
        // Parse URL to check hostname
        try {
          const parsedUrl = new URL(url);
          const expectedResult = parsedUrl.hostname === 'instagram.com' || parsedUrl.hostname === 'www.instagram.com';
          
          // Verify the function correctly identifies Instagram URLs
          expect(result).toBe(expectedResult);
        } catch (error) {
          // Invalid URL should return false
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should reject URLs from non-supported social media platforms', async () => {
    // Generator for URLs from other social media platforms
    const otherPlatformHostnameArbitrary = fc.constantFrom(
      'facebook.com',
      'www.facebook.com',
      'twitter.com',
      'www.twitter.com',
      'youtube.com',
      'www.youtube.com',
      'linkedin.com',
      'www.linkedin.com',
      'reddit.com',
      'www.reddit.com',
      'tiktok.com',
      'www.tiktok.com',
      'snapchat.com',
      'www.snapchat.com',
      'pinterest.com',
      'www.pinterest.com',
      'tumblr.com',
      'www.tumblr.com'
    );

    const urlArbitrary = fc.record({
      hostname: otherPlatformHostnameArbitrary,
      path: fc.webPath(),
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`);

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        // Should not match Twitter/X
        expect(isTwitterUrl(url)).toBe(false);
        
        // Should not match Instagram
        expect(isInstagramUrl(url)).toBe(false);
        
        // Should not trigger button injection
        expect(shouldInjectButton(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject URLs from random domains', async () => {
    // Generator for random domains (excluding Twitter/X and Instagram)
    const randomDomainArbitrary = fc.domain().filter(d => 
      d !== 'x.com' && 
      d !== 'www.x.com' && 
      d !== 'instagram.com' && 
      d !== 'www.instagram.com'
    );

    const urlArbitrary = fc.record({
      hostname: randomDomainArbitrary,
      path: fc.webPath(),
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    }).map(components => `https://${components.hostname}${components.path}${components.query}${components.hash}`);

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        // Should not match Twitter/X
        expect(isTwitterUrl(url)).toBe(false);
        
        // Should not match Instagram
        expect(isInstagramUrl(url)).toBe(false);
        
        // Should not trigger button injection
        expect(shouldInjectButton(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should only inject button for supported platforms', async () => {
    // Generator for URLs from various platforms
    const urlArbitrary = fc.oneof(
      // Twitter/X URLs
      fc.record({
        hostname: fc.constantFrom('x.com', 'www.x.com'),
        path: fc.webPath()
      }).map(c => `https://${c.hostname}${c.path}`),
      
      // Instagram URLs
      fc.record({
        hostname: fc.constantFrom('instagram.com', 'www.instagram.com'),
        path: fc.webPath()
      }).map(c => `https://${c.hostname}${c.path}`),
      
      // Other URLs
      fc.record({
        hostname: fc.domain().filter(d => 
          d !== 'x.com' && 
          d !== 'www.x.com' && 
          d !== 'instagram.com' && 
          d !== 'www.instagram.com'
        ),
        path: fc.webPath()
      }).map(c => `https://${c.hostname}${c.path}`)
    );

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        const shouldInject = shouldInjectButton(url);
        const isTwitter = isTwitterUrl(url);
        const isInstagram = isInstagramUrl(url);
        
        // Button should only be injected for Twitter/X or Instagram
        expect(shouldInject).toBe(isTwitter || isInstagram);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle invalid URLs gracefully', async () => {
    // Generator for invalid URL strings
    const invalidUrlArbitrary = fc.oneof(
      fc.constant('not-a-url'),
      fc.constant(''),
      fc.constant('http://'),
      fc.constant('://example.com'),
      fc.string().filter(s => {
        try {
          new URL(s);
          return false;
        } catch {
          return true;
        }
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidUrlArbitrary, async (invalidUrl) => {
        // Should not match Twitter/X
        expect(isTwitterUrl(invalidUrl)).toBe(false);
        
        // Should not match Instagram
        expect(isInstagramUrl(invalidUrl)).toBe(false);
        
        // Should not trigger button injection
        expect(shouldInjectButton(invalidUrl)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should be case-sensitive for hostname matching', async () => {
    // Generator for URLs with different case variations
    const caseVariationArbitrary = fc.oneof(
      fc.constantFrom('X.COM', 'X.com', 'WWW.X.COM', 'Www.X.Com'),
      fc.constantFrom('INSTAGRAM.COM', 'Instagram.Com', 'WWW.INSTAGRAM.COM', 'Www.Instagram.Com')
    );

    const urlArbitrary = fc.record({
      hostname: caseVariationArbitrary,
      path: fc.webPath()
    }).map(c => `https://${c.hostname}${c.path}`);

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        // Parse URL to normalize hostname (URL constructor lowercases hostnames)
        try {
          const parsedUrl = new URL(url);
          const normalizedHostname = parsedUrl.hostname;
          
          // Check if normalized hostname matches
          const isTwitter = normalizedHostname === 'x.com' || normalizedHostname === 'www.x.com';
          const isInstagram = normalizedHostname === 'instagram.com' || normalizedHostname === 'www.instagram.com';
          
          // Verify functions handle case normalization correctly
          expect(isTwitterUrl(url)).toBe(isTwitter);
          expect(isInstagramUrl(url)).toBe(isInstagram);
          expect(shouldInjectButton(url)).toBe(isTwitter || isInstagram);
        } catch (error) {
          // Invalid URL should return false
          expect(isTwitterUrl(url)).toBe(false);
          expect(isInstagramUrl(url)).toBe(false);
          expect(shouldInjectButton(url)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not match subdomains other than www', async () => {
    // Generator for URLs with various subdomains
    const subdomainArbitrary = fc.stringOf(
      fc.constantFrom('a', 'b', 'c', '1', '2', '3'),
      { minLength: 2, maxLength: 10 }
    ).filter(s => s !== 'www');

    const urlArbitrary = fc.oneof(
      // Twitter/X with non-www subdomain
      fc.record({
        subdomain: subdomainArbitrary,
        path: fc.webPath()
      }).map(c => `https://${c.subdomain}.x.com${c.path}`),
      
      // Instagram with non-www subdomain
      fc.record({
        subdomain: subdomainArbitrary,
        path: fc.webPath()
      }).map(c => `https://${c.subdomain}.instagram.com${c.path}`)
    );

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        // Should not match Twitter/X (only x.com and www.x.com are valid)
        expect(isTwitterUrl(url)).toBe(false);
        
        // Should not match Instagram (only instagram.com and www.instagram.com are valid)
        expect(isInstagramUrl(url)).toBe(false);
        
        // Should not trigger button injection
        expect(shouldInjectButton(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle URLs with different protocols', async () => {
    // Generator for URLs with different protocols
    const protocolArbitrary = fc.constantFrom('http://', 'https://', 'ftp://', 'ws://');
    
    const urlArbitrary = fc.record({
      protocol: protocolArbitrary,
      hostname: fc.constantFrom('x.com', 'www.x.com', 'instagram.com', 'www.instagram.com'),
      path: fc.webPath()
    }).map(c => `${c.protocol}${c.hostname}${c.path}`);

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname;
          
          // Should match based on hostname, regardless of protocol
          const isTwitter = hostname === 'x.com' || hostname === 'www.x.com';
          const isInstagram = hostname === 'instagram.com' || hostname === 'www.instagram.com';
          
          expect(isTwitterUrl(url)).toBe(isTwitter);
          expect(isInstagramUrl(url)).toBe(isInstagram);
          expect(shouldInjectButton(url)).toBe(isTwitter || isInstagram);
        } catch (error) {
          // Invalid URL should return false
          expect(isTwitterUrl(url)).toBe(false);
          expect(isInstagramUrl(url)).toBe(false);
          expect(shouldInjectButton(url)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not be affected by URL path, query, or hash', async () => {
    // Generator for Twitter/X and Instagram URLs with various components
    const urlArbitrary = fc.record({
      hostname: fc.constantFrom('x.com', 'www.x.com', 'instagram.com', 'www.instagram.com'),
      path: fc.webPath(),
      query: fc.webQueryParameters(),
      hash: fc.webFragments()
    }).map(c => `https://${c.hostname}${c.path}${c.query}${c.hash}`);

    await fc.assert(
      fc.asyncProperty(urlArbitrary, async (url) => {
        try {
          const parsedUrl = new URL(url);
          const hostname = parsedUrl.hostname;
          
          // Should match based solely on hostname
          const isTwitter = hostname === 'x.com' || hostname === 'www.x.com';
          const isInstagram = hostname === 'instagram.com' || hostname === 'www.instagram.com';
          
          expect(isTwitterUrl(url)).toBe(isTwitter);
          expect(isInstagramUrl(url)).toBe(isInstagram);
          expect(shouldInjectButton(url)).toBe(isTwitter || isInstagram);
        } catch (error) {
          // If URL is invalid (e.g., malformed encoding), the functions should return false
          expect(isTwitterUrl(url)).toBe(false);
          expect(isInstagramUrl(url)).toBe(false);
          expect(shouldInjectButton(url)).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for URL Transformation Examples
 * Tests specific examples from requirements
 */
describe('Unit Tests: URL Transformation Examples', () => {
  describe('Twitter/X transformation examples', () => {
    test('should transform x.com to fixvx.com', () => {
      const originalUrl = 'https://x.com/account/status/123';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/account/status/123';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform x.com with query parameters', () => {
      const originalUrl = 'https://x.com/user/status/456?ref=source';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/456?ref=source';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform x.com with hash fragment', () => {
      const originalUrl = 'https://x.com/user/status/789#reply';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/789#reply';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform x.com with query parameters and hash fragment', () => {
      const originalUrl = 'https://x.com/user/status/123?ref=source#reply';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/123?ref=source#reply';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform x.com root path', () => {
      const originalUrl = 'https://x.com/';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform x.com with complex path', () => {
      const originalUrl = 'https://x.com/user/status/123/photo/1';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/123/photo/1';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });
  });

  describe('Instagram transformation examples', () => {
    test('should transform instagram.com to kkinstagram.com', () => {
      const originalUrl = 'https://www.instagram.com/p/ABC123/';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/ABC123/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com with query parameters', () => {
      const originalUrl = 'https://www.instagram.com/p/DEF456/?utm_source=ig_web';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/DEF456/?utm_source=ig_web';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com with hash fragment', () => {
      const originalUrl = 'https://www.instagram.com/p/GHI789/#comments';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/GHI789/#comments';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com with query parameters and hash fragment', () => {
      const originalUrl = 'https://www.instagram.com/p/JKL012/?hl=en#likes';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/JKL012/?hl=en#likes';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com root path', () => {
      const originalUrl = 'https://www.instagram.com/';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com user profile', () => {
      const originalUrl = 'https://www.instagram.com/username/';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/username/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should transform instagram.com reel', () => {
      const originalUrl = 'https://www.instagram.com/reel/XYZ789/';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/reel/XYZ789/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });
  });

  describe('URLs with complex query parameters and hash fragments', () => {
    test('should preserve multiple query parameters', () => {
      const originalUrl = 'https://x.com/user/status/123?ref=source&lang=en&mode=dark';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/123?ref=source&lang=en&mode=dark';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should preserve query parameters with special characters', () => {
      const originalUrl = 'https://x.com/search?q=hello%20world&src=typed_query';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/search?q=hello%20world&src=typed_query';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should preserve hash fragment with path-like structure', () => {
      const originalUrl = 'https://x.com/user/status/123#/replies/456';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/status/123#/replies/456';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should preserve empty query parameter values', () => {
      const originalUrl = 'https://www.instagram.com/p/ABC123/?utm_source=&ref=';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/ABC123/?utm_source=&ref=';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should handle URLs with encoded characters in path', () => {
      const originalUrl = 'https://x.com/user%20name/status/123';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user%20name/status/123';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should handle URLs with all components present', () => {
      const originalUrl = 'https://www.instagram.com/p/ABC123/?utm_source=ig_web&utm_medium=copy_link#comments';
      const targetHostname = 'kkinstagram.com';
      const expectedUrl = 'https://kkinstagram.com/p/ABC123/?utm_source=ig_web&utm_medium=copy_link#comments';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });
  });

  describe('Edge cases', () => {
    test('should handle URL with trailing slash', () => {
      const originalUrl = 'https://x.com/user/';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user/';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should handle URL without trailing slash', () => {
      const originalUrl = 'https://x.com/user';
      const targetHostname = 'fixvx.com';
      const expectedUrl = 'https://fixvx.com/user';
      
      const result = transformUrl(originalUrl, targetHostname);
      
      expect(result).toBe(expectedUrl);
    });

    test('should return null for invalid target hostname', () => {
      const originalUrl = 'https://x.com/user/status/123';
      const invalidHostname = 'http://fixvx.com';
      
      const result = transformUrl(originalUrl, invalidHostname);
      
      expect(result).toBeNull();
    });

    test('should return null for invalid original URL', () => {
      const invalidUrl = 'not-a-valid-url';
      const targetHostname = 'fixvx.com';
      
      const result = transformUrl(invalidUrl, targetHostname);
      
      expect(result).toBeNull();
    });
  });
});
