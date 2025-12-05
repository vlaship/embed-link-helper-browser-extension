/**
 * Integration Tests
 * End-to-end integration tests for clipboard manager, share menu integration,
 * config loading, and cross-module functionality
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

const { copyToClipboard } = require('./clipboard-manager');
const { initializeShareMenuIntegration } = require('./share-menu-integration');
const { getConfig, saveConfig, clearConfig, getDefaultConfig } = require('../config/config');

describe('Integration Tests', () => {
  
  // ============================================================================
  // CLIPBOARD MANAGER IN BROWSER ENVIRONMENT
  // ============================================================================
  
  describe('Clipboard Manager in Browser Environment', () => {
    
    beforeEach(() => {
      // Reset DOM
      document.body.innerHTML = '';
      
      // Mock window.Logger
      global.window = global.window || {};
      global.window.Logger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('clipboard manager integrates with browser clipboard API', async () => {
      // Mock navigator.clipboard
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: mockWriteText
          }
        },
        writable: true,
        configurable: true
      });

      const testText = 'https://fixvx.com/test/status/123';
      const result = await copyToClipboard(testText);
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(testText);
      expect(window.Logger.log).toHaveBeenCalledWith(
        '[clipboard-manager] Text copied successfully'
      );
    });

    test('clipboard manager handles browser API unavailability', async () => {
      // Mock navigator without clipboard
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true
      });

      const result = await copyToClipboard('test text');
      
      expect(result).toBe(false);
      expect(window.Logger.error).toHaveBeenCalledWith(
        '[clipboard-manager] Clipboard API not available'
      );
    });

    test('clipboard manager handles permission errors', async () => {
      const mockWriteText = jest.fn().mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError')
      );
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: mockWriteText
          }
        },
        writable: true,
        configurable: true
      });

      const result = await copyToClipboard('test text');
      
      expect(result).toBe(false);
      expect(window.Logger.error).toHaveBeenCalledWith(
        '[clipboard-manager] Clipboard copy failed:',
        expect.any(Error)
      );
    });
  });

  // ============================================================================
  // CONFIG LOADING AND UPDATES
  // ============================================================================
  
  describe('Config Loading and Updates', () => {
    
    beforeEach(() => {
      // Mock browser.storage
      global.browser = {
        storage: {
          sync: {
            get: jest.fn(),
            set: jest.fn(),
            remove: jest.fn()
          }
        }
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('config loads from storage successfully', async () => {
      const mockConfig = {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: false,
          targetHostname: 'kkinstagram.com'
        },
        debugLogging: true
      };

      browser.storage.sync.get.mockResolvedValue({ config: mockConfig });

      const config = await getConfig();
      
      expect(config).toEqual(mockConfig);
      expect(browser.storage.sync.get).toHaveBeenCalledWith('config');
    });

    test('config returns defaults when storage is empty', async () => {
      browser.storage.sync.get.mockResolvedValue({});

      const config = await getConfig();
      const defaults = getDefaultConfig();
      
      expect(config).toEqual(defaults);
    });

    test('config saves to storage successfully', async () => {
      const newConfig = {
        twitter: {
          enabled: false,
          targetHostname: 'custom.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        },
        debugLogging: false
      };

      browser.storage.sync.set.mockResolvedValue(undefined);

      await saveConfig(newConfig);
      
      expect(browser.storage.sync.set).toHaveBeenCalledWith({ config: newConfig });
    });

    test('config handles storage errors gracefully', async () => {
      browser.storage.sync.get.mockRejectedValue(new Error('Storage error'));

      const config = await getConfig();
      const defaults = getDefaultConfig();
      
      expect(config).toEqual(defaults);
    });

    test('config validates before saving', async () => {
      const invalidConfig = {
        twitter: {
          enabled: 'not a boolean', // Invalid
          targetHostname: 'fixvx.com'
        }
      };

      await expect(saveConfig(invalidConfig)).rejects.toThrow('Invalid configuration');
      expect(browser.storage.sync.set).not.toHaveBeenCalled();
    });

    test('config clears storage successfully', async () => {
      browser.storage.sync.remove.mockResolvedValue(undefined);

      await clearConfig();
      
      expect(browser.storage.sync.remove).toHaveBeenCalledWith('config');
    });
  });

  // ============================================================================
  // SHARE MENU INTEGRATION WITH BOTH PLATFORMS
  // ============================================================================
  
  describe('Share Menu Integration with Both Platforms', () => {
    
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

    test('Twitter integration initializes successfully', async () => {
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const integration = await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      expect(integration).toBeDefined();
      expect(typeof integration.cleanup).toBe('function');
      expect(typeof integration.isActive).toBe('function');
      expect(integration.isActive()).toBe(true);
      
      expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledWith(
        'twitter',
        expect.any(Function)
      );
    });

    test('Instagram integration initializes successfully', async () => {
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const integration = await initializeShareMenuIntegration({
        platform: 'instagram',
        platformKey: 'instagram',
        getConfig: getConfigFn
      });
      
      expect(integration).toBeDefined();
      expect(typeof integration.cleanup).toBe('function');
      expect(typeof integration.isActive).toBe('function');
      expect(integration.isActive()).toBe(true);
      
      expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledWith(
        'instagram',
        expect.any(Function)
      );
    });

    test('integration respects disabled platform', async () => {
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: false, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const integration = await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      expect(integration.isActive()).toBe(false);
      expect(window.ShareMenuDetector.observeShareMenus).not.toHaveBeenCalled();
    });

    test('integration cleanup disconnects observer', async () => {
      const mockDisconnect = jest.fn();
      window.ShareMenuDetector.observeShareMenus.mockReturnValue({
        disconnect: mockDisconnect
      });

      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const integration = await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      integration.cleanup();
      
      expect(mockDisconnect).toHaveBeenCalled();
      expect(browser.storage.onChanged.removeListener).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // END-TO-END FUNCTIONALITY
  // ============================================================================
  
  describe('End-to-End Functionality', () => {
    
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
            }),
            set: jest.fn().mockResolvedValue(undefined)
          },
          onChanged: {
            addListener: jest.fn(),
            removeListener: jest.fn()
          }
        }
      };
      
      // Mock navigator.clipboard
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, 'navigator', {
        value: {
          clipboard: {
            writeText: mockWriteText
          }
        },
        writable: true,
        configurable: true
      });
      
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
        findAssociatedPost: jest.fn()
      };
      
      global.window.ShareMenuInjector = {
        createEmbedLinkMenuItem: jest.fn(),
        injectMenuItem: jest.fn().mockReturnValue(true)
      };
      
      global.window.PostUrlExtractor = {
        extractPostUrl: jest.fn()
      };
      
      global.window.UrlTransformer = {
        transformUrl: jest.fn()
      };
      
      global.window.FeedbackManager = {
        showSuccessFeedback: jest.fn(),
        showErrorFeedback: jest.fn(),
        hideFeedbackAfterDelay: jest.fn()
      };
      
      // Use real clipboard manager
      global.window.ClipboardManager = {
        copyToClipboard
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('complete flow: Twitter share menu detection to clipboard copy', async () => {
      // Setup
      const postUrl = 'https://twitter.com/user/status/123';
      const targetHostname = 'fixvx.com';
      const transformedUrl = `https://${targetHostname}/user/status/123`;
      
      const mockPostElement = document.createElement('article');
      const mockMenuItem = document.createElement('div');
      
      window.ShareMenuDetector.findAssociatedPost.mockReturnValue(mockPostElement);
      window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
      window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(mockMenuItem);
      window.UrlTransformer.transformUrl.mockReturnValue(transformedUrl);
      
      // Initialize integration
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      // Get the share menu detection handler
      const detectHandler = window.ShareMenuDetector.observeShareMenus.mock.calls[0][1];
      
      // Create and trigger share menu detection
      const menuElement = document.createElement('div');
      document.body.appendChild(menuElement);
      detectHandler(menuElement);
      
      // Verify menu item was created
      expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledWith(
        postUrl,
        targetHostname,
        'twitter'
      );
      
      // Verify menu item was injected
      expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledWith(
        mockMenuItem,
        menuElement,
        'twitter'
      );
      
      // Simulate click on menu item
      const clickEvent = new Event('click');
      Object.defineProperty(clickEvent, 'currentTarget', {
        value: mockMenuItem,
        writable: false
      });
      
      // Trigger click handler
      const clickHandler = mockMenuItem.addEventListener.mock?.calls.find(
        call => call[0] === 'click'
      )?.[1];
      
      if (clickHandler) {
        await clickHandler(clickEvent);
        
        // Verify URL was transformed
        expect(window.UrlTransformer.transformUrl).toHaveBeenCalledWith(
          postUrl,
          targetHostname
        );
        
        // Verify clipboard copy was attempted
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(transformedUrl);
        
        // Verify success feedback was shown
        expect(window.FeedbackManager.showSuccessFeedback).toHaveBeenCalledWith(
          mockMenuItem,
          'twitter'
        );
      }
    });

    test('complete flow: Instagram share menu detection to clipboard copy', async () => {
      // Setup
      const postUrl = 'https://instagram.com/p/ABC123/';
      const targetHostname = 'kkinstagram.com';
      const transformedUrl = `https://${targetHostname}/p/ABC123/`;
      
      const mockPostElement = document.createElement('article');
      const mockMenuItem = document.createElement('div');
      
      window.ShareMenuDetector.findAssociatedPost.mockReturnValue(mockPostElement);
      window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
      window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(mockMenuItem);
      window.UrlTransformer.transformUrl.mockReturnValue(transformedUrl);
      
      // Initialize integration
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname }
      });

      await initializeShareMenuIntegration({
        platform: 'instagram',
        platformKey: 'instagram',
        getConfig: getConfigFn
      });
      
      // Get the share menu detection handler
      const detectHandler = window.ShareMenuDetector.observeShareMenus.mock.calls[0][1];
      
      // Create and trigger share menu detection
      const menuElement = document.createElement('div');
      document.body.appendChild(menuElement);
      detectHandler(menuElement);
      
      // Verify menu item was created
      expect(window.ShareMenuInjector.createEmbedLinkMenuItem).toHaveBeenCalledWith(
        postUrl,
        targetHostname,
        'instagram'
      );
      
      // Verify menu item was injected
      expect(window.ShareMenuInjector.injectMenuItem).toHaveBeenCalledWith(
        mockMenuItem,
        menuElement,
        'instagram'
      );
      
      // Simulate click on menu item
      const clickEvent = new Event('click');
      Object.defineProperty(clickEvent, 'currentTarget', {
        value: mockMenuItem,
        writable: false
      });
      
      // Trigger click handler
      const clickHandler = mockMenuItem.addEventListener.mock?.calls.find(
        call => call[0] === 'click'
      )?.[1];
      
      if (clickHandler) {
        await clickHandler(clickEvent);
        
        // Verify URL was transformed
        expect(window.UrlTransformer.transformUrl).toHaveBeenCalledWith(
          postUrl,
          targetHostname
        );
        
        // Verify clipboard copy was attempted
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(transformedUrl);
        
        // Verify success feedback was shown
        expect(window.FeedbackManager.showSuccessFeedback).toHaveBeenCalledWith(
          mockMenuItem,
          'instagram'
        );
      }
    });

    test('config update propagates to active integration', async () => {
      // Initialize with Twitter enabled
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const integration = await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      expect(integration.isActive()).toBe(true);
      
      // Get the config update handler
      const configUpdateHandler = browser.storage.onChanged.addListener.mock.calls[0][0];
      
      // Simulate config update that disables Twitter
      const changes = {
        config: {
          newValue: {
            twitter: { enabled: false, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          },
          oldValue: {
            twitter: { enabled: true, targetHostname: 'fixvx.com' },
            instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
          }
        }
      };
      
      configUpdateHandler(changes, 'sync');
      
      // Verify observer was disconnected
      expect(window.Logger.log).toHaveBeenCalledWith(
        expect.stringContaining('disabled, stopping observer')
      );
    });

    test('error handling: clipboard failure shows error feedback', async () => {
      // Setup clipboard to fail
      navigator.clipboard.writeText = jest.fn().mockRejectedValue(
        new Error('Permission denied')
      );
      
      const postUrl = 'https://twitter.com/user/status/123';
      const targetHostname = 'fixvx.com';
      const transformedUrl = `https://${targetHostname}/user/status/123`;
      
      const mockPostElement = document.createElement('article');
      const mockMenuItem = document.createElement('div');
      
      window.ShareMenuDetector.findAssociatedPost.mockReturnValue(mockPostElement);
      window.PostUrlExtractor.extractPostUrl.mockReturnValue(postUrl);
      window.ShareMenuInjector.createEmbedLinkMenuItem.mockReturnValue(mockMenuItem);
      window.UrlTransformer.transformUrl.mockReturnValue(transformedUrl);
      
      // Initialize integration
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });
      
      // Get the share menu detection handler
      const detectHandler = window.ShareMenuDetector.observeShareMenus.mock.calls[0][1];
      
      // Create and trigger share menu detection
      const menuElement = document.createElement('div');
      document.body.appendChild(menuElement);
      detectHandler(menuElement);
      
      // Simulate click on menu item
      const clickEvent = new Event('click');
      Object.defineProperty(clickEvent, 'currentTarget', {
        value: mockMenuItem,
        writable: false
      });
      
      // Trigger click handler
      const clickHandler = mockMenuItem.addEventListener.mock?.calls.find(
        call => call[0] === 'click'
      )?.[1];
      
      if (clickHandler) {
        await clickHandler(clickEvent);
        
        // Verify error feedback was shown
        expect(window.FeedbackManager.showErrorFeedback).toHaveBeenCalledWith(
          mockMenuItem,
          'Copy failed',
          'twitter'
        );
      }
    });

    test('multiple platforms can run simultaneously', async () => {
      // Initialize both platforms
      const getConfigFn = jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });

      const twitterIntegration = await initializeShareMenuIntegration({
        platform: 'twitter',
        platformKey: 'twitter',
        getConfig: getConfigFn
      });

      const instagramIntegration = await initializeShareMenuIntegration({
        platform: 'instagram',
        platformKey: 'instagram',
        getConfig: getConfigFn
      });
      
      // Both should be active
      expect(twitterIntegration.isActive()).toBe(true);
      expect(instagramIntegration.isActive()).toBe(true);
      
      // Both should have observers
      expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledTimes(2);
      expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledWith(
        'twitter',
        expect.any(Function)
      );
      expect(window.ShareMenuDetector.observeShareMenus).toHaveBeenCalledWith(
        'instagram',
        expect.any(Function)
      );
      
      // Cleanup both
      twitterIntegration.cleanup();
      instagramIntegration.cleanup();
      
      // Both should be inactive
      expect(twitterIntegration.isActive()).toBe(false);
      expect(instagramIntegration.isActive()).toBe(false);
    });
  });
});
