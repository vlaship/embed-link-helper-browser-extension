/**
 * Tests for Post Detector Utilities
 * Includes unit tests and property-based tests
 */

const { findPostContainers, isPostContainer, getSelectorConfig, SELECTORS } = require('./post-detector');
const fc = require('fast-check');

// ============================================================================
// Helper Functions for Test Data Generation
// ============================================================================

/**
 * Create a mock article element with specified properties
 */
function createMockArticle(options = {}) {
  const {
    textContent = 'Sample post content',
    width = 500,
    height = 300,
    hasLinks = true,
    hasImages = false,
    hasLangAttr = true,
    tagName = 'ARTICLE'
  } = options;

  const element = document.createElement(tagName.toLowerCase());
  element.textContent = textContent;

  // Mock getBoundingClientRect
  element.getBoundingClientRect = jest.fn(() => ({
    width,
    height,
    top: 0,
    left: 0,
    right: width,
    bottom: height
  }));

  // Add links if specified
  if (hasLinks) {
    const link = document.createElement('a');
    link.href = 'https://example.com';
    link.textContent = 'Link';
    element.appendChild(link);
  }

  // Add images if specified
  if (hasImages) {
    const img = document.createElement('img');
    img.src = 'https://example.com/image.jpg';
    element.appendChild(img);
  }

  // Add lang attribute if specified
  if (hasLangAttr) {
    const span = document.createElement('span');
    span.setAttribute('lang', 'en');
    span.textContent = 'Text with lang';
    element.appendChild(span);
  }

  return element;
}

/**
 * Create a mock DOM tree with multiple posts
 */
function createMockDOMTree(postCount = 3, platform = 'twitter') {
  const root = document.createElement('div');
  
  for (let i = 0; i < postCount; i++) {
    const post = createMockArticle({
      textContent: `Post ${i + 1}`,
      hasImages: platform === 'instagram'
    });
    
    // Add platform-specific attributes
    if (platform === 'twitter') {
      post.setAttribute('data-testid', 'tweet');
    } else if (platform === 'instagram') {
      post.setAttribute('role', 'presentation');
    }
    
    root.appendChild(post);
  }
  
  return root;
}

// ============================================================================
// Unit Tests
// ============================================================================

describe('Post Detector - Unit Tests', () => {
  
  describe('getSelectorConfig', () => {
    test('returns Twitter selector config', () => {
      const config = getSelectorConfig('twitter');
      expect(config).toBeDefined();
      expect(config.primary).toBeDefined();
      expect(config.fallback).toBeDefined();
      expect(Array.isArray(config.primary)).toBe(true);
    });

    test('returns Instagram selector config', () => {
      const config = getSelectorConfig('instagram');
      expect(config).toBeDefined();
      expect(config.primary).toBeDefined();
      expect(config.fallback).toBeDefined();
      expect(Array.isArray(config.primary)).toBe(true);
    });

    test('returns null for invalid platform', () => {
      const config = getSelectorConfig('invalid');
      expect(config).toBeNull();
    });
  });

  describe('isPostContainer', () => {
    test('accepts valid Twitter post container', () => {
      const element = createMockArticle({
        textContent: 'Tweet content',
        hasLinks: true,
        hasLangAttr: true
      });
      
      expect(isPostContainer(element, 'twitter')).toBe(true);
    });

    test('accepts valid Instagram post container', () => {
      const element = createMockArticle({
        textContent: 'Instagram post',
        hasImages: true,
        hasLinks: true
      });
      
      expect(isPostContainer(element, 'instagram')).toBe(true);
    });

    test('rejects non-article element', () => {
      const element = document.createElement('div');
      element.textContent = 'Not an article';
      
      expect(isPostContainer(element, 'twitter')).toBe(false);
    });

    test('rejects empty article', () => {
      const element = createMockArticle({
        textContent: '',
        hasLinks: false,
        hasLangAttr: false
      });
      
      expect(isPostContainer(element, 'twitter')).toBe(false);
    });

    test('rejects hidden article (zero dimensions)', () => {
      const element = createMockArticle({
        width: 0,
        height: 0
      });
      
      expect(isPostContainer(element, 'twitter')).toBe(false);
    });

    test('rejects null element', () => {
      expect(isPostContainer(null, 'twitter')).toBe(false);
    });

    test('rejects undefined element', () => {
      expect(isPostContainer(undefined, 'twitter')).toBe(false);
    });

    test('rejects article without links or lang attributes for Twitter', () => {
      const element = createMockArticle({
        textContent: 'Content',
        hasLinks: false,
        hasLangAttr: false
      });
      
      expect(isPostContainer(element, 'twitter')).toBe(false);
    });

    test('rejects article without images or links for Instagram', () => {
      const element = createMockArticle({
        textContent: 'Content',
        hasLinks: false,
        hasImages: false
      });
      
      expect(isPostContainer(element, 'instagram')).toBe(false);
    });
  });

  describe('findPostContainers', () => {
    test('finds Twitter posts in DOM tree', () => {
      const root = createMockDOMTree(3, 'twitter');
      const posts = findPostContainers('twitter', root);
      
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.every(p => p instanceof HTMLElement)).toBe(true);
    });

    test('finds Instagram posts in DOM tree', () => {
      const root = createMockDOMTree(3, 'instagram');
      const posts = findPostContainers('instagram', root);
      
      expect(posts.length).toBeGreaterThan(0);
      expect(posts.every(p => p instanceof HTMLElement)).toBe(true);
    });

    test('returns empty array for invalid platform', () => {
      const root = createMockDOMTree(3, 'twitter');
      const posts = findPostContainers('invalid', root);
      
      expect(posts).toEqual([]);
    });

    test('returns empty array for null platform', () => {
      const root = createMockDOMTree(3, 'twitter');
      const posts = findPostContainers(null, root);
      
      expect(posts).toEqual([]);
    });

    test('returns empty array for empty DOM', () => {
      const root = document.createElement('div');
      const posts = findPostContainers('twitter', root);
      
      expect(posts).toEqual([]);
    });

    test('searches within specified root element', () => {
      const root = document.createElement('div');
      const post = createMockArticle();
      post.setAttribute('data-testid', 'tweet');
      root.appendChild(post);
      
      const posts = findPostContainers('twitter', root);
      expect(posts.length).toBeGreaterThan(0);
    });
  });
});


// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Post Detector - Property-Based Tests', () => {

  // Property 8: Complete post discovery
  test('Property 8: Complete post discovery', () => {
    /**
     * Feature: testing-implementation, Property 8: Complete post discovery
     * Validates: Requirements 2.1, 5.3
     */
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Number of posts
        fc.constantFrom('twitter', 'instagram'), // Platform
        (postCount, platform) => {
          // Generate DOM tree with valid posts
          const root = createMockDOMTree(postCount, platform);
          
          // Find posts
          const foundPosts = findPostContainers(platform, root);
          
          // All valid posts should be found
          // Count valid posts in the tree
          const allArticles = root.querySelectorAll('article');
          const validPosts = Array.from(allArticles).filter(el => 
            isPostContainer(el, platform)
          );
          
          return foundPosts.length === validPosts.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 9: Post container validation correctness
  test('Property 9: Post container validation correctness', () => {
    /**
     * Feature: testing-implementation, Property 9: Post container validation correctness
     * Validates: Requirements 2.2
     */
    
    fc.assert(
      fc.property(
        fc.record({
          textContent: fc.oneof(fc.string(), fc.constant('')),
          width: fc.integer({ min: 0, max: 1000 }),
          height: fc.integer({ min: 0, max: 1000 }),
          hasLinks: fc.boolean(),
          hasImages: fc.boolean(),
          hasLangAttr: fc.boolean(),
          tagName: fc.constantFrom('ARTICLE', 'DIV', 'SECTION')
        }),
        fc.constantFrom('twitter', 'instagram'),
        (options, platform) => {
          const element = createMockArticle(options);
          const isValid = isPostContainer(element, platform);
          
          // Validation logic should match implementation
          // Note: createMockArticle adds child elements which contribute to textContent
          // So we need to check the actual element's textContent after creation
          const actualTextContent = element.textContent || '';
          const shouldBeValid = 
            options.tagName === 'ARTICLE' &&
            actualTextContent.trim().length > 0 &&
            options.width > 0 &&
            options.height > 0 &&
            (platform === 'twitter' ? (options.hasLinks || options.hasLangAttr) : (options.hasImages || options.hasLinks));
          
          return isValid === shouldBeValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 10: Platform-specific validation rules
  test('Property 10: Platform-specific validation rules', () => {
    /**
     * Feature: testing-implementation, Property 10: Platform-specific validation rules
     * Validates: Requirements 2.4, 5.4
     */
    
    fc.assert(
      fc.property(
        fc.record({
          textContent: fc.string({ minLength: 1 }),
          width: fc.integer({ min: 100, max: 1000 }),
          height: fc.integer({ min: 100, max: 1000 }),
          hasLinks: fc.boolean(),
          hasImages: fc.boolean(),
          hasLangAttr: fc.boolean()
        }),
        (options) => {
          const element = createMockArticle(options);
          
          const twitterValid = isPostContainer(element, 'twitter');
          const instagramValid = isPostContainer(element, 'instagram');
          
          // Twitter requires links OR lang attributes
          const shouldBeValidTwitter = options.hasLinks || options.hasLangAttr;
          
          // Instagram requires images OR links
          const shouldBeValidInstagram = options.hasImages || options.hasLinks;
          
          // If requirements differ, validation should differ
          if (shouldBeValidTwitter !== shouldBeValidInstagram) {
            return twitterValid !== instagramValid;
          }
          
          // If requirements are the same, validation should be the same
          return twitterValid === instagramValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 11: Scoped search boundaries
  test('Property 11: Scoped search boundaries', () => {
    /**
     * Feature: testing-implementation, Property 11: Scoped search boundaries
     * Validates: Requirements 2.5
     */
    
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // Posts in root
        fc.integer({ min: 1, max: 5 }), // Posts outside root
        fc.constantFrom('twitter', 'instagram'),
        (insideCount, outsideCount, platform) => {
          // Create container with posts inside and outside
          const container = document.createElement('div');
          const root = createMockDOMTree(insideCount, platform);
          const outside = createMockDOMTree(outsideCount, platform);
          
          container.appendChild(root);
          container.appendChild(outside);
          
          // Search only within root
          const foundPosts = findPostContainers(platform, root);
          
          // Count valid posts in root only
          const articlesInRoot = root.querySelectorAll('article');
          const validPostsInRoot = Array.from(articlesInRoot).filter(el =>
            isPostContainer(el, platform)
          );
          
          // Should only find posts within root
          return foundPosts.length === validPostsInRoot.length &&
                 foundPosts.every(post => root.contains(post));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 12: Valid post acceptance
  test('Property 12: Valid post acceptance', () => {
    /**
     * Feature: testing-implementation, Property 12: Valid post acceptance
     * Validates: Requirements 5.1
     */
    
    fc.assert(
      fc.property(
        fc.record({
          textContent: fc.string({ minLength: 1, maxLength: 500 }),
          width: fc.integer({ min: 100, max: 1000 }),
          height: fc.integer({ min: 100, max: 1000 }),
          hasLinks: fc.constant(true),
          hasImages: fc.boolean(),
          hasLangAttr: fc.boolean()
        }),
        fc.constantFrom('twitter', 'instagram'),
        (options, platform) => {
          // Create valid post structure
          const element = createMockArticle({
            ...options,
            tagName: 'ARTICLE',
            hasImages: platform === 'instagram' ? true : options.hasImages
          });
          
          // Valid posts should be accepted
          return isPostContainer(element, platform) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 13: Invalid post rejection
  test('Property 13: Invalid post rejection', () => {
    /**
     * Feature: testing-implementation, Property 13: Invalid post rejection
     * Validates: Requirements 5.2
     */
    
    fc.assert(
      fc.property(
        fc.oneof(
          // Wrong tag
          fc.record({
            tagName: fc.constantFrom('DIV', 'SECTION', 'SPAN'),
            textContent: fc.string({ minLength: 1 }),
            width: fc.integer({ min: 100, max: 1000 }),
            height: fc.integer({ min: 100, max: 1000 }),
            hasLinks: fc.boolean(),
            hasImages: fc.boolean(),
            hasLangAttr: fc.boolean()
          }),
          // Empty content (no child elements that add content)
          fc.record({
            tagName: fc.constant('ARTICLE'),
            textContent: fc.constantFrom('', '   ', '\n\t'),
            width: fc.integer({ min: 100, max: 1000 }),
            height: fc.integer({ min: 100, max: 1000 }),
            hasLinks: fc.constant(false),
            hasImages: fc.constant(false),
            hasLangAttr: fc.constant(false)
          }),
          // Zero dimensions (hidden)
          fc.record({
            tagName: fc.constant('ARTICLE'),
            textContent: fc.string({ minLength: 1 }),
            width: fc.constant(0),
            height: fc.constant(0),
            hasLinks: fc.boolean(),
            hasImages: fc.boolean(),
            hasLangAttr: fc.boolean()
          }),
          // Missing required elements
          fc.record({
            tagName: fc.constant('ARTICLE'),
            textContent: fc.string({ minLength: 1 }),
            width: fc.integer({ min: 100, max: 1000 }),
            height: fc.integer({ min: 100, max: 1000 }),
            hasLinks: fc.constant(false),
            hasImages: fc.constant(false),
            hasLangAttr: fc.constant(false)
          })
        ),
        fc.constantFrom('twitter', 'instagram'),
        (options, platform) => {
          const element = createMockArticle(options);
          
          // Invalid posts should be rejected
          return isPostContainer(element, platform) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 14: Invalid platform handling
  test('Property 14: Invalid platform handling', () => {
    /**
     * Feature: testing-implementation, Property 14: Invalid platform handling
     * Validates: Requirements 5.5
     */
    
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => s !== 'twitter' && s !== 'instagram'),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant(''),
          fc.integer(),
          fc.constant({})
        ),
        (invalidPlatform) => {
          const root = createMockDOMTree(3, 'twitter');
          const element = createMockArticle();
          
          // findPostContainers should return empty array
          const posts = findPostContainers(invalidPlatform, root);
          
          // isPostContainer should return false
          const isValid = isPostContainer(element, invalidPlatform);
          
          // getSelectorConfig should return null
          const config = getSelectorConfig(invalidPlatform);
          
          return Array.isArray(posts) && 
                 posts.length === 0 && 
                 isValid === false &&
                 config === null;
        }
      ),
      { numRuns: 100 }
    );
  });
});
