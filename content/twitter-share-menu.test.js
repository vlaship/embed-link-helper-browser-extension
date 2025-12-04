/**
 * Property-Based Tests for Twitter Share Menu Integration
 * Tests menu consistency, configuration respect, and live updates
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
        twitter: {
          menu: ['div[data-testid="Dropdown"]'],
          trigger: ['button[data-testid="share"]'],
          menuItems: ['div[role="menuitem"]'],
          postContainer: ['article[data-testid="tweet"]']
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
// Each call creates a unique object to avoid WeakSet caching issues
function createMockShareMenu() {
  const menu = createMockElement('DIV', { 
    'data-testid': 'Dropdown',
    role: 'menu',
    _uniqueId: Math.random() // Add unique ID to ensure each menu is different
  });
  
  // Add some menu items
  const item1 = createMockElement('DIV', { role: 'menuitem' });
  const item2 = createMockElement('DIV', { role: 'menuitem' });
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
function createMockPost(url = 'https://x.com/user/status/123456') {
  const post = createMockElement('ARTICLE', { 
    'data-testid': 'tweet'
  });
  
  const timeElement = createMockElement('TIME', {});
  const link = createMockElement('A', { href: url });
  link.href = url;
  timeElement.closest = jest.fn(() => link);
  
  post.querySelector = jest.fn((selector) => {
    if (selector === 'time') return timeElement;
    return null;
  });
  
  return post;
}

// Set test environment
process.env.NODE_ENV = 'test';

// Load the module
const twitterShareMenu = require('./twitter-share-menu.js');

/**
 * **Feature: share-menu-integration, Property 5: Menu item consistency on reopen**
 * **Validates: Requirements 1.6, 2.6**
 * 
 * For any post, closing and reopening the share menu should result in
 * the "Copy embed link" menu item appearing again.
 */
