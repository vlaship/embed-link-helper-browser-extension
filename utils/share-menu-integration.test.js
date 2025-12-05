/**
 * Share Menu Integration Tests
 * Property-based tests for share menu integration module
 */

const fc = require('fast-check');
const { initializeShareMenuIntegration, getMenuIdentifier } = require('./share-menu-integration');

describe('Share Menu Integration', () => {
  
  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
    beforeEach(() => {
      // Reset DOM
      document.body.innerHTML = '';
      
      // Mock browser API
      global.browser = {
        storage: {
          sync: {
            get: jest.fn().mockResolvedValue({
              config: {
                twitter: { enabled: true, targetHostname: 'fixvx.com' },
                instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
              }
            })
          },
          onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };
      
      // Mock window utilities
      global.window = global.window || {};
      global.window.Logger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        initLogger: jest.fn().mockResolvedValue(undefined)
      };
      
      global.window.ShareMenuDetector = {
        observeShareMenus: jest.fn().mockReturnValue({
          disconnect: jest.fn()
        }),
        findAssociatedPost: jest.fn().mockReturnValue(null)
      };
      
      global.window.ShareMenuInjector = {
        createEmbedLinkMenuItem: jest.fn().mockReturnValue(null),
        injectMenuItem: jest.fn().mockReturnValue(false)
      };
      
      global.window.PostUrlExtractor = {
        extractPostUrl: jest.fn().mockReturnValue(null)
      };
      
      global.window.UrlTransformer = {
        transformUrl: jest.fn((url, hostname) => `https://${hostname}/transformed`)
      };
      
      global.window.FeedbackManager = {
        showSuccessFeedback: jest.fn(),
        showErrorFeedback: jest.fn(),
        hideFeedbackAfterDelay: jest.fn()
      };
      
      global.window.ClipboardManager = {
        copyToClipboard: jest.fn().mockResolvedValue(true)
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    /**
     * Feature: code-refactoring, Property 2: Share menu integration equivalence
     * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5
     * 
     * For any platform configuration (Twitter or Instagram), the share menu integration module
     * should produce the same behavior as the original platform-specific implementation when
     * given equivalent inputs
     */
    test('Property 2: Share menu integration equivalence', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            platform: fc.constantFrom('twitter', 'instagram'),
            enabled: fc.boolean(),
            targetHostname: fc.webUrl().map(url => new URL(url).hostname)
          }),
          async (platformConfig) => {
            const { platform, enabled, targetHostname } = platformConfig;
            const platformKey = platform;
            
            // Mock config with the generated values
            const mockConfig = {
              twitter: {
                enabled: platform === 'twitter' ? enabled : true,
                targetHostname: platform === 'twitter' ? targetHostname : 'fixvx.com'
              },
              instagram: {
                enabled: platform === 'instagram' ? enabled : true,
                targetHostname: platform === 'instagram' ? targetHostname : 'kkinstagram.com'
              }
            };
            
            const getConfig = jest.fn().mockResolvedValue(mockConfig);
            
            // Initialize integration
            const integration = await initializeShareMenuIntegration({
              platform,
              platformKey,
              getConfig
            });
            
            // Verify integration controller is returned
            expect(integration).toBeDefined();
            expect(typeof integration.cleanup).toBe('function');
            expect(typeof integration.isActive).toBe('function');
            
            // Verify logger was initialized
            expect(window.Logger.initLogger).toHaveBeenCalledWith(mockConfig);
            
            // Verify config was loaded
            expect(getConfig).toHaveBeenCalled();
            
            // If platform is enabled, observer should be started
            if (enabled) {
              expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledWith(
                platform,
                expect.any(Function)
              );
              expect(integration.isActive()).toBe(true);
            } else {
              // If disabled, observer should not be started
              expect(integration.isActive()).toBe(false);
            }
            
            // Verify storage listener was added (if enabled)
            if (enabled) {
              expect(browser.storage.onChanged.addListener).toHaveBeenCalled();
            }
            
            // Test cleanup
            integration.cleanup();
            
            // Verify cleanup removes listener
            if (enabled) {
              expect(browser.storage.onChanged.removeListener).toHaveBeenCalled();
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Menu identifier uniqueness', async () => {
      /**
       * For any menu element, getMenuIdentifier should return a unique identifier
       * that remains consistent across multiple calls for the same element
       */
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numElements) => {
            const elements = [];
            const identifiers = new Set();
            
            // Create multiple menu elements
            for (let i = 0; i < numElements; i++) {
              const element = document.createElement('div');
              document.body.appendChild(element);
              elements.push(element);
            }
            
            // Get identifiers for all elements
            for (const element of elements) {
              const id1 = getMenuIdentifier(element);
              const id2 = getMenuIdentifier(element);
              
              // Same element should return same identifier
              expect(id1).toBe(id2);
              
              // All identifiers should be unique
              identifiers.add(id1);
            }
            
            // Number of unique identifiers should equal number of elements
            expect(identifiers.size).toBe(numElements);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 4: Configuration update handling', async () => {
      /**
       * For any configuration change, the integration should properly handle
       * enabling/disabling the observer based on the new config
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            platform: fc.constantFrom('twitter', 'instagram'),
            initialEnabled: fc.boolean(),
            newEnabled: fc.boolean()
          }),
          async (testConfig) => {
            const { platform, initialEnabled, newEnabled } = testConfig;
            const platformKey = platform;
            
            // Initial config
            const initialConfig = {
              twitter: {
                enabled: platform === 'twitter' ? initialEnabled : true,
                targetHostname: 'fixvx.com'
              },
              instagram: {
                enabled: platform === 'instagram' ? initialEnabled : true,
                targetHostname: 'kkinstagram.com'
              }
            };
            
            const getConfig = jest.fn().mockResolvedValue(initialConfig);
            
            // Initialize integration
            const integration = await initializeShareMenuIntegration({
              platform,
              platformKey,
              getConfig
            });
            
            // Get the config update handler that was registered
            const configUpdateHandler = browser.storage.onChanged.addListener.mock.calls[0]?.[0];
            
            if (configUpdateHandler && initialEnabled) {
              // Simulate config update
              const newConfig = {
                twitter: {
                  enabled: platform === 'twitter' ? newEnabled : true,
                  targetHostname: 'fixvx.com'
                },
                instagram: {
                  enabled: platform === 'instagram' ? newEnabled : true,
                  targetHostname: 'kkinstagram.com'
                }
              };
              
              const changes = {
                config: {
                  newValue: newConfig,
                  oldValue: initialConfig
                }
              };
              
              // Clear previous calls
              jest.clearAllMocks();
              
              // Trigger config update
              configUpdateHandler(changes, 'sync');
              
              // If state changed from enabled to disabled, observer should be disconnected
              if (initialEnabled && !newEnabled) {
                expect(window.Logger.log).toHaveBeenCalledWith(
                  expect.stringContaining('disabled, stopping observer')
                );
              }
              
              // If state changed from disabled to enabled, observer should be started
              if (!initialEnabled && newEnabled) {
                expect(window.Logger.log).toHaveBeenCalledWith(
                  expect.stringContaining('enabled, starting observer')
                );
              }
            }
            
            // Cleanup
            integration.cleanup();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 5: Clipboard integration', async () => {
      /**
       * For any valid URL and target hostname, when a menu item is clicked,
       * the integration should use the ClipboardManager to copy the transformed URL
       */
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            platform: fc.constantFrom('twitter', 'instagram'),
            postUrl: fc.webUrl(),
            targetHostname: fc.webUrl().map(url => new URL(url).hostname),
            clipboardSuccess: fc.boolean()
          }),
          async (testData) => {
            const { platform, postUrl, targetHostname, clipboardSuccess } = testData;
            const platformKey = platform;
            
            // Clear all mocks to prevent cross-contamination between test runs
            jest.clearAllMocks();
            
            // Reset DOM
            document.body.innerHTML = '';
            
            // Mock config - ensure both platforms have proper config
            const mockConfig = {
              twitter: {
                enabled: true,
                targetHostname: 'fixvx.com'
              },
              instagram: {
                enabled: true,
                targetHostname: 'kkinstagram.com'
              }
            };
            
            // Override the target platform's hostname
            mockConfig[platformKey].targetHostname = targetHostname;
            
            const getConfig = jest.fn().mockResolvedValue(mockConfig);
            
            // Re-setup window utilities with fresh mocks
            window.ShareMenuDetector = {
              observeShareMenus: jest.fn().mockReturnValue({
                disconnect: jest.fn()
              }),
              findAssociatedPost: jest.fn()
            };
            
            window.ShareMenuInjector = {
              createEmbedLinkMenuItem: jest.fn(),
              injectMenuItem: jest.fn().mockReturnValue(true)
            };
            
            window.PostUrlExtractor = {
              extractPostUrl: jest.fn()
            };
            
            window.UrlTransformer = {
              transformUrl: jest.fn()
            };
            
            window.FeedbackManager = {
              showSuccessFeedback: jest.fn(),
              showErrorFeedback: jest.fn(),
              hideFeedbackAfterDelay: jest.fn()
            };
            
            window.ClipboardManager = {
              copyToClipboard: jest.fn()
            };
            
            // Now set up the specific mocks for this test
            window.ClipboardManager.copyToClipboard.mockResolvedValue(clipboardSuccess);
            
            // Mock menu element creation
            const mockMenuItem = document.createElement('div');
            window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(mockMenuItem);
            
            // Mock post detection
            const mockPostElement = document.createElement('article');
            window.ShareMenuDetector.findAssociatedPost.mockReturnValue(mockPostElement);
            
            // Mock URL extraction
            window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
            
            // Mock URL transformation
            const transformedUrl = `https://${targetHostname}/transformed`;
            window.UrlTransformer.transformUrl.mockReturnValue(transformedUrl);
            
            // Initialize integration
            await initializeShareMenuIntegration({
              platform,
              platformKey,
              getConfig
            });
            
            // Get the share menu detection handler
            const detectHandler = window.ShareMenuDetector.observeShareMenus.mock.calls[0]?.[1];
            
            if (detectHandler) {
              // Create a mock menu element
              const menuElement = document.createElement('div');
              document.body.appendChild(menuElement);
              
              // Trigger share menu detection
              detectHandler(menuElement);
              
              // Verify menu item was created with correct parameters
              expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledWith(
                postUrl,
                targetHostname,
                platform
              );
              
              // Simulate click on menu item
              const clickEvent = new Event('click');
              Object.defineProperty(clickEvent, 'currentTarget', {
                value: mockMenuItem,
                writable: false
              });
              
              // Get the click handler that was added to the menu item
              const clickHandler = mockMenuItem.onclick || 
                (mockMenuItem.addEventListener.mock?.calls.find(call => call[0] === 'click')?.[1]);
              
              if (clickHandler) {
                await clickHandler(clickEvent);
                
                // Verify URL was transformed
                expect(window.UrlTransformer.transformUrl).toHaveBeenCalledWith(
                  postUrl,
                  mockConfig[platformKey].targetHostname
                );
                
                // Verify clipboard manager was called
                expect(window.ClipboardManager.copyToClipboard).toHaveBeenCalledWith(transformedUrl);
                
                // Verify feedback was shown based on clipboard result
                if (clipboardSuccess) {
                  expect(window.FeedbackManager.showSuccessFeedback).toHaveBeenCalledWith(
                    mockMenuItem,
                    platform
                  );
                } else {
                  expect(window.FeedbackManager.showErrorFeedback).toHaveBeenCalledWith(
                    mockMenuItem,
                    'Copy failed',
                    platform
                  );
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6: Error handling consistency', async () => {
      /**
       * For any platform, when utilities fail, the integration should handle errors
       * gracefully without crashing
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('twitter', 'instagram'),
          async (platform) => {
            const platformKey = platform;
            
            // Mock config that throws error
            const getConfig = jest.fn().mockRejectedValue(new Error('Config load failed'));
            
            // Initialize integration (should not throw)
            const integration = await initializeShareMenuIntegration({
              platform,
              platformKey,
              getConfig
            });
            
            // Should return a valid controller even on error
            expect(integration).toBeDefined();
            expect(typeof integration.cleanup).toBe('function');
            expect(typeof integration.isActive).toBe('function');
            
            // Should be inactive due to error
            expect(integration.isActive()).toBe(false);
            
            // Cleanup should not throw
            expect(() => integration.cleanup()).not.toThrow();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
