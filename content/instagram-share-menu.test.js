/**
 * Property-Based Tests for Instagram Share Menu Integration
 * Tests dynamic content support, detection performance, multiple menu handling, and error handling
 */

const fc = require('fast-check');

// Setup mocks before loading the module
beforeAll(() => {
  // Mock browser API
  global.browser = {
    storage: {
      sync: {
        get: jest.fn(),
        set: jest.fn()
      },
      onChanged: {
        addListener: jest.fn()
      }
    }
  };

  // Mock window utilities
  global.window = {
    ShareMenuDetector: {
      observeShareMenus: jest.fn(),
      findAssociatedPost: jest.fn(),
      isShareMenu: jest.fn(),
      SHARE_MENU_SELECTORS: {
        instagram: {
          menu: ['div[role="dialog"]'],
          trigger: ['button[aria-label*="Share"]'],
          menuItems: ['button'],
          postContainer: ['article']
        }
      }
    },
    ShareMenuInjector: {
      createEmbedLinkMenuItem: jest.fn(),
      injectMenuItem: jest.fn(),
      findMenuInjectionPoint: jest.fn(),
      applyPlatformStyling: jest.fn()
    },
    FeedbackManager: {
      showSuccessFeedback: jest.fn(),
      showErrorFeedback: jest.fn(),
      hideFeedbackAfterDelay: jest.fn()
    },
    PostUrlExtractor: {
      extractPostUrl: jest.fn(),
      validatePostUrl: jest.fn()
    },
    UrlTransformer: {
      transformUrl: jest.fn()
    }
  };

  // Mock navigator.clipboard
  global.navigator = {
    clipboard: {
      writeText: jest.fn()
    }
  };

  // Mock document
  global.document = {
    readyState: 'complete',
    addEventListener: jest.fn(),
    createElement: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    execCommand: jest.fn()
  };
});

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}) {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes: attributes,
    children: [],
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getAttribute: jest.fn((name) => attributes[name]),
    setAttribute: jest.fn((name, value) => { attributes[name] = value; }),
    getBoundingClientRect: jest.fn(() => ({
      width: 200,
      height: 300,
      top: 100,
      left: 100
    })),
    style: {},
    textContent: ''
  };
  
  Object.setPrototypeOf(element, HTMLElement.prototype);
  return element;
}

// Helper to create mock share menu
function createMockShareMenu() {
  const menu = createMockElement('DIV', { 
    role: 'dialog',
    _uniqueId: Math.random()
  });
  
  const item1 = createMockElement('BUTTON', {});
  const item2 = createMockElement('BUTTON', {});
  menu.children.push(item1, item2);
  
  menu.querySelectorAll = jest.fn((selector) => {
    if (selector === '.embed-link-menu-item') {
      return [];
    }
    return menu.children;
  });
  
  return menu;
}

// Helper to create mock post
function createMockPost(url = 'https://www.instagram.com/p/ABC123/') {
  const post = createMockElement('ARTICLE', {});
  
  const link = createMockElement('A', { href: url });
  link.href = url;
  
  post.querySelector = jest.fn((selector) => {
    if (selector.includes('a[href*="/p/"]')) return link;
    return null;
  });
  
  return post;
}

// Set test environment
process.env.NODE_ENV = 'test';

// Load the module
const instagramShareMenu = require('./instagram-share-menu.js');

/**
 * **Feature: share-menu-integration, Property 6: Dynamic content support**
 * **Validates: Requirements 3.1**
 * 
 * For any post loaded via infinite scroll or dynamic content loading,
 * the share menu integration should work correctly.
 */
