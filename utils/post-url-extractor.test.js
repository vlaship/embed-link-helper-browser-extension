/**
 * Post URL Extractor Tests
 * Unit tests and property-based tests for post URL extraction functionality
 */

const fc = require('fast-check');
const {
  extractTweetUrl,
  extractInstagramPostUrl,
  extractPostUrl,
  validatePostUrl,
  validateTwitterUrl,
  validateInstagramUrl,
  cleanInstagramUrl
} = require('./post-url-extractor');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a mock Twitter post element with a timestamp link
 */
function createMockTwitterPost(statusUrl) {
  const article = document.createElement('article');
  const time = document.createElement('time');
  const link = document.createElement('a');
  
  link.href = statusUrl;
  time.appendChild(document.createTextNode('2h'));
  link.appendChild(time);
  article.appendChild(link);
  
  return article;
}

/**
 * Create a mock Twitter post with status link (no time element)
 */
function createMockTwitterPostWithStatusLink(statusUrl) {
  const article = document.createElement('article');
  const link = document.createElement('a');
  
  link.href = statusUrl;
  link.textContent = 'View tweet';
  article.appendChild(link);
  
  return article;
}

/**
 * Create a mock Instagram post element with a timestamp link
 */
function createMockInstagramPost(postUrl) {
  const article = document.createElement('article');
  const header = document.createElement('header');
  const time = document.createElement('time');
  const link = document.createElement('a');
  
  link.href = postUrl;
  time.appendChild(document.createTextNode('2h ago'));
  link.appendChild(time);
  header.appendChild(link);
  article.appendChild(header);
  
  return article;
}

/**
 * Create a mock Instagram post with header link
 */
function createMockInstagramPostWithHeaderLink(postUrl) {
  const article = document.createElement('article');
  const header = document.createElement('header');
  const link = document.createElement('a');
  
  link.href = postUrl;
  link.textContent = 'View post';
  header.appendChild(link);
  article.appendChild(header);
  
  return article;
}

/**
 * Create an empty mock post element
 */
function createEmptyMockPost() {
  return document.createElement('article');
}

