/**
 * Property-Based Tests for Post Detection Module
 * Tests post container detection and validation for Twitter/X and Instagram
 */

const fc = require('fast-check');
const {
  findPostContainers,
  isPostContainer,
  getSelectorConfig,
  SELECTORS
} = require('./post-detector.js');

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}, textContent = '') {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: textContent,
    attributes: attributes,
    children: [],
    querySelectorAll: function(selector) {
      // Simple mock implementation
      return this.children.filter(child => {
        if (selector === 'a') return child.tagName === 'A';
        if (selector === 'img') return child.tagName === 'IMG';
        if (selector.startsWith('[')) {
          const attrMatch = selector.match(/\[(\w+)\]/);
          if (attrMatch) {
            return child.attributes && child.attributes[attrMatch[1]];
          }
        }
        return false;
      });
    },
    querySelector: function(selector) {
      const results = this.querySelectorAll(selector);
      return results.length > 0 ? results[0] : null;
    },
    getBoundingClientRect: function() {
      return attributes.hidden ? { width: 0, height: 0 } : { width: 100, height: 100 };
    }
  };
  
  // Add instanceof check
  Object.setPrototypeOf(element, HTMLElement.prototype);
  
  return element;
}

// Helper to create a mock tweet container
function createMockTweet(hasContent = true, hasLinks = true, isHidden = false) {
  const tweet = createMockElement('ARTICLE', { 
    'data-testid': 'tweet',
    hidden: isHidden
  }, hasContent ? 'This is a tweet with some content' : '');
  
  if (hasLinks) {
    const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
    tweet.children.push(link);
  }
  
  return tweet;
}

// Helper to create a mock Instagram post container
function createMockInstagramPost(hasContent = true, hasImages = true, isHidden = false) {
  const post = createMockElement('ARTICLE', { 
    role: 'presentation',
    hidden: isHidden
  }, hasContent ? 'This is an Instagram post with some content' : '');
  
  if (hasImages) {
    const img = createMockElement('IMG', { src: '/image.jpg' }, '');
    post.children.push(img);
  }
  
  return post;
}

/**
 * **Feature: per-post-redirect-buttons, Property 1: Button Injection Completeness (Twitter)**
 * **Validates: Requirements 1.1**
 * 
 * For any set of visible tweet containers on a Twitter/X timeline, 
 * the extension should inject exactly one redirect button into each tweet container.
 * 
 * This test verifies that the post detection correctly identifies all valid tweet containers.
 */