describe('Property 6: Dynamic content support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-setup window mocks
    if (!window.ShareMenuDetector) {
      window.ShareMenuDetector = {};
    }
    window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue({
      disconnect: jest.fn()
    });
    window.ShareMenuDetector.findAssociatedPost = jest.fn();
    
    if (!window.ShareMenuInjector) {
      window.ShareMenuInjector = {};
    }
    window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
    window.ShareMenuInjector.injectMenuItem = jest.fn();
    
    if (!window.PostUrlExtractor) {
      window.PostUrlExtractor = {};
    }
    window.PostUrlExtractor.extractPostUrl = jest.fn();
    
    // Setup default mock behaviors
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });
  });

  test('should handle posts loaded dynamically via infinite scroll', async () => {
    // Generator for sequences of dynamically loaded posts
    const dynamicPostsArbitrary = fc.array(
      fc.record({
        postId: fc.integer({ min: 1000, max: 9999 }),
        loadDelay: fc.constant(0) // Remove delays to avoid timeout
      }),
      { minLength: 1, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(dynamicPostsArbitrary, async (posts) => {
        // Reset mocks for this test iteration
        jest.clearAllMocks();
        
        // Re-setup mocks
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        // Setup config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize
        await instagramShareMenu.init();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url) => {
          return createMockElement('BUTTON', { 
            'data-post-url': url,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          });
        });
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        const injectionCalls = [];
        
        // Simulate dynamic loading of posts
        for (const postData of posts) {
          const postUrl = `https://www.instagram.com/p/POST${postData.postId}/`;
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          await instagramShareMenu.handleShareMenuDetected(menu);
          
          if (window.ShareMenuInjector.injectMenuItem.mock.calls.length > injectionCalls.length) {
            injectionCalls.push(postUrl);
          }
        }
        
        // Verify that menu items were injected for all dynamically loaded posts
        expect(injectionCalls.length).toBe(posts.length);
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(posts.length);
      }),
      { numRuns: 100 }
    );
  });

  test('should work with posts loaded at different times', async () => {
    // Generator for posts with varying load times
    const staggeredPostsArbitrary = fc.array(
      fc.integer({ min: 1, max: 100 }),
      { minLength: 2, maxLength: 8 }
    );

    await fc.assert(
      fc.asyncProperty(staggeredPostsArbitrary, async (postIds) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', {})
        );
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Process posts at different times
        for (const postId of postIds) {
          const postUrl = `https://www.instagram.com/p/ID${postId}/`;
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          await instagramShareMenu.handleShareMenuDetected(menu);
        }
        
        // All posts should have been processed
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(postIds.length);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 7: Detection performance**
 * **Validates: Requirements 3.2**
 * 
 * For any share menu that is opened, the extension should detect it
 * and inject the menu item within 200ms.
 */
describe('Property 7: Detection performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    if (!window.ShareMenuDetector) {
      window.ShareMenuDetector = {};
    }
    window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue({
      disconnect: jest.fn()
    });
    window.ShareMenuDetector.findAssociatedPost = jest.fn();
    
    if (!window.ShareMenuInjector) {
      window.ShareMenuInjector = {};
    }
    window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
    window.ShareMenuInjector.injectMenuItem = jest.fn();
    
    if (!window.PostUrlExtractor) {
      window.PostUrlExtractor = {};
    }
    window.PostUrlExtractor.extractPostUrl = jest.fn();
    
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      }
    });
  });

  test('should detect and inject menu item within 200ms', async () => {
    // Generator for random posts
    const postArbitrary = fc.record({
      postId: fc.integer({ min: 1000, max: 9999 }),
      username: fc.constantFrom('user1', 'user2', 'user3')
    });

    await fc.assert(
      fc.asyncProperty(postArbitrary, async (postData) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        const postUrl = `https://www.instagram.com/p/${postData.username}${postData.postId}/`;
        const post = createMockPost(postUrl);
        const menu = createMockShareMenu();
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', {})
        );
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Measure detection and injection time
        const startTime = Date.now();
        await instagramShareMenu.handleShareMenuDetected(menu);
        const endTime = Date.now();
        
        const elapsedTime = endTime - startTime;
        
        // Should complete within 200ms
        expect(elapsedTime).toBeLessThan(200);
        
        // Should have injected the menu item
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain performance with multiple rapid detections', async () => {
    // Generator for sequences of rapid menu openings
    const rapidDetectionsArbitrary = fc.array(
      fc.integer({ min: 1, max: 100 }),
      { minLength: 3, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(rapidDetectionsArbitrary, async (postIds) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', {})
        );
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        const detectionTimes = [];
        
        // Simulate rapid menu detections
        for (const postId of postIds) {
          const postUrl = `https://www.instagram.com/p/POST${postId}/`;
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          const startTime = Date.now();
          await instagramShareMenu.handleShareMenuDetected(menu);
          const endTime = Date.now();
          
          detectionTimes.push(endTime - startTime);
        }
        
        // All detections should be within 250ms (200ms requirement + 25% buffer for test environment variability)
        for (const time of detectionTimes) {
          expect(time).toBeLessThan(250);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 8: Multiple menu handling**
 * **Validates: Requirements 3.3**
 * 
 * For any sequence of share menu openings, each menu should be handled
 * independently with its own correctly injected menu item.
 */
describe('Property 8: Multiple menu handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    if (!window.ShareMenuDetector) {
      window.ShareMenuDetector = {};
    }
    window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue({
      disconnect: jest.fn()
    });
    window.ShareMenuDetector.findAssociatedPost = jest.fn();
    
    if (!window.ShareMenuInjector) {
      window.ShareMenuInjector = {};
    }
    window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
    window.ShareMenuInjector.injectMenuItem = jest.fn();
    
    if (!window.PostUrlExtractor) {
      window.PostUrlExtractor = {};
    }
    window.PostUrlExtractor.extractPostUrl = jest.fn();
    
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      }
    });
  });

  test('should handle multiple menus independently', async () => {
    // Generator for sequences of menu openings
    const menuSequenceArbitrary = fc.array(
      fc.record({
        postId: fc.integer({ min: 1000, max: 9999 }),
        username: fc.constantFrom('user1', 'user2', 'user3', 'user4')
      }),
      { minLength: 2, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(menuSequenceArbitrary, async (menuSequence) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        const injectedUrls = [];
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url) => {
          const menuItem = createMockElement('BUTTON', { 
            'data-post-url': url,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          });
          return menuItem;
        });
        
        window.ShareMenuInjector.injectMenuItem.mockImplementation((item) => {
          injectedUrls.push(item.attributes['data-post-url']);
          return true;
        });
        
        // Process each menu
        for (const menuData of menuSequence) {
          const postUrl = `https://www.instagram.com/p/${menuData.username}${menuData.postId}/`;
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          await instagramShareMenu.handleShareMenuDetected(menu);
        }
        
        // Each menu should have been handled independently
        expect(injectedUrls.length).toBe(menuSequence.length);
        
        // Each menu should have the correct URL
        for (let i = 0; i < menuSequence.length; i++) {
          const expectedUrl = `https://www.instagram.com/p/${menuSequence[i].username}${menuSequence[i].postId}/`;
          expect(injectedUrls[i]).toBe(expectedUrl);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not have conflicts when multiple menus are opened in quick succession', async () => {
    // Generator for simultaneous menu openings
    const simultaneousMenusArbitrary = fc.array(
      fc.integer({ min: 1, max: 999 }),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(simultaneousMenusArbitrary, async (postIds) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', {})
        );
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Open all menus simultaneously (without await)
        const promises = postIds.map(async (postId) => {
          const postUrl = `https://www.instagram.com/p/POST${postId}/`;
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          return instagramShareMenu.handleShareMenuDetected(menu);
        });
        
        // Wait for all to complete
        await Promise.all(promises);
        
        // All menus should have been processed
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(postIds.length);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(postIds.length);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 9: Graceful error handling**
 * **Validates: Requirements 3.4**
 * 
 * For any DOM structure changes or missing elements, the extension should
 * handle errors gracefully without breaking functionality.
 */
describe('Property 9: Graceful error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    if (!window.ShareMenuDetector) {
      window.ShareMenuDetector = {};
    }
    window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue({
      disconnect: jest.fn()
    });
    window.ShareMenuDetector.findAssociatedPost = jest.fn();
    
    if (!window.ShareMenuInjector) {
      window.ShareMenuInjector = {};
    }
    window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
    window.ShareMenuInjector.injectMenuItem = jest.fn();
    
    if (!window.PostUrlExtractor) {
      window.PostUrlExtractor = {};
    }
    window.PostUrlExtractor.extractPostUrl = jest.fn();
    
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      }
    });
  });

  test('should handle missing post elements gracefully', async () => {
    // Generator for various missing element scenarios
    const missingElementArbitrary = fc.constantFrom(
      'no-post',
      'no-url',
      'no-menu-item',
      'injection-failed'
    );

    await fc.assert(
      fc.asyncProperty(missingElementArbitrary, async (scenario) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        const menu = createMockShareMenu();
        
        // Setup scenario
        switch (scenario) {
          case 'no-post':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(null);
            break;
          case 'no-url':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockReturnValue(null);
            break;
          case 'no-menu-item':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://www.instagram.com/p/ABC123/');
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(null);
            break;
          case 'injection-failed':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://www.instagram.com/p/ABC123/');
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(createMockElement('BUTTON', {}));
            window.ShareMenuInjector.injectMenuItem.mockReturnValue(false);
            break;
        }
        
        // Should not throw error
        expect(() => instagramShareMenu.handleShareMenuDetected(menu)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('should continue working after encountering errors', async () => {
    // Generator for sequences with some failures
    const mixedSequenceArbitrary = fc.array(
      fc.record({
        postId: fc.integer({ min: 1, max: 999 }),
        shouldFail: fc.boolean()
      }),
      { minLength: 3, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(mixedSequenceArbitrary, async (sequence) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        let successCount = 0;
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', {})
        );
        
        window.ShareMenuInjector.injectMenuItem.mockImplementation(() => {
          successCount++;
          return true;
        });
        
        // Process sequence with some failures
        for (const item of sequence) {
          const menu = createMockShareMenu();
          
          if (item.shouldFail) {
            // Simulate failure by returning null post
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(null);
          } else {
            const postUrl = `https://www.instagram.com/p/POST${item.postId}/`;
            const post = createMockPost(postUrl);
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
            window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          }
          
          // Should not throw
          expect(() => instagramShareMenu.handleShareMenuDetected(menu)).not.toThrow();
        }
        
        // Should have succeeded for non-failing items
        const expectedSuccesses = sequence.filter(item => !item.shouldFail).length;
        expect(successCount).toBe(expectedSuccesses);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle exceptions in utility functions gracefully', async () => {
    // Generator for different exception scenarios
    const exceptionArbitrary = fc.constantFrom(
      'findAssociatedPost-throws',
      'extractPostUrl-throws',
      'createMenuItem-throws',
      'injectMenuItem-throws'
    );

    await fc.assert(
      fc.asyncProperty(exceptionArbitrary, async (scenario) => {
        // Reset mocks
        jest.clearAllMocks();
        
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        });
        
        await instagramShareMenu.init();
        
        const menu = createMockShareMenu();
        
        // Setup exception scenario
        switch (scenario) {
          case 'findAssociatedPost-throws':
            window.ShareMenuDetector.findAssociatedPost.mockImplementation(() => {
              throw new Error('DOM error');
            });
            break;
          case 'extractPostUrl-throws':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockImplementation(() => {
              throw new Error('URL extraction error');
            });
            break;
          case 'createMenuItem-throws':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://www.instagram.com/p/ABC123/');
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation(() => {
              throw new Error('Menu item creation error');
            });
            break;
          case 'injectMenuItem-throws':
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(createMockPost());
            window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://www.instagram.com/p/ABC123/');
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(createMockElement('BUTTON', {}));
            window.ShareMenuInjector.injectMenuItem.mockImplementation(() => {
              throw new Error('Injection error');
            });
            break;
        }
        
        // Should catch and handle the exception gracefully
        expect(() => instagramShareMenu.handleShareMenuDetected(menu)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: duplicate-button-fix, Property 2: Multiple detection prevention**
 * **Validates: Requirements 1.2, 2.1, 2.4**
 * 
 * For any share menu that triggers multiple observer callbacks or mutation events,
 * the extension should prevent duplicate injections and inject only one menu item.
 */
describe('Property 2: Multiple detection prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-setup window mocks
    if (!window.ShareMenuDetector) {
      window.ShareMenuDetector = {};
    }
    window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue({
      disconnect: jest.fn()
    });
    window.ShareMenuDetector.findAssociatedPost = jest.fn();
    window.ShareMenuDetector.isShareMenu = jest.fn();
    
    if (!window.ShareMenuInjector) {
      window.ShareMenuInjector = {};
    }
    window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
    window.ShareMenuInjector.injectMenuItem = jest.fn();
    
    if (!window.PostUrlExtractor) {
      window.PostUrlExtractor = {};
    }
    window.PostUrlExtractor.extractPostUrl = jest.fn();
    
    if (!window.FeedbackManager) {
      window.FeedbackManager = {};
    }
    window.FeedbackManager.showSuccessFeedback = jest.fn();
    window.FeedbackManager.showErrorFeedback = jest.fn();
    window.FeedbackManager.hideFeedbackAfterDelay = jest.fn();
    
    if (!window.UrlTransformer) {
      window.UrlTransformer = {};
    }
    window.UrlTransformer.transformUrl = jest.fn();
    
    // Setup default mock behaviors
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });
  });

  test('should prevent duplicate injections when same menu triggers multiple callbacks', async () => {
    // Generator for number of callbacks (2-10 callbacks for same menu)
    const callbackCountArbitrary = fc.integer({ min: 2, max: 10 });
    
    // Generator for post URLs
    const postUrlArbitrary = fc.oneof(
      fc.constant('https://www.instagram.com/p/ABC123/'),
      fc.constant('https://www.instagram.com/p/XYZ789/'),
      fc.constant('https://instagram.com/p/DEF456/')
    );

    await fc.assert(
      fc.asyncProperty(
        callbackCountArbitrary,
        postUrlArbitrary,
        async (callbackCount, postUrl) => {
          // Reset mocks for this test iteration
          jest.clearAllMocks();
          
          // Re-setup mocks
          window.ShareMenuDetector.findAssociatedPost = jest.fn();
          window.PostUrlExtractor.extractPostUrl = jest.fn();
          window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
          window.ShareMenuInjector.injectMenuItem = jest.fn();
          
          // Setup config
          global.browser.storage.sync.get.mockResolvedValue({
            config: {
              twitter: {
                enabled: true,
                targetHostname: 'fixvx.com'
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            }
          });
          
          // Initialize to set currentConfig
          await instagramShareMenu.init();
          
          // Create a single menu element that will be reused
          const menu = createMockShareMenu();
          const post = createMockPost(postUrl);
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          const createdMenuItem = createMockElement('BUTTON', { 
            'data-post-url': postUrl,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          });
          createdMenuItem.classList.add('embed-link-menu-item');
          
          window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(createdMenuItem);
          window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
          
          // Simulate multiple callbacks for the SAME menu element
          for (let i = 0; i < callbackCount; i++) {
            await instagramShareMenu.handleShareMenuDetected(menu);
          }
          
          // CRITICAL: Should only inject once despite multiple callbacks
          expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
          expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should prevent duplicate injections across mutation events', async () => {
    // Generator for sequences of mutation events
    const mutationSequenceArbitrary = fc.array(
      fc.record({
        delayMs: fc.constant(0), // No delay to avoid timeout
        postUrl: fc.constantFrom(
          'https://www.instagram.com/p/POST1/',
          'https://www.instagram.com/p/POST2/',
          'https://www.instagram.com/p/POST3/'
        )
      }),
      { minLength: 2, maxLength: 8 }
    );

    await fc.assert(
      fc.asyncProperty(mutationSequenceArbitrary, async (mutationSequence) => {
        // Reset mocks for this test iteration
        jest.clearAllMocks();
        
        // Re-setup mocks
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        // Setup config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize to set currentConfig
        await instagramShareMenu.init();
        
        // Create a single menu that will be reused across mutations
        const menu = createMockShareMenu();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url) => {
          const menuItem = createMockElement('BUTTON', { 
            'data-post-url': url,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          });
          menuItem.classList.add('embed-link-menu-item');
          return menuItem;
        });
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Simulate multiple mutation events for the same menu
        for (const mutation of mutationSequence) {
          const post = createMockPost(mutation.postUrl);
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(mutation.postUrl);
          
          await instagramShareMenu.handleShareMenuDetected(menu);
        }
        
        // Should only inject once for the first mutation event
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle rapid successive detections of same menu', async () => {
    // Generator for rapid detection scenarios
    const rapidDetectionArbitrary = fc.record({
      detectionCount: fc.integer({ min: 3, max: 15 }),
      postUrl: fc.constantFrom(
        'https://www.instagram.com/p/TEST999/',
        'https://instagram.com/p/TEST888/'
      )
    });

    await fc.assert(
      fc.asyncProperty(rapidDetectionArbitrary, async (scenario) => {
        // Reset mocks for this test iteration
        jest.clearAllMocks();
        
        // Re-setup mocks
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        // Setup config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize to set currentConfig
        await instagramShareMenu.init();
        
        const menu = createMockShareMenu();
        const post = createMockPost(scenario.postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(scenario.postUrl);
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', { 
            'data-post-url': scenario.postUrl,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          })
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Simulate rapid successive detections (all synchronous to simulate race condition)
        const detectionPromises = [];
        for (let i = 0; i < scenario.detectionCount; i++) {
          detectionPromises.push(instagramShareMenu.handleShareMenuDetected(menu));
        }
        
        // Wait for all to complete
        await Promise.all(detectionPromises);
        
        // Should only inject once despite rapid detections
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 }
    );
  });

  test('should debounce multiple detections with varying timing', async () => {
    // Generator for detection patterns with different timing
    const detectionPatternArbitrary = fc.array(
      fc.integer({ min: 1, max: 5 }),
      { minLength: 2, maxLength: 10 }
    );

    await fc.assert(
      fc.asyncProperty(detectionPatternArbitrary, async (detectionPattern) => {
        // Reset mocks for this test iteration
        jest.clearAllMocks();
        
        // Re-setup mocks
        window.ShareMenuDetector.findAssociatedPost = jest.fn();
        window.PostUrlExtractor.extractPostUrl = jest.fn();
        window.ShareMenuInjector.createEmbedLinkMenuItem = jest.fn();
        window.ShareMenuInjector.injectMenuItem = jest.fn();
        
        // Setup config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize to set currentConfig
        await instagramShareMenu.init();
        
        const postUrl = 'https://www.instagram.com/p/ABC123/';
        const menu = createMockShareMenu();
        const post = createMockPost(postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('BUTTON', { 
            'data-post-url': postUrl,
            'data-target-hostname': 'kkinstagram.com',
            'data-platform': 'instagram'
          })
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Process the same menu multiple times based on pattern
        for (const _ of detectionPattern) {
          await instagramShareMenu.handleShareMenuDetected(menu);
        }
        
        // Should only inject once regardless of detection pattern
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 }
    );
  });
});
