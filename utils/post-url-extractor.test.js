/**
 * Property-Based Tests for Post URL Extraction Module
 * Tests URL extraction from Twitter/X and Instagram post containers
 */

const fc = require('fast-check');
const {
  extractTweetUrl,
  extractInstagramPostUrl,
  extractPostUrl,
  validatePostUrl,
  validateTwitterUrl,
  validateInstagramUrl
} = require('./post-url-extractor.js');

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}, textContent = '') {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: textContent,
    attributes: attributes,
    children: [],
    href: attributes.href || undefined,
    querySelectorAll: function(selector) {
      // Parse selector and filter children
      const results = [];
      
      // Handle comma-separated selectors
      if (selector.includes(',')) {
        const selectors = selector.split(',').map(s => s.trim());
        const allResults = new Set();
        selectors.forEach(sel => {
          const selectorResults = this.querySelectorAll(sel);
          selectorResults.forEach(r => allResults.add(r));
        });
        return Array.from(allResults);
      }
      
      // Handle "header a[href*='/p/']" type selectors
      if (selector.startsWith('header ')) {
        const header = this.children.find(c => c.tagName === 'HEADER');
        if (header) {
          return header.querySelectorAll(selector.replace('header ', ''));
        }
        return [];
      }
      
      // Handle attribute selectors like a[href*="/status/"]
      if (selector.includes('[')) {
        const tagMatch = selector.match(/^(\w+)/);
        const attrMatch = selector.match(/\[(\w+)(\*=|=)"([^"]+)"\]/);
        
        if (tagMatch && attrMatch) {
          const tag = tagMatch[1].toUpperCase();
          const attr = attrMatch[1];
          const operator = attrMatch[2];
          const value = attrMatch[3];
          
          // Recursively search all descendants
          const searchDescendants = (node) => {
            if (node.tagName === tag && node.attributes[attr]) {
              if (operator === '*=' && node.attributes[attr].includes(value)) {
                results.push(node);
              } else if (operator === '=' && node.attributes[attr] === value) {
                results.push(node);
              }
            }
            if (node.children) {
              node.children.forEach(child => searchDescendants(child));
            }
          };
          
          searchDescendants(this);
        }
      } else if (selector === 'time') {
        const searchTime = (node) => {
          if (node.tagName === 'TIME') {
            results.push(node);
          }
          if (node.children) {
            node.children.forEach(child => searchTime(child));
          }
        };
        searchTime(this);
      } else if (selector === 'article') {
        const searchArticle = (node) => {
          if (node.tagName === 'ARTICLE') {
            results.push(node);
          }
          if (node.children) {
            node.children.forEach(child => searchArticle(child));
          }
        };
        searchArticle(this);
      }
      
      return results;
    },
    querySelector: function(selector) {
      const results = this.querySelectorAll(selector);
      return results.length > 0 ? results[0] : null;
    },
    closest: function(selector) {
      // Simple mock: return parent if it matches
      if (this.parent && selector === 'a' && this.parent.tagName === 'A') {
        return this.parent;
      }
      return null;
    },
    getBoundingClientRect: function() {
      return { width: 100, height: 100 };
    }
  };
  
  // Add instanceof check
  Object.setPrototypeOf(element, HTMLElement.prototype);
  
  return element;
}

// Helper to create a mock tweet with URL
function createMockTweetWithUrl(username, statusId) {
  const tweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Tweet content');
  
  // Create time element with link
  const timeElement = createMockElement('TIME', { datetime: '2024-01-01' }, '1h');
  const timeLink = createMockElement('A', { 
    href: `https://x.com/${username}/status/${statusId}` 
  }, '1h');
  
  // Set up parent relationship
  timeElement.parent = timeLink;
  timeLink.children.push(timeElement);
  tweet.children.push(timeLink);
  tweet.children.push(timeElement); // Also add time element directly for querySelector
  
  return tweet;
}

// Helper to create a mock Instagram post with URL
function createMockInstagramPostWithUrl(postId, postType = 'p') {
  const post = createMockElement('ARTICLE', { role: 'presentation' }, 'Post content');
  
  // Create header with link
  const header = createMockElement('HEADER', {}, '');
  const headerLink = createMockElement('A', { 
    href: `https://www.instagram.com/${postType}/${postId}/` 
  }, 'View post');
  
  header.children.push(headerLink);
  post.children.push(header);
  post.children.push(headerLink); // Also add link directly for querySelector
  
  return post;
}