describe('Post URL Extractor', () => {
  
  // ============================================================================
  // UNIT TESTS
  // ============================================================================
  
  describe('Unit Tests', () => {
    
    describe('extractTweetUrl', () => {
      test('extracts URL from tweet with timestamp link', () => {
        const url = 'https://x.com/user/status/1234567890';
        const tweet = createMockTwitterPost(url);
        expect(extractTweetUrl(tweet)).toBe(url);
      });

      test('extracts URL from tweet with status link', () => {
        const url = 'https://x.com/user/status/9876543210';
        const tweet = createMockTwitterPostWithStatusLink(url);
        expect(extractTweetUrl(tweet)).toBe(url);
      });

      test('extracts URL from twitter.com domain', () => {
        const url = 'https://twitter.com/user/status/1234567890';
        const tweet = createMockTwitterPost(url);
        expect(extractTweetUrl(tweet)).toBe(url);
      });

      test('returns null for tweet without links', () => {
        const tweet = createEmptyMockPost();
        expect(extractTweetUrl(tweet)).toBe(null);
      });

      test('returns null for null input', () => {
        expect(extractTweetUrl(null)).toBe(null);
      });

      test('returns null for undefined input', () => {
        expect(extractTweetUrl(undefined)).toBe(null);
      });

      test('returns null for non-HTMLElement input', () => {
        expect(extractTweetUrl({})).toBe(null);
        expect(extractTweetUrl('string')).toBe(null);
      });

      test('returns null for tweet with invalid URL', () => {
        const tweet = createMockTwitterPost('https://example.com/not/a/tweet');
        expect(extractTweetUrl(tweet)).toBe(null);
      });
    });

    describe('extractInstagramPostUrl', () => {
      test('extracts URL from post with timestamp link', () => {
        const url = 'https://www.instagram.com/p/ABC123/';
        const post = createMockInstagramPost(url);
        expect(extractInstagramPostUrl(post)).toBe(url);
      });

      test('extracts URL from post with header link', () => {
        const url = 'https://www.instagram.com/p/XYZ789/';
        const post = createMockInstagramPostWithHeaderLink(url);
        expect(extractInstagramPostUrl(post)).toBe(url);
      });

      test('extracts URL from reel', () => {
        const url = 'https://www.instagram.com/reel/ABC123/';
        const post = createMockInstagramPost(url);
        expect(extractInstagramPostUrl(post)).toBe(url);
      });

      test('cleans query parameters from URL', () => {
        const urlWithParams = 'https://www.instagram.com/p/ABC123/?utm_source=ig_web';
        const cleanUrl = 'https://www.instagram.com/p/ABC123/';
        const post = createMockInstagramPost(urlWithParams);
        expect(extractInstagramPostUrl(post)).toBe(cleanUrl);
      });

      test('returns null for post without links', () => {
        const post = createEmptyMockPost();
        expect(extractInstagramPostUrl(post)).toBe(null);
      });

      test('returns null for null input', () => {
        expect(extractInstagramPostUrl(null)).toBe(null);
      });

      test('returns null for undefined input', () => {
        expect(extractInstagramPostUrl(undefined)).toBe(null);
      });

      test('returns null for non-HTMLElement input', () => {
        expect(extractInstagramPostUrl({})).toBe(null);
        expect(extractInstagramPostUrl('string')).toBe(null);
      });

      test('returns null for post with invalid URL', () => {
        const post = createMockInstagramPost('https://example.com/not/instagram');
        expect(extractInstagramPostUrl(post)).toBe(null);
      });
    });

    describe('validateTwitterUrl', () => {
      test('validates x.com status URL', () => {
        expect(validateTwitterUrl('https://x.com/user/status/1234567890')).toBe(true);
      });

      test('validates www.x.com status URL', () => {
        expect(validateTwitterUrl('https://www.x.com/user/status/1234567890')).toBe(true);
      });

      test('validates twitter.com status URL', () => {
        expect(validateTwitterUrl('https://twitter.com/user/status/1234567890')).toBe(true);
      });

      test('validates www.twitter.com status URL', () => {
        expect(validateTwitterUrl('https://www.twitter.com/user/status/1234567890')).toBe(true);
      });

      test('rejects URL without status path', () => {
        expect(validateTwitterUrl('https://x.com/user')).toBe(false);
      });

      test('rejects URL with non-numeric status ID', () => {
        expect(validateTwitterUrl('https://x.com/user/status/abc')).toBe(false);
      });

      test('rejects non-Twitter domain', () => {
        expect(validateTwitterUrl('https://example.com/user/status/123')).toBe(false);
      });

      test('rejects http protocol', () => {
        expect(validateTwitterUrl('http://x.com/user/status/123')).toBe(false);
      });

      test('rejects null input', () => {
        expect(validateTwitterUrl(null)).toBe(false);
      });

      test('rejects undefined input', () => {
        expect(validateTwitterUrl(undefined)).toBe(false);
      });

      test('rejects non-string input', () => {
        expect(validateTwitterUrl(123)).toBe(false);
      });

      test('rejects malformed URL', () => {
        expect(validateTwitterUrl('not a url')).toBe(false);
      });
    });

    describe('validateInstagramUrl', () => {
      test('validates www.instagram.com post URL', () => {
        expect(validateInstagramUrl('https://www.instagram.com/p/ABC123/')).toBe(true);
      });

      test('validates instagram.com post URL', () => {
        expect(validateInstagramUrl('https://instagram.com/p/ABC123/')).toBe(true);
      });

      test('validates reel URL', () => {
        expect(validateInstagramUrl('https://www.instagram.com/reel/ABC123/')).toBe(true);
      });

      test('validates tv URL', () => {
        expect(validateInstagramUrl('https://www.instagram.com/tv/ABC123/')).toBe(true);
      });

      test('validates post URL without trailing slash', () => {
        expect(validateInstagramUrl('https://www.instagram.com/p/ABC123')).toBe(true);
      });

      test('rejects URL without post code', () => {
        expect(validateInstagramUrl('https://www.instagram.com/user/')).toBe(false);
      });

      test('rejects non-Instagram domain', () => {
        expect(validateInstagramUrl('https://example.com/p/ABC123/')).toBe(false);
      });

      test('rejects http protocol', () => {
        expect(validateInstagramUrl('http://www.instagram.com/p/ABC123/')).toBe(false);
      });

      test('rejects null input', () => {
        expect(validateInstagramUrl(null)).toBe(false);
      });

      test('rejects undefined input', () => {
        expect(validateInstagramUrl(undefined)).toBe(false);
      });

      test('rejects non-string input', () => {
        expect(validateInstagramUrl(123)).toBe(false);
      });

      test('rejects malformed URL', () => {
        expect(validateInstagramUrl('not a url')).toBe(false);
      });
    });

    describe('cleanInstagramUrl', () => {
      test('removes query parameters', () => {
        const dirty = 'https://www.instagram.com/p/ABC123/?utm_source=ig_web&ref=share';
        const clean = 'https://www.instagram.com/p/ABC123/';
        expect(cleanInstagramUrl(dirty)).toBe(clean);
      });

      test('removes hash fragment', () => {
        const dirty = 'https://www.instagram.com/p/ABC123/#comments';
        const clean = 'https://www.instagram.com/p/ABC123/';
        expect(cleanInstagramUrl(dirty)).toBe(clean);
      });

      test('removes both query and hash', () => {
        const dirty = 'https://www.instagram.com/p/ABC123/?ref=share#comments';
        const clean = 'https://www.instagram.com/p/ABC123/';
        expect(cleanInstagramUrl(dirty)).toBe(clean);
      });

      test('preserves clean URL', () => {
        const clean = 'https://www.instagram.com/p/ABC123/';
        expect(cleanInstagramUrl(clean)).toBe(clean);
      });

      test('preserves pathname', () => {
        const dirty = 'https://www.instagram.com/reel/XYZ789/?ref=share';
        const clean = 'https://www.instagram.com/reel/XYZ789/';
        expect(cleanInstagramUrl(dirty)).toBe(clean);
      });

      test('returns original for malformed URL', () => {
        const malformed = 'not a url';
        expect(cleanInstagramUrl(malformed)).toBe(malformed);
      });
    });

    describe('validatePostUrl', () => {
      test('validates Twitter URL with twitter platform', () => {
        expect(validatePostUrl('https://x.com/user/status/123', 'twitter')).toBe(true);
      });

      test('validates Instagram URL with instagram platform', () => {
        expect(validatePostUrl('https://www.instagram.com/p/ABC/', 'instagram')).toBe(true);
      });

      test('rejects Twitter URL with instagram platform', () => {
        expect(validatePostUrl('https://x.com/user/status/123', 'instagram')).toBe(false);
      });

      test('rejects Instagram URL with twitter platform', () => {
        expect(validatePostUrl('https://www.instagram.com/p/ABC/', 'twitter')).toBe(false);
      });

      test('rejects invalid platform', () => {
        expect(validatePostUrl('https://x.com/user/status/123', 'facebook')).toBe(false);
      });

      test('rejects null URL', () => {
        expect(validatePostUrl(null, 'twitter')).toBe(false);
      });

      test('rejects null platform', () => {
        expect(validatePostUrl('https://x.com/user/status/123', null)).toBe(false);
      });
    });

    describe('extractPostUrl', () => {
      test('extracts Twitter URL with twitter platform', () => {
        const url = 'https://x.com/user/status/123';
        const post = createMockTwitterPost(url);
        expect(extractPostUrl(post, 'twitter')).toBe(url);
      });

      test('extracts Instagram URL with instagram platform', () => {
        const url = 'https://www.instagram.com/p/ABC123/';
        const post = createMockInstagramPost(url);
        expect(extractPostUrl(post, 'instagram')).toBe(url);
      });

      test('returns null for invalid platform', () => {
        const post = createMockTwitterPost('https://x.com/user/status/123');
        expect(extractPostUrl(post, 'facebook')).toBe(null);
      });

      test('returns null for null element', () => {
        expect(extractPostUrl(null, 'twitter')).toBe(null);
      });

      test('returns null for null platform', () => {
        const post = createMockTwitterPost('https://x.com/user/status/123');
        expect(extractPostUrl(post, null)).toBe(null);
      });
    });
  });

  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
    // Custom generators
    const instagramPostCodeGen = fc.stringOf(
      fc.oneof(
        fc.char().filter(c => /[A-Za-z0-9_-]/.test(c))
      ),
      { minLength: 5, maxLength: 15 }
    );

    const instagramUrlGen = fc.oneof(
      instagramPostCodeGen.map(code => `https://www.instagram.com/p/${code}/`),
      instagramPostCodeGen.map(code => `https://instagram.com/p/${code}/`),
      instagramPostCodeGen.map(code => `https://www.instagram.com/reel/${code}/`),
      instagramPostCodeGen.map(code => `https://www.instagram.com/tv/${code}/`)
    );

    const queryParamsGen = fc.dictionary(
      fc.stringOf(fc.char().filter(c => /[a-z_]/.test(c)), { minLength: 3, maxLength: 10 }),
      fc.stringOf(fc.char().filter(c => /[a-zA-Z0-9]/.test(c)), { minLength: 1, maxLength: 20 }),
      { minKeys: 1, maxKeys: 5 }
    ).map(obj => {
      const params = new URLSearchParams(obj);
      return params.toString();
    });

    const twitterUsernameGen = fc.stringOf(
      fc.char().filter(c => /[a-zA-Z0-9_]/.test(c)),
      { minLength: 1, maxLength: 15 }
    );

    const twitterStatusIdGen = fc.bigInt({ min: 1n, max: 9999999999999999999n }).map(n => n.toString());

    const twitterUrlGen = fc.tuple(twitterUsernameGen, twitterStatusIdGen).map(
      ([username, statusId]) => `https://x.com/${username}/status/${statusId}`
    );

    const platformGen = fc.constantFrom('twitter', 'instagram');

    const invalidPlatformGen = fc.oneof(
      fc.constant('facebook'),
      fc.constant('tiktok'),
      fc.constant('youtube'),
      fc.constant(''),
      fc.string().filter(s => s !== 'twitter' && s !== 'instagram')
    );

    // Property 15: Instagram URL cleaning
    test('Property 15: Instagram URL cleaning', () => {
      /**
       * Feature: testing-implementation, Property 15: Instagram URL cleaning
       * Validates: Requirements 3.2, 6.4
       */
      fc.assert(
        fc.property(instagramUrlGen, queryParamsGen, (baseUrl, queryParams) => {
          const urlWithParams = `${baseUrl}?${queryParams}`;
          const cleaned = cleanInstagramUrl(urlWithParams);
          
          // Parse both URLs
          const cleanedObj = new URL(cleaned);
          const baseObj = new URL(baseUrl);
          
          // Verify query parameters are removed
          const hasNoQuery = cleanedObj.search === '';
          // Verify pathname is preserved
          const pathnamePreserved = cleanedObj.pathname === baseObj.pathname;
          // Verify protocol and hostname are preserved
          const protocolPreserved = cleanedObj.protocol === baseObj.protocol;
          const hostnamePreserved = cleanedObj.hostname === baseObj.hostname;
          
          return hasNoQuery && pathnamePreserved && protocolPreserved && hostnamePreserved;
        }),
        { numRuns: 100 }
      );
    });

    // Property 16: Post URL validation correctness
    test('Property 16: Post URL validation correctness', () => {
      /**
       * Feature: testing-implementation, Property 16: Post URL validation correctness
       * Validates: Requirements 3.3, 6.3
       */
      fc.assert(
        fc.property(
          fc.oneof(twitterUrlGen, instagramUrlGen),
          platformGen,
          (url, platform) => {
            const isValid = validatePostUrl(url, platform);
            
            // Determine if URL matches platform
            const isTwitterUrl = url.includes('x.com') || url.includes('twitter.com');
            const isInstagramUrl = url.includes('instagram.com');
            
            if (platform === 'twitter') {
              // Should be valid only if it's a Twitter URL
              return isValid === isTwitterUrl;
            } else if (platform === 'instagram') {
              // Should be valid only if it's an Instagram URL
              return isValid === isInstagramUrl;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 17: Extracted URL validity
    test('Property 17: Extracted URL validity', () => {
      /**
       * Feature: testing-implementation, Property 17: Extracted URL validity
       * Validates: Requirements 3.5
       */
      fc.assert(
        fc.property(
          fc.oneof(twitterUrlGen, instagramUrlGen),
          platformGen,
          (url, platform) => {
            // Create appropriate mock post element
            let post;
            const isTwitterUrl = url.includes('x.com') || url.includes('twitter.com');
            const isInstagramUrl = url.includes('instagram.com');
            
            if (platform === 'twitter' && isTwitterUrl) {
              post = createMockTwitterPost(url);
            } else if (platform === 'instagram' && isInstagramUrl) {
              post = createMockInstagramPost(url);
            } else {
              // Mismatched platform and URL, skip this case
              return true;
            }
            
            const extracted = extractPostUrl(post, platform);
            
            // If extraction returns non-null, it should be valid for the platform
            if (extracted !== null) {
              return validatePostUrl(extracted, platform);
            }
            
            // Null is acceptable
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 18: Twitter extraction output validity
    test('Property 18: Twitter extraction output validity', () => {
      /**
       * Feature: testing-implementation, Property 18: Twitter extraction output validity
       * Validates: Requirements 6.1
       */
      fc.assert(
        fc.property(
          fc.oneof(
            twitterUrlGen,
            fc.constant(null)
          ),
          fc.boolean(),
          (url, useStatusLink) => {
            let post;
            
            if (url === null) {
              // Create empty post
              post = createEmptyMockPost();
            } else {
              // Create post with URL
              post = useStatusLink 
                ? createMockTwitterPostWithStatusLink(url)
                : createMockTwitterPost(url);
            }
            
            const extracted = extractTweetUrl(post);
            
            // Result should be either null or a valid Twitter URL
            if (extracted === null) {
              return true;
            }
            
            return validateTwitterUrl(extracted);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 19: Instagram extraction output validity
    test('Property 19: Instagram extraction output validity', () => {
      /**
       * Feature: testing-implementation, Property 19: Instagram extraction output validity
       * Validates: Requirements 6.2
       */
      fc.assert(
        fc.property(
          fc.oneof(
            instagramUrlGen,
            fc.constant(null)
          ),
          fc.boolean(),
          (url, useHeaderLink) => {
            let post;
            
            if (url === null) {
              // Create empty post
              post = createEmptyMockPost();
            } else {
              // Create post with URL
              post = useHeaderLink 
                ? createMockInstagramPostWithHeaderLink(url)
                : createMockInstagramPost(url);
            }
            
            const extracted = extractInstagramPostUrl(post);
            
            // Result should be either null or a valid Instagram URL
            if (extracted === null) {
              return true;
            }
            
            return validateInstagramUrl(extracted);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Property 20: Extraction strategy consistency
    test('Property 20: Extraction strategy consistency', () => {
      /**
       * Feature: testing-implementation, Property 20: Extraction strategy consistency
       * Validates: Requirements 6.5
       */
      fc.assert(
        fc.property(
          fc.oneof(twitterUrlGen, instagramUrlGen),
          (url) => {
            const isTwitterUrl = url.includes('x.com') || url.includes('twitter.com');
            const isInstagramUrl = url.includes('instagram.com');
            
            if (isTwitterUrl) {
              // Create Twitter post with multiple link strategies
              const post1 = createMockTwitterPost(url); // timestamp link
              const post2 = createMockTwitterPostWithStatusLink(url); // status link
              
              const extracted1 = extractTweetUrl(post1);
              const extracted2 = extractTweetUrl(post2);
              
              // If both succeed, they should return the same URL
              if (extracted1 !== null && extracted2 !== null) {
                return extracted1 === extracted2;
              }
              
              // If one fails, that's acceptable (different strategies may have different success rates)
              return true;
            } else if (isInstagramUrl) {
              // Create Instagram post with multiple link strategies
              const post1 = createMockInstagramPost(url); // timestamp link
              const post2 = createMockInstagramPostWithHeaderLink(url); // header link
              
              const extracted1 = extractInstagramPostUrl(post1);
              const extracted2 = extractInstagramPostUrl(post2);
              
              // If both succeed, they should return the same URL (cleaned)
              if (extracted1 !== null && extracted2 !== null) {
                return extracted1 === extracted2;
              }
              
              // If one fails, that's acceptable
              return true;
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