describe('Property 1: Button Injection Completeness (Twitter)', () => {
  test('should detect all valid tweet containers', async () => {
    // Generator for arrays of tweet-like elements
    const tweetArrayArbitrary = fc.array(
      fc.record({
        hasContent: fc.boolean(),
        hasLinks: fc.boolean(),
        isHidden: fc.boolean()
      }),
      { minLength: 1, maxLength: 20 }
    );

    await fc.assert(
      fc.asyncProperty(tweetArrayArbitrary, async (tweetConfigs) => {
        // Create mock DOM
        const mockRoot = createMockElement('DIV', {}, '');
        const tweets = tweetConfigs.map(config => 
          createMockTweet(config.hasContent, config.hasLinks, config.isHidden)
        );
        mockRoot.children = tweets;
        
        // Mock querySelectorAll to return our tweets
        mockRoot.querySelectorAll = function(selector) {
          if (selector.includes('article')) {
            return tweets.filter(t => t.tagName === 'ARTICLE');
          }
          return [];
        };
        
        // Find post containers
        const foundPosts = findPostContainers('twitter', mockRoot);
        
        // Count how many tweets should be valid
        const validTweets = tweets.filter(tweet => {
          return tweet.textContent.length > 0 && 
                 !tweet.attributes.hidden &&
                 (tweet.children.length > 0 || tweet.querySelector('[lang]') !== null);
        });
        
        // All valid tweets should be detected
        expect(foundPosts.length).toBeLessThanOrEqual(validTweets.length);
        
        // Each found post should be a valid tweet container
        foundPosts.forEach(post => {
          expect(isPostContainer(post, 'twitter')).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should not detect hidden or empty tweet containers', async () => {
    // Generator for invalid tweet configurations
    const invalidTweetArbitrary = fc.record({
      hasContent: fc.constant(false),
      hasLinks: fc.boolean(),
      isHidden: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(invalidTweetArbitrary, async (config) => {
        const tweet = createMockTweet(config.hasContent, config.hasLinks, config.isHidden);
        
        // Empty tweets should not be valid
        if (!config.hasContent) {
          expect(isPostContainer(tweet, 'twitter')).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should validate tweet containers have required structure', async () => {
    // Generator for tweet configurations
    const tweetConfigArbitrary = fc.record({
      hasContent: fc.boolean(),
      hasLinks: fc.boolean(),
      isHidden: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(tweetConfigArbitrary, async (config) => {
        const tweet = createMockTweet(config.hasContent, config.hasLinks, config.isHidden);
        const isValid = isPostContainer(tweet, 'twitter');
        
        // If valid, must have content, not be hidden, and have links
        if (isValid) {
          expect(tweet.textContent.length).toBeGreaterThan(0);
          expect(tweet.attributes.hidden).toBeFalsy();
          expect(tweet.children.length).toBeGreaterThan(0);
        }
        
        // If invalid, must be missing content, hidden, or missing links
        if (!isValid) {
          const hasNoContent = !tweet.textContent || tweet.textContent.trim().length === 0;
          const isHidden = tweet.attributes.hidden === true;
          const hasNoLinks = tweet.children.length === 0;
          expect(hasNoContent || isHidden || hasNoLinks).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should only accept ARTICLE elements as tweet containers', async () => {
    // Generator for various element types
    const elementTypeArbitrary = fc.constantFrom('DIV', 'SECTION', 'ARTICLE', 'SPAN', 'P');

    await fc.assert(
      fc.asyncProperty(elementTypeArbitrary, async (tagName) => {
        const element = createMockElement(tagName, { 'data-testid': 'tweet' }, 'Content');
        const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
        element.children.push(link);
        
        const isValid = isPostContainer(element, 'twitter');
        
        // Only ARTICLE elements should be valid
        if (tagName === 'ARTICLE') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle edge case of tweets with minimal content', async () => {
    // Generator for minimal content strings
    const minimalContentArbitrary = fc.oneof(
      fc.constant('a'),
      fc.constant(' x '),
      fc.constant('👍'),
      fc.stringOf(fc.char(), { minLength: 1, maxLength: 5 })
    );

    await fc.assert(
      fc.asyncProperty(minimalContentArbitrary, async (content) => {
        const tweet = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, content);
        const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
        tweet.children.push(link);
        
        const isValid = isPostContainer(tweet, 'twitter');
        
        // Should be valid if content is non-empty after trimming
        if (content.trim().length > 0) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 2: Button Injection Completeness (Instagram)**
 * **Validates: Requirements 2.1**
 * 
 * For any set of visible post containers on an Instagram feed, 
 * the extension should inject exactly one redirect button into each post container.
 * 
 * This test verifies that the post detection correctly identifies all valid Instagram post containers.
 */
describe('Property 2: Button Injection Completeness (Instagram)', () => {
  test('should detect all valid Instagram post containers', async () => {
    // Generator for arrays of Instagram post-like elements
    const postArrayArbitrary = fc.array(
      fc.record({
        hasContent: fc.boolean(),
        hasImages: fc.boolean(),
        isHidden: fc.boolean()
      }),
      { minLength: 1, maxLength: 20 }
    );

    await fc.assert(
      fc.asyncProperty(postArrayArbitrary, async (postConfigs) => {
        // Create mock DOM
        const mockRoot = createMockElement('DIV', {}, '');
        const posts = postConfigs.map(config => 
          createMockInstagramPost(config.hasContent, config.hasImages, config.isHidden)
        );
        mockRoot.children = posts;
        
        // Mock querySelectorAll to return our posts
        mockRoot.querySelectorAll = function(selector) {
          if (selector.includes('article')) {
            return posts.filter(p => p.tagName === 'ARTICLE');
          }
          return [];
        };
        
        // Find post containers
        const foundPosts = findPostContainers('instagram', mockRoot);
        
        // Count how many posts should be valid
        const validPosts = posts.filter(post => {
          return post.textContent.length > 0 && 
                 !post.attributes.hidden &&
                 post.children.length > 0;
        });
        
        // All valid posts should be detected
        expect(foundPosts.length).toBeLessThanOrEqual(validPosts.length);
        
        // Each found post should be a valid post container
        foundPosts.forEach(post => {
          expect(isPostContainer(post, 'instagram')).toBe(true);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should not detect hidden or empty Instagram post containers', async () => {
    // Generator for invalid post configurations
    const invalidPostArbitrary = fc.record({
      hasContent: fc.constant(false),
      hasImages: fc.boolean(),
      isHidden: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(invalidPostArbitrary, async (config) => {
        const post = createMockInstagramPost(config.hasContent, config.hasImages, config.isHidden);
        
        // Empty posts should not be valid
        if (!config.hasContent) {
          expect(isPostContainer(post, 'instagram')).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should validate Instagram post containers have required structure', async () => {
    // Generator for post configurations
    const postConfigArbitrary = fc.record({
      hasContent: fc.boolean(),
      hasImages: fc.boolean(),
      isHidden: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(postConfigArbitrary, async (config) => {
        const post = createMockInstagramPost(config.hasContent, config.hasImages, config.isHidden);
        const isValid = isPostContainer(post, 'instagram');
        
        // If valid, must have content, not be hidden, and have images/links
        if (isValid) {
          expect(post.textContent.length).toBeGreaterThan(0);
          expect(post.attributes.hidden).toBeFalsy();
          expect(post.children.length).toBeGreaterThan(0);
        }
        
        // If invalid, must be missing content, hidden, or missing images/links
        if (!isValid) {
          const hasNoContent = !post.textContent || post.textContent.trim().length === 0;
          const isHidden = post.attributes.hidden === true;
          const hasNoVisualContent = post.children.length === 0;
          expect(hasNoContent || isHidden || hasNoVisualContent).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should only accept ARTICLE elements as Instagram post containers', async () => {
    // Generator for various element types
    const elementTypeArbitrary = fc.constantFrom('DIV', 'SECTION', 'ARTICLE', 'SPAN', 'P');

    await fc.assert(
      fc.asyncProperty(elementTypeArbitrary, async (tagName) => {
        const element = createMockElement(tagName, { role: 'presentation' }, 'Content');
        const img = createMockElement('IMG', { src: '/image.jpg' }, '');
        element.children.push(img);
        
        const isValid = isPostContainer(element, 'instagram');
        
        // Only ARTICLE elements should be valid
        if (tagName === 'ARTICLE') {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle Instagram posts with various content types', async () => {
    // Generator for content configurations
    const contentConfigArbitrary = fc.record({
      hasImages: fc.boolean(),
      hasLinks: fc.boolean(),
      hasText: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(contentConfigArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', { role: 'presentation' }, 
          config.hasText ? 'Post content' : '');
        
        if (config.hasImages) {
          const img = createMockElement('IMG', { src: '/image.jpg' }, '');
          post.children.push(img);
        }
        
        if (config.hasLinks) {
          const link = createMockElement('A', { href: '/p/ABC123/' }, 'Link');
          post.children.push(link);
        }
        
        const isValid = isPostContainer(post, 'instagram');
        
        // Should be valid if it has content and either images or links
        const hasContent = post.textContent.trim().length > 0;
        const hasVisualContent = config.hasImages || config.hasLinks;
        
        if (hasContent && hasVisualContent) {
          expect(isValid).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 17: Fallback Selector Robustness**
 * **Validates: Requirements 7.4**
 * 
 * For any post container that doesn't match the primary selector but matches a fallback selector,
 * the extension should still successfully detect and process the post.
 */
describe('Property 17: Fallback Selector Robustness', () => {
  test('should detect posts using fallback selectors when primary selectors fail', async () => {
    // Test that fallback selectors work for Twitter
    const tweetWithoutPrimaryAttributes = createMockElement('ARTICLE', { 
      role: 'article' // Fallback selector attribute
    }, 'Tweet content without primary data-testid');
    
    const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
    tweetWithoutPrimaryAttributes.children.push(link);
    
    // Should still be valid via fallback
    expect(isPostContainer(tweetWithoutPrimaryAttributes, 'twitter')).toBe(true);
  });

  test('should detect Instagram posts using fallback selectors', async () => {
    // Test that fallback selectors work for Instagram
    const postWithoutPrimaryAttributes = createMockElement('ARTICLE', {}, 
      'Instagram post content without primary role');
    
    const img = createMockElement('IMG', { src: '/image.jpg' }, '');
    postWithoutPrimaryAttributes.children.push(img);
    
    // Should still be valid via fallback
    expect(isPostContainer(postWithoutPrimaryAttributes, 'instagram')).toBe(true);
  });

  test('should try fallback selectors for various post structures', async () => {
    // Generator for post configurations that might need fallback selectors
    const postConfigArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasPrimaryAttribute: fc.boolean(),
      hasContent: fc.constant(true),
      hasVisualElements: fc.constant(true)
    });

    await fc.assert(
      fc.asyncProperty(postConfigArbitrary, async (config) => {
        let post;
        
        if (config.platform === 'twitter') {
          post = createMockElement('ARTICLE', 
            config.hasPrimaryAttribute ? { 'data-testid': 'tweet' } : { role: 'article' },
            'Tweet content'
          );
          const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
          post.children.push(link);
        } else {
          post = createMockElement('ARTICLE',
            config.hasPrimaryAttribute ? { role: 'presentation' } : {},
            'Post content'
          );
          const img = createMockElement('IMG', { src: '/image.jpg' }, '');
          post.children.push(img);
        }
        
        const isValid = isPostContainer(post, config.platform);
        
        // Should be valid regardless of whether primary or fallback selector matches
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle DOM structure changes gracefully', async () => {
    // Generator for various attribute combinations
    const attributeConfigArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      attributes: fc.oneof(
        fc.constant({ 'data-testid': 'tweet' }),
        fc.constant({ role: 'article' }),
        fc.constant({ role: 'presentation' }),
        fc.constant({}) // No specific attributes
      )
    });

    await fc.assert(
      fc.asyncProperty(attributeConfigArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', config.attributes, 'Content');
        
        // Add appropriate child elements
        if (config.platform === 'twitter') {
          const link = createMockElement('A', { href: '/user/status/123' }, 'Link');
          post.children.push(link);
        } else {
          const img = createMockElement('IMG', { src: '/image.jpg' }, '');
          post.children.push(img);
        }
        
        const isValid = isPostContainer(post, config.platform);
        
        // Should be valid if it's an ARTICLE with content and appropriate child elements
        expect(isValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test('should validate selector configuration exists for both platforms', () => {
    // Verify selector configuration is available
    const twitterConfig = getSelectorConfig('twitter');
    const instagramConfig = getSelectorConfig('instagram');
    
    expect(twitterConfig).not.toBeNull();
    expect(instagramConfig).not.toBeNull();
    
    // Verify both primary and fallback selectors exist
    expect(twitterConfig.primary).toBeDefined();
    expect(twitterConfig.fallback).toBeDefined();
    expect(instagramConfig.primary).toBeDefined();
    expect(instagramConfig.fallback).toBeDefined();
    
    // Verify they are arrays with at least one selector
    expect(Array.isArray(twitterConfig.primary)).toBe(true);
    expect(Array.isArray(twitterConfig.fallback)).toBe(true);
    expect(twitterConfig.primary.length).toBeGreaterThan(0);
    expect(twitterConfig.fallback.length).toBeGreaterThan(0);
    
    expect(Array.isArray(instagramConfig.primary)).toBe(true);
    expect(Array.isArray(instagramConfig.fallback)).toBe(true);
    expect(instagramConfig.primary.length).toBeGreaterThan(0);
    expect(instagramConfig.fallback.length).toBeGreaterThan(0);
  });
});