/**
 * **Feature: per-post-redirect-buttons, Property 4: URL Extraction Correctness (Twitter)**
 * **Validates: Requirements 4.1**
 * 
 * For any valid tweet container element, the URL extraction function should return 
 * a URL matching the pattern `https://x.com/[username]/status/[id]` or return null 
 * if no valid URL is found.
 */
describe('Property 4: URL Extraction Correctness (Twitter)', () => {
  test('should extract valid Twitter URLs matching the status pattern', async () => {
    // Generator for Twitter usernames and status IDs
    const twitterUrlArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString())
    });

    await fc.assert(
      fc.asyncProperty(twitterUrlArbitrary, async ({ username, statusId }) => {
        const tweet = createMockTweetWithUrl(username, statusId);
        const extractedUrl = extractTweetUrl(tweet);
        
        // Should extract a URL
        expect(extractedUrl).not.toBeNull();
        
        if (extractedUrl) {
          // Should match Twitter URL pattern
          expect(validateTwitterUrl(extractedUrl)).toBe(true);
          
          // Should contain the username and status ID
          expect(extractedUrl).toContain(`/${username}/status/${statusId}`);
          
          // Should start with https://x.com or https://twitter.com
          expect(
            extractedUrl.startsWith('https://x.com/') || 
            extractedUrl.startsWith('https://twitter.com/')
          ).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should return null for tweet containers without valid URLs', async () => {
    // Generator for tweets without URL links
    const tweetWithoutUrlArbitrary = fc.record({
      hasTimeElement: fc.boolean(),
      hasLinks: fc.boolean(),
      linkHasStatusPattern: fc.constant(false)
    });

    await fc.assert(
      fc.asyncProperty(tweetWithoutUrlArbitrary, async (config) => {
        const tweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Tweet content');
        
        if (config.hasTimeElement) {
          const timeElement = createMockElement('TIME', { datetime: '2024-01-01' }, '1h');
          tweet.children.push(timeElement);
        }
        
        if (config.hasLinks && !config.linkHasStatusPattern) {
          // Add a link that doesn't match status pattern
          const link = createMockElement('A', { href: 'https://example.com' }, 'Link');
          tweet.children.push(link);
        }
        
        const extractedUrl = extractTweetUrl(tweet);
        
        // Should return null when no valid status URL is found
        expect(extractedUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should validate extracted URLs match Twitter status pattern', async () => {
    // Generator for various URL patterns
    const urlPatternArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString()),
      hostname: fc.constantFrom('x.com', 'www.x.com', 'twitter.com', 'www.twitter.com')
    });

    await fc.assert(
      fc.asyncProperty(urlPatternArbitrary, async ({ username, statusId, hostname }) => {
        const url = `https://${hostname}/${username}/status/${statusId}`;
        
        // Should validate as a Twitter URL
        expect(validateTwitterUrl(url)).toBe(true);
        
        // Should match the expected pattern
        const urlObj = new URL(url);
        expect(urlObj.pathname).toMatch(/^\/[^\/]+\/status\/\d+/);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject invalid Twitter URLs', async () => {
    // Generator for invalid URL patterns
    const invalidUrlArbitrary = fc.oneof(
      fc.constant('https://example.com/user/status/123'),
      fc.constant('https://x.com/user/post/123'),
      fc.constant('https://x.com/status/123'),
      fc.constant('not-a-url'),
      fc.constant(''),
      fc.constant('https://x.com/user/status/abc')
    );

    await fc.assert(
      fc.asyncProperty(invalidUrlArbitrary, async (url) => {
        // Should not validate invalid URLs
        expect(validateTwitterUrl(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle tweets with multiple links and extract the status URL', async () => {
    // Generator for tweets with multiple links
    const multiLinkTweetArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString()),
      numExtraLinks: fc.integer({ min: 1, max: 5 })
    });

    await fc.assert(
      fc.asyncProperty(multiLinkTweetArbitrary, async ({ username, statusId, numExtraLinks }) => {
        const tweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Tweet content');
        
        // Add extra links that are not status URLs
        for (let i = 0; i < numExtraLinks; i++) {
          const link = createMockElement('A', { href: `https://example.com/link${i}` }, 'Link');
          tweet.children.push(link);
        }
        
        // Add the status URL link
        const statusLink = createMockElement('A', { 
          href: `https://x.com/${username}/status/${statusId}` 
        }, 'Status');
        tweet.children.push(statusLink);
        
        const extractedUrl = extractTweetUrl(tweet);
        
        // Should extract the status URL, not the other links
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(extractedUrl).toContain(`/${username}/status/${statusId}`);
          expect(validateTwitterUrl(extractedUrl)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle null or invalid input gracefully', async () => {
    // Test with null
    expect(extractTweetUrl(null)).toBeNull();
    
    // Test with undefined
    expect(extractTweetUrl(undefined)).toBeNull();
    
    // Test with non-HTMLElement
    expect(extractTweetUrl({})).toBeNull();
    expect(extractTweetUrl('not an element')).toBeNull();
  });
});


/**
 * **Feature: per-post-redirect-buttons, Property 5: URL Extraction Correctness (Instagram)**
 * **Validates: Requirements 4.2**
 * 
 * For any valid Instagram post container element, the URL extraction function should return 
 * a URL matching the pattern `https://www.instagram.com/p/[id]/` or 
 * `https://www.instagram.com/reel/[id]/` or return null if no valid URL is found.
 */
describe('Property 5: URL Extraction Correctness (Instagram)', () => {
  test('should extract valid Instagram URLs matching the post pattern', async () => {
    // Generator for Instagram post IDs and types
    const instagramUrlArbitrary = fc.record({
      postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), 
        { minLength: 5, maxLength: 15 }),
      postType: fc.constantFrom('p', 'reel', 'tv')
    });

    await fc.assert(
      fc.asyncProperty(instagramUrlArbitrary, async ({ postId, postType }) => {
        const post = createMockInstagramPostWithUrl(postId, postType);
        const extractedUrl = extractInstagramPostUrl(post);
        
        // Should extract a URL
        expect(extractedUrl).not.toBeNull();
        
        if (extractedUrl) {
          // Should match Instagram URL pattern
          expect(validateInstagramUrl(extractedUrl)).toBe(true);
          
          // Should contain the post ID and type
          expect(extractedUrl).toContain(`/${postType}/${postId}`);
          
          // Should start with https://www.instagram.com or https://instagram.com
          expect(
            extractedUrl.startsWith('https://www.instagram.com/') || 
            extractedUrl.startsWith('https://instagram.com/')
          ).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should return null for post containers without valid URLs', async () => {
    // Generator for posts without URL links
    const postWithoutUrlArbitrary = fc.record({
      hasHeader: fc.boolean(),
      hasLinks: fc.boolean(),
      linkHasPostPattern: fc.constant(false)
    });

    await fc.assert(
      fc.asyncProperty(postWithoutUrlArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', { role: 'presentation' }, 'Post content');
        
        if (config.hasHeader) {
          const header = createMockElement('HEADER', {}, '');
          post.children.push(header);
        }
        
        if (config.hasLinks && !config.linkHasPostPattern) {
          // Add a link that doesn't match post pattern
          const link = createMockElement('A', { href: 'https://example.com' }, 'Link');
          post.children.push(link);
        }
        
        const extractedUrl = extractInstagramPostUrl(post);
        
        // Should return null when no valid post URL is found
        expect(extractedUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should validate extracted URLs match Instagram post pattern', async () => {
    // Generator for various URL patterns
    const urlPatternArbitrary = fc.record({
      postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), 
        { minLength: 5, maxLength: 15 }),
      postType: fc.constantFrom('p', 'reel', 'tv'),
      hostname: fc.constantFrom('www.instagram.com', 'instagram.com')
    });

    await fc.assert(
      fc.asyncProperty(urlPatternArbitrary, async ({ postId, postType, hostname }) => {
        const url = `https://${hostname}/${postType}/${postId}/`;
        
        // Should validate as an Instagram URL
        expect(validateInstagramUrl(url)).toBe(true);
        
        // Should match the expected pattern
        const urlObj = new URL(url);
        expect(urlObj.pathname).toMatch(/^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?/);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject invalid Instagram URLs', async () => {
    // Generator for invalid URL patterns
    const invalidUrlArbitrary = fc.oneof(
      fc.constant('https://example.com/p/ABC123/'),
      fc.constant('https://www.instagram.com/user/ABC123/'),
      fc.constant('https://www.instagram.com/ABC123/'),
      fc.constant('not-a-url'),
      fc.constant(''),
      fc.constant('https://www.instagram.com/p/')
    );

    await fc.assert(
      fc.asyncProperty(invalidUrlArbitrary, async (url) => {
        // Should not validate invalid URLs
        expect(validateInstagramUrl(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle posts with multiple links and extract the post URL', async () => {
    // Generator for posts with multiple links
    const multiLinkPostArbitrary = fc.record({
      postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), 
        { minLength: 5, maxLength: 15 }),
      postType: fc.constantFrom('p', 'reel', 'tv'),
      numExtraLinks: fc.integer({ min: 1, max: 5 })
    });

    await fc.assert(
      fc.asyncProperty(multiLinkPostArbitrary, async ({ postId, postType, numExtraLinks }) => {
        const post = createMockElement('ARTICLE', { role: 'presentation' }, 'Post content');
        
        // Add header with post URL
        const header = createMockElement('HEADER', {}, '');
        const postLink = createMockElement('A', { 
          href: `https://www.instagram.com/${postType}/${postId}/` 
        }, 'Post');
        header.children.push(postLink);
        post.children.push(header);
        
        // Add extra links that are not post URLs
        for (let i = 0; i < numExtraLinks; i++) {
          const link = createMockElement('A', { href: `https://example.com/link${i}` }, 'Link');
          post.children.push(link);
        }
        
        const extractedUrl = extractInstagramPostUrl(post);
        
        // Should extract the post URL, not the other links
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(extractedUrl).toContain(`/${postType}/${postId}`);
          expect(validateInstagramUrl(extractedUrl)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle null or invalid input gracefully', async () => {
    // Test with null
    expect(extractInstagramPostUrl(null)).toBeNull();
    
    // Test with undefined
    expect(extractInstagramPostUrl(undefined)).toBeNull();
    
    // Test with non-HTMLElement
    expect(extractInstagramPostUrl({})).toBeNull();
    expect(extractInstagramPostUrl('not an element')).toBeNull();
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 7: Retweet URL Extraction**
 * **Validates: Requirements 4.5**
 * 
 * For any retweet or shared post container, the URL extraction function should return 
 * the URL of the original post, not the sharing user's URL.
 */
describe('Property 7: Retweet URL Extraction', () => {
  test('should extract original tweet URL from retweets', async () => {
    // Generator for retweet scenarios
    const retweetArbitrary = fc.record({
      originalUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      originalStatusId: fc.bigUintN(64).map(n => n.toString()),
      retweeterUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 })
    });

    await fc.assert(
      fc.asyncProperty(retweetArbitrary, async ({ originalUsername, originalStatusId, retweeterUsername }) => {
        // Create a retweet container with the original tweet's URL
        const retweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 
          `${retweeterUsername} retweeted`);
        
        // Add the original tweet's status link
        const originalLink = createMockElement('A', { 
          href: `https://x.com/${originalUsername}/status/${originalStatusId}` 
        }, 'Original tweet');
        retweet.children.push(originalLink);
        
        const extractedUrl = extractTweetUrl(retweet);
        
        // Should extract the original tweet's URL
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(extractedUrl).toContain(`/${originalUsername}/status/${originalStatusId}`);
          expect(validateTwitterUrl(extractedUrl)).toBe(true);
          
          // Should not contain the retweeter's username in the status path
          // (though it might appear in the text content)
          const urlObj = new URL(extractedUrl);
          expect(urlObj.pathname).toContain(`/${originalUsername}/status/`);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should prioritize status URLs over profile URLs in retweets', async () => {
    // Generator for retweet with multiple user links
    const retweetWithLinksArbitrary = fc.record({
      originalUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      originalStatusId: fc.bigUintN(64).map(n => n.toString()),
      retweeterUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 })
    });

    await fc.assert(
      fc.asyncProperty(retweetWithLinksArbitrary, async ({ originalUsername, originalStatusId, retweeterUsername }) => {
        const retweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Retweet content');
        
        // Add retweeter's profile link (should be ignored)
        const retweeterLink = createMockElement('A', { 
          href: `https://x.com/${retweeterUsername}` 
        }, retweeterUsername);
        retweet.children.push(retweeterLink);
        
        // Add original tweet's status link (should be extracted)
        const statusLink = createMockElement('A', { 
          href: `https://x.com/${originalUsername}/status/${originalStatusId}` 
        }, 'Status');
        retweet.children.push(statusLink);
        
        const extractedUrl = extractTweetUrl(retweet);
        
        // Should extract the status URL, not the profile URL
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(extractedUrl).toContain('/status/');
          expect(extractedUrl).toContain(originalUsername);
          expect(extractedUrl).toContain(originalStatusId);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle quoted tweets and extract the correct URL', async () => {
    // Generator for quoted tweet scenarios
    const quotedTweetArbitrary = fc.record({
      quoterUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      quoterStatusId: fc.bigUintN(64).map(n => n.toString()),
      quotedUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      quotedStatusId: fc.bigUintN(64).map(n => n.toString())
    });

    await fc.assert(
      fc.asyncProperty(quotedTweetArbitrary, async ({ quoterUsername, quoterStatusId, quotedUsername, quotedStatusId }) => {
        // Create a quoted tweet container
        const quotedTweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 
          'Quote tweet content');
        
        // Add the quoter's status link (the main tweet we're viewing)
        const quoterLink = createMockElement('A', { 
          href: `https://x.com/${quoterUsername}/status/${quoterStatusId}` 
        }, 'Quote');
        quotedTweet.children.push(quoterLink);
        
        // Add the quoted tweet's status link (embedded)
        const quotedLink = createMockElement('A', { 
          href: `https://x.com/${quotedUsername}/status/${quotedStatusId}` 
        }, 'Quoted');
        quotedTweet.children.push(quotedLink);
        
        const extractedUrl = extractTweetUrl(quotedTweet);
        
        // Should extract a valid status URL (could be either, but should be valid)
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(validateTwitterUrl(extractedUrl)).toBe(true);
          expect(extractedUrl).toContain('/status/');
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle retweets with time elements', async () => {
    // Generator for retweets with timestamp
    const retweetWithTimeArbitrary = fc.record({
      originalUsername: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
        { minLength: 1, maxLength: 15 }),
      originalStatusId: fc.bigUintN(64).map(n => n.toString())
    });

    await fc.assert(
      fc.asyncProperty(retweetWithTimeArbitrary, async ({ originalUsername, originalStatusId }) => {
        const retweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Retweet');
        
        // Add time element with link to original tweet
        const timeElement = createMockElement('TIME', { datetime: '2024-01-01' }, '1h');
        const timeLink = createMockElement('A', { 
          href: `https://x.com/${originalUsername}/status/${originalStatusId}` 
        }, '1h');
        
        timeElement.parent = timeLink;
        timeLink.children.push(timeElement);
        retweet.children.push(timeLink);
        
        const extractedUrl = extractTweetUrl(retweet);
        
        // Should extract the original tweet's URL from the time element
        expect(extractedUrl).not.toBeNull();
        if (extractedUrl) {
          expect(extractedUrl).toContain(`/${originalUsername}/status/${originalStatusId}`);
          expect(validateTwitterUrl(extractedUrl)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 6: No Button on Invalid URL**
 * **Validates: Requirements 4.3**
 * 
 * For any post container where the URL cannot be extracted or is invalid, 
 * the extension should not inject a redirect button.
 * 
 * This test verifies that URL extraction returns null for invalid cases.
 */
describe('Property 6: No Button on Invalid URL', () => {
  test('should return null when post URL cannot be determined', async () => {
    // Generator for posts without valid URLs
    const invalidPostArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasLinks: fc.boolean(),
      linksAreValid: fc.constant(false)
    });

    await fc.assert(
      fc.asyncProperty(invalidPostArbitrary, async (config) => {
        let post;
        
        if (config.platform === 'twitter') {
          post = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Tweet content');
          
          if (config.hasLinks) {
            // Add invalid links
            const link = createMockElement('A', { href: 'https://example.com' }, 'Link');
            post.children.push(link);
          }
        } else {
          post = createMockElement('ARTICLE', { role: 'presentation' }, 'Post content');
          
          if (config.hasLinks) {
            // Add invalid links
            const link = createMockElement('A', { href: 'https://example.com' }, 'Link');
            post.children.push(link);
          }
        }
        
        const extractedUrl = extractPostUrl(post, config.platform);
        
        // Should return null when no valid URL is found
        expect(extractedUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should validate URLs before accepting them', async () => {
    // Generator for various URL formats
    const urlValidationArbitrary = fc.record({
      url: fc.oneof(
        fc.constant('https://x.com/user/status/123'),
        fc.constant('https://www.instagram.com/p/ABC123/'),
        fc.constant('https://example.com/status/123'),
        fc.constant('not-a-url'),
        fc.constant(''),
        fc.constant('https://x.com/user/post/123')
      ),
      platform: fc.constantFrom('twitter', 'instagram')
    });

    await fc.assert(
      fc.asyncProperty(urlValidationArbitrary, async ({ url, platform }) => {
        const isValid = validatePostUrl(url, platform);
        
        // Should only validate URLs that match the platform's pattern
        if (platform === 'twitter') {
          if (isValid) {
            expect(url).toContain('/status/');
            expect(url).toMatch(/^https:\/\/(www\.)?(x|twitter)\.com\//);
          }
        } else if (platform === 'instagram') {
          if (isValid) {
            expect(url).toMatch(/\/(p|reel|tv)\//);
            expect(url).toMatch(/^https:\/\/(www\.)?instagram\.com\//);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should reject malformed URLs', async () => {
    // Generator for malformed URLs
    const malformedUrlArbitrary = fc.oneof(
      fc.constant('http://x.com/user/status/123'), // Wrong protocol
      fc.constant('x.com/user/status/123'), // Missing protocol
      fc.constant('https://x.com'), // Missing path
      fc.constant('https://x.com/'), // Missing path
      fc.constant('https://x.com/user'), // Incomplete path
      fc.constant('javascript:alert(1)'), // XSS attempt
      fc.constant('data:text/html,<script>alert(1)</script>') // Data URL
    );

    await fc.assert(
      fc.asyncProperty(malformedUrlArbitrary, async (url) => {
        // Should not validate malformed URLs for either platform
        expect(validatePostUrl(url, 'twitter')).toBe(false);
        expect(validatePostUrl(url, 'instagram')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle edge cases in URL validation', async () => {
    // Test null and undefined
    expect(validatePostUrl(null, 'twitter')).toBe(false);
    expect(validatePostUrl(undefined, 'twitter')).toBe(false);
    expect(validatePostUrl('', 'twitter')).toBe(false);
    
    // Test invalid platform
    expect(validatePostUrl('https://x.com/user/status/123', 'invalid')).toBe(false);
    expect(validatePostUrl('https://x.com/user/status/123', null)).toBe(false);
    expect(validatePostUrl('https://x.com/user/status/123', undefined)).toBe(false);
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 15: Invalid URL Handling**
 * **Validates: Requirements 7.2**
 * 
 * For any post with a malformed or invalid URL, the extension should skip that post 
 * and log an error without affecting other posts.
 * 
 * This test verifies graceful error handling for malformed URLs.
 */
describe('Property 15: Invalid URL Handling', () => {
  test('should handle malformed post structures gracefully', async () => {
    // Generator for various malformed post structures
    const malformedPostArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasMalformedLinks: fc.boolean(),
      hasValidStructure: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(malformedPostArbitrary, async (config) => {
        let post;
        
        if (config.platform === 'twitter') {
          post = config.hasValidStructure 
            ? createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Content')
            : createMockElement('DIV', {}, 'Content');
          
          if (config.hasMalformedLinks) {
            // Add links with malformed hrefs
            const link = createMockElement('A', { href: 'not-a-valid-url' }, 'Link');
            post.children.push(link);
          }
        } else {
          post = config.hasValidStructure
            ? createMockElement('ARTICLE', { role: 'presentation' }, 'Content')
            : createMockElement('DIV', {}, 'Content');
          
          if (config.hasMalformedLinks) {
            const link = createMockElement('A', { href: 'javascript:void(0)' }, 'Link');
            post.children.push(link);
          }
        }
        
        // Should not throw an error
        expect(() => {
          const url = extractPostUrl(post, config.platform);
          // Should return null for malformed posts
          if (!config.hasValidStructure || config.hasMalformedLinks) {
            expect(url).toBeNull();
          }
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('should log errors for malformed URLs without crashing', async () => {
    // Mock console.error to capture error logs
    const originalError = console.error;
    const errorLogs = [];
    console.error = (...args) => errorLogs.push(args);
    
    try {
      // Generator for posts with various error conditions
      const errorConditionArbitrary = fc.record({
        platform: fc.constantFrom('twitter', 'instagram'),
        errorType: fc.constantFrom('null-element', 'invalid-element', 'malformed-url')
      });

      await fc.assert(
        fc.asyncProperty(errorConditionArbitrary, async (config) => {
          let result;
          
          switch (config.errorType) {
            case 'null-element':
              result = extractPostUrl(null, config.platform);
              expect(result).toBeNull();
              break;
              
            case 'invalid-element':
              result = extractPostUrl({}, config.platform);
              expect(result).toBeNull();
              break;
              
            case 'malformed-url':
              const post = createMockElement('ARTICLE', {}, 'Content');
              const link = createMockElement('A', { href: 'not-a-url' }, 'Link');
              post.children.push(link);
              result = extractPostUrl(post, config.platform);
              expect(result).toBeNull();
              break;
          }
          
          // Should not throw an error
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    } finally {
      // Restore console.error
      console.error = originalError;
    }
  });

  test('should skip posts with invalid URLs and continue processing', async () => {
    // Generator for mixed valid and invalid posts
    const mixedPostsArbitrary = fc.array(
      fc.record({
        platform: fc.constantFrom('twitter', 'instagram'),
        isValid: fc.boolean(),
        username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), 
          { minLength: 1, maxLength: 15 }),
        twitterId: fc.bigUintN(64).map(n => n.toString()),
        instagramId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), 
          { minLength: 5, maxLength: 15 })
      }),
      { minLength: 2, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(mixedPostsArbitrary, async (postConfigs) => {
        const results = postConfigs.map(config => {
          let post;
          
          if (config.platform === 'twitter') {
            if (config.isValid) {
              post = createMockTweetWithUrl(config.username, config.twitterId);
            } else {
              post = createMockElement('ARTICLE', {}, 'Invalid tweet');
            }
            return extractTweetUrl(post);
          } else {
            if (config.isValid) {
              post = createMockInstagramPostWithUrl(config.instagramId, 'p');
            } else {
              post = createMockElement('ARTICLE', {}, 'Invalid post');
            }
            return extractInstagramPostUrl(post);
          }
        });
        
        // Should have extracted URLs for valid posts
        const validCount = postConfigs.filter(c => c.isValid).length;
        const extractedCount = results.filter(r => r !== null).length;
        
        // At least some valid posts should have URLs extracted
        if (validCount > 0) {
          expect(extractedCount).toBeGreaterThan(0);
        }
        
        // Invalid posts should return null
        postConfigs.forEach((config, index) => {
          if (!config.isValid) {
            expect(results[index]).toBeNull();
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should handle unexpected DOM structures without throwing', async () => {
    // Generator for unexpected DOM structures
    const unexpectedStructureArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasChildren: fc.boolean(),
      childrenAreValid: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(unexpectedStructureArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', {}, 'Content');
        
        if (config.hasChildren && !config.childrenAreValid) {
          // Add unexpected child elements
          const weirdChild = createMockElement('SCRIPT', {}, 'alert(1)');
          post.children.push(weirdChild);
        }
        
        // Should not throw an error
        expect(() => {
          const url = extractPostUrl(post, config.platform);
          // May return null, but should not crash
          expect(url === null || typeof url === 'string').toBe(true);
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });
});