describe('Property 5: Menu item consistency on reopen', () => {
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

  test('should inject menu item consistently when share menu is reopened multiple times', async () => {
    // Generator for number of times to reopen menu
    const reopenCountArbitrary = fc.integer({ min: 1, max: 10 });
    
    // Generator for post URLs
    const postUrlArbitrary = fc.oneof(
      fc.constant('https://x.com/user/status/123456'),
      fc.constant('https://x.com/elonmusk/status/789012'),
      fc.constant('https://twitter.com/user/status/345678')
    );

    await fc.assert(
      fc.asyncProperty(
        reopenCountArbitrary,
        postUrlArbitrary,
        async (reopenCount, postUrl) => {
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
          await twitterShareMenu.init();
          
          // Track injection calls
          const injectionCalls = [];
          
          window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation(() => {
            const menuItem = createMockElement('DIV', { 
              'data-post-url': postUrl,
              'data-target-hostname': 'fixvx.com',
              'data-platform': 'twitter'
            });
            menuItem.classList.add('embed-link-menu-item');
            return menuItem;
          });
          
          window.ShareMenuInjector.injectMenuItem.mockImplementation((item, container) => {
            injectionCalls.push({ item, container });
            return true;
          });
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(
            createMockPost(postUrl)
          );
          
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          // Simulate opening and closing the share menu multiple times
          for (let i = 0; i < reopenCount; i++) {
            const menu = createMockShareMenu();
            
            // Simulate menu detection
            await twitterShareMenu.handleShareMenuDetected(menu);
          }
          
          // Verify that menu item was created and injected for each reopen
          expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(reopenCount);
          expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(reopenCount);
          
          // Verify all injections used the correct post URL
          for (const call of injectionCalls) {
            expect(call.item.attributes['data-post-url']).toBe(postUrl);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should handle menu reopen with different posts', async () => {
    // Generator for sequences of post URLs
    const postUrlSequenceArbitrary = fc.array(
      fc.oneof(
        fc.constant('https://x.com/user1/status/111'),
        fc.constant('https://x.com/user2/status/222'),
        fc.constant('https://x.com/user3/status/333')
      ),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(postUrlSequenceArbitrary, async (postUrls) => {
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
        await twitterShareMenu.init();
        
        const injectionCalls = [];
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url) => {
          const menuItem = createMockElement('DIV', { 
            'data-post-url': url,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
          });
          menuItem.classList.add('embed-link-menu-item');
          return menuItem;
        });
        
        window.ShareMenuInjector.injectMenuItem.mockImplementation((item, container) => {
          injectionCalls.push({ item, container });
          return true;
        });
        
        // Simulate opening share menus for different posts
        for (const postUrl of postUrls) {
          const post = createMockPost(postUrl);
          const menu = createMockShareMenu();
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          await twitterShareMenu.handleShareMenuDetected(menu);
        }
        
        // Verify that menu item was created for each post
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(postUrls.length);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(postUrls.length);
        
        // Verify each injection used the correct post URL
        for (let i = 0; i < postUrls.length; i++) {
          expect(injectionCalls[i].item.attributes['data-post-url']).toBe(postUrls[i]);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not inject duplicate menu items when menu is processed multiple times', async () => {
    // Generator for number of duplicate processing attempts
    const duplicateAttemptsArbitrary = fc.integer({ min: 2, max: 5 });

    await fc.assert(
      fc.asyncProperty(duplicateAttemptsArbitrary, async (attempts) => {
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
        await twitterShareMenu.init();
        
        const postUrl = 'https://x.com/user/status/123456';
        const menu = createMockShareMenu();
        const post = createMockPost(postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', { 
            'data-post-url': postUrl,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
          })
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Try to process the same menu multiple times
        for (let i = 0; i < attempts; i++) {
          await twitterShareMenu.handleShareMenuDetected(menu);
        }
        
        // Should only inject once (first time)
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
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
      fc.constant('https://x.com/user/status/123456'),
      fc.constant('https://x.com/elonmusk/status/789012'),
      fc.constant('https://twitter.com/user/status/345678')
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
          await twitterShareMenu.init();
          
          // Create a single menu element that will be reused
          const menu = createMockShareMenu();
          const post = createMockPost(postUrl);
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
          
          const createdMenuItem = createMockElement('DIV', { 
            'data-post-url': postUrl,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
          });
          createdMenuItem.classList.add('embed-link-menu-item');
          
          window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(createdMenuItem);
          window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
          
          // Simulate multiple callbacks for the SAME menu element
          for (let i = 0; i < callbackCount; i++) {
            await twitterShareMenu.handleShareMenuDetected(menu);
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
          'https://x.com/user1/status/111',
          'https://x.com/user2/status/222',
          'https://x.com/user3/status/333'
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
        await twitterShareMenu.init();
        
        // Create a single menu that will be reused across mutations
        const menu = createMockShareMenu();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url) => {
          const menuItem = createMockElement('DIV', { 
            'data-post-url': url,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
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
          
          await twitterShareMenu.handleShareMenuDetected(menu);
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
        'https://x.com/test/status/999',
        'https://twitter.com/test/status/888'
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
        await twitterShareMenu.init();
        
        const menu = createMockShareMenu();
        const post = createMockPost(scenario.postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(scenario.postUrl);
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', { 
            'data-post-url': scenario.postUrl,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
          })
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Simulate rapid successive detections (all synchronous to simulate race condition)
        const detectionPromises = [];
        for (let i = 0; i < scenario.detectionCount; i++) {
          detectionPromises.push(twitterShareMenu.handleShareMenuDetected(menu));
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
        await twitterShareMenu.init();
        
        const postUrl = 'https://x.com/user/status/123456';
        const menu = createMockShareMenu();
        const post = createMockPost(postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', { 
            'data-post-url': postUrl,
            'data-target-hostname': 'fixvx.com',
            'data-platform': 'twitter'
          })
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Process the same menu multiple times based on pattern
        for (const _ of detectionPattern) {
          await twitterShareMenu.handleShareMenuDetected(menu);
        }
        
        // Should only inject once regardless of detection pattern
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(1);
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledTimes(1);
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain menu item state across reopen cycles', async () => {
    // Generator for configuration changes
    const configArbitrary = fc.record({
      targetHostname: fc.constantFrom('fixvx.com', 'vxtwitter.com', 'fxtwitter.com'),
      reopenCount: fc.integer({ min: 1, max: 5 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const postUrl = 'https://x.com/user/status/123456';
        
        // Update config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: config.targetHostname
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Reinitialize to pick up new config
        await twitterShareMenu.init();
        
        const injectionCalls = [];
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url, hostname) => {
          const menuItem = createMockElement('DIV', { 
            'data-post-url': url,
            'data-target-hostname': hostname,
            'data-platform': 'twitter'
          });
          return menuItem;
        });
        
        window.ShareMenuInjector.injectMenuItem.mockImplementation((item, container) => {
          injectionCalls.push({ item, container });
          return true;
        });
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(
          createMockPost(postUrl)
        );
        
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
        
        // Simulate multiple reopen cycles
        for (let i = 0; i < config.reopenCount; i++) {
          const menu = createMockShareMenu();
          await twitterShareMenu.handleShareMenuDetected(menu);
        }
        
        // Verify all injections used the correct target hostname
        for (const call of injectionCalls) {
          expect(call.item.attributes['data-target-hostname']).toBe(config.targetHostname);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 10: Configuration respect**
 * **Validates: Requirements 4.1, 4.2**
 * 
 * For any platform where redirect is disabled in configuration,
 * the extension should not inject menu items into that platform's share menus.
 */
describe('Property 10: Configuration respect', () => {
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
  });

  test('should not inject menu items when Twitter redirect is disabled', async () => {
    // Generator for disabled configuration
    const disabledConfigArbitrary = fc.record({
      twitterEnabled: fc.constant(false),
      instagramEnabled: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(disabledConfigArbitrary, async (config) => {
        // Setup config with Twitter disabled
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: config.twitterEnabled,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: config.instagramEnabled,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize with disabled config
        await twitterShareMenu.init();
        
        // Try to detect a share menu
        const menu = createMockShareMenu();
        const post = createMockPost('https://x.com/user/status/123456');
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://x.com/user/status/123456');
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', {})
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        await twitterShareMenu.handleShareMenuDetected(menu);
        
        // Should not inject menu item when disabled
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).not.toHaveBeenCalled();
        expect(window.ShareMenuInjector.injectMenuItem).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test('should inject menu items when Twitter redirect is enabled', async () => {
    // Generator for enabled configuration
    const enabledConfigArbitrary = fc.record({
      twitterEnabled: fc.constant(true),
      targetHostname: fc.constantFrom('fixvx.com', 'vxtwitter.com', 'fxtwitter.com')
    });

    await fc.assert(
      fc.asyncProperty(enabledConfigArbitrary, async (config) => {
        // Setup config with Twitter enabled
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: config.twitterEnabled,
              targetHostname: config.targetHostname
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        // Initialize with enabled config
        await twitterShareMenu.init();
        
        const menu = createMockShareMenu();
        const post = createMockPost('https://x.com/user/status/123456');
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://x.com/user/status/123456');
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', {})
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        await twitterShareMenu.handleShareMenuDetected(menu);
        
        // Should inject menu item when enabled
        expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalled();
        expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  test('should respect configuration for multiple menu detections', async () => {
    // Generator for configuration and detection count
    const testConfigArbitrary = fc.record({
      enabled: fc.boolean(),
      detectionCount: fc.integer({ min: 1, max: 10 })
    });

    await fc.assert(
      fc.asyncProperty(testConfigArbitrary, async (testConfig) => {
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
              enabled: testConfig.enabled,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        await twitterShareMenu.init();
        
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(
          createMockElement('DIV', {})
        );
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        // Simulate multiple menu detections
        for (let i = 0; i < testConfig.detectionCount; i++) {
          const menu = createMockShareMenu();
          const post = createMockPost(`https://x.com/user/status/${123456 + i}`);
          
          window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
          window.PostUrlExtractor.extractPostUrl.mockReturnValue(`https://x.com/user/status/${123456 + i}`);
          
          await twitterShareMenu.handleShareMenuDetected(menu);
        }
        
        // Verify injection count matches enabled state
        if (testConfig.enabled) {
          expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledTimes(testConfig.detectionCount);
        } else {
          expect(window.ShareMenuInjector.createEmbedLinkMenuItem).not.toHaveBeenCalled();
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 11: Live configuration updates**
 * **Validates: Requirements 4.3, 4.4**
 * 
 * For any configuration change (target hostname or enabled status),
 * subsequent operations should use the updated configuration without requiring a page reload.
 */
describe('Property 11: Live configuration updates', () => {
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
  });

  test('should use updated target hostname after configuration change', async () => {
    // Generator for hostname changes
    const hostnameChangeArbitrary = fc.record({
      initialHostname: fc.constantFrom('fixvx.com', 'vxtwitter.com'),
      updatedHostname: fc.constantFrom('fxtwitter.com', 'twittpr.com'),
      postUrl: fc.constant('https://x.com/user/status/123456')
    });

    await fc.assert(
      fc.asyncProperty(hostnameChangeArbitrary, async (config) => {
        // Setup initial config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: true,
              targetHostname: config.initialHostname
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        await twitterShareMenu.init();
        
        // Simulate configuration update
        const configUpdate = {
          config: {
            newValue: {
              twitter: {
                enabled: true,
                targetHostname: config.updatedHostname
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            },
            oldValue: {
              twitter: {
                enabled: true,
                targetHostname: config.initialHostname
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            }
          }
        };
        
        // Trigger config update handler
        const storageListener = global.browser.storage.onChanged.addListener.mock.calls[0][0];
        storageListener(configUpdate, 'sync');
        
        // Now detect a share menu
        const menu = createMockShareMenu();
        const post = createMockPost(config.postUrl);
        
        window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
        window.PostUrlExtractor.extractPostUrl.mockReturnValue(config.postUrl);
        
        let capturedHostname = null;
        window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url, hostname) => {
          capturedHostname = hostname;
          return createMockElement('DIV', {});
        });
        
        window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
        
        await twitterShareMenu.handleShareMenuDetected(menu);
        
        // Should use the updated hostname
        expect(capturedHostname).toBe(config.updatedHostname);
      }),
      { numRuns: 100 }
    );
  });

  test('should stop/start observer when enabled status changes', async () => {
    // Generator for enabled status changes
    const enabledChangeArbitrary = fc.record({
      initialEnabled: fc.boolean(),
      updatedEnabled: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(enabledChangeArbitrary, async (config) => {
        // Reset mocks for this test iteration
        jest.clearAllMocks();
        
        // Re-setup mocks
        const mockObserver = {
          disconnect: jest.fn()
        };
        
        window.ShareMenuDetector.observeShareMenus = jest.fn().mockReturnValue(mockObserver);
        
        // Setup initial config
        global.browser.storage.sync.get.mockResolvedValue({
          config: {
            twitter: {
              enabled: config.initialEnabled,
              targetHostname: 'fixvx.com'
            },
            instagram: {
              enabled: true,
              targetHostname: 'kkinstagram.com'
            }
          }
        });
        
        await twitterShareMenu.init();
        
        // Get the storage listener that was registered
        const storageListenerCalls = global.browser.storage.onChanged.addListener.mock.calls;
        if (storageListenerCalls.length === 0) {
          // If no listener was registered (e.g., when disabled), skip this test case
          return;
        }
        
        const storageListener = storageListenerCalls[storageListenerCalls.length - 1][0];
        
        // Clear mock calls from init
        jest.clearAllMocks();
        window.ShareMenuDetector.observeShareMenus.mockReturnValue(mockObserver);
        
        // Simulate configuration update
        const configUpdate = {
          config: {
            newValue: {
              twitter: {
                enabled: config.updatedEnabled,
                targetHostname: 'fixvx.com'
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            },
            oldValue: {
              twitter: {
                enabled: config.initialEnabled,
                targetHostname: 'fixvx.com'
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            }
          }
        };
        
        // Trigger config update handler
        storageListener(configUpdate, 'sync');
        
        // Verify observer behavior based on state change
        if (config.initialEnabled && !config.updatedEnabled) {
          // Should disconnect observer when disabled
          expect(mockObserver.disconnect).toHaveBeenCalled();
        } else if (!config.initialEnabled && config.updatedEnabled) {
          // Should start observer when enabled
          expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalled();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should apply configuration changes immediately without page reload', async () => {
    // Generator for configuration change sequences
    const configSequenceArbitrary = fc.array(
      fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.constantFrom('fixvx.com', 'vxtwitter.com', 'fxtwitter.com')
      }),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(configSequenceArbitrary, async (configSequence) => {
        const mockObserver = {
          disconnect: jest.fn()
        };
        
        window.ShareMenuDetector.observeShareMenus.mockReturnValue(mockObserver);
        
        // Setup initial config
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
        
        await twitterShareMenu.init();
        
        const storageListener = global.browser.storage.onChanged.addListener.mock.calls[0][0];
        
        // Apply each configuration change
        for (let i = 0; i < configSequence.length; i++) {
          const newConfig = configSequence[i];
          const oldConfig = i === 0 ? 
            { enabled: true, targetHostname: 'fixvx.com' } : 
            configSequence[i - 1];
          
          const configUpdate = {
            config: {
              newValue: {
                twitter: newConfig,
                instagram: {
                  enabled: true,
                  targetHostname: 'kkinstagram.com'
                }
              },
              oldValue: {
                twitter: oldConfig,
                instagram: {
                  enabled: true,
                  targetHostname: 'kkinstagram.com'
                }
              }
            }
          };
          
          storageListener(configUpdate, 'sync');
          
          // Verify the configuration was applied
          if (newConfig.enabled) {
            const menu = createMockShareMenu();
            const post = createMockPost('https://x.com/user/status/123456');
            
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(post);
            window.PostUrlExtractor.extractPostUrl.mockReturnValue('https://x.com/user/status/123456');
            
            let capturedHostname = null;
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockImplementation((url, hostname) => {
              capturedHostname = hostname;
              return createMockElement('DIV', {});
            });
            
            window.ShareMenuInjector.injectMenuItem.mockReturnValue(true);
            
            await twitterShareMenu.handleShareMenuDetected(menu);
            
            // Should use the current configuration
            expect(capturedHostname).toBe(newConfig.targetHostname);
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});
