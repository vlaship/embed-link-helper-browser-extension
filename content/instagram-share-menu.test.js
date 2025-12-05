/**
 * Instagram Share Menu Tests
 * Unit tests for the simplified Instagram content script
 */

const { init, getConfig } = require('./instagram-share-menu');

describe('Instagram Share Menu', () => {
  
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
        }
      }
    };
    
    // Mock window utilities
    global.window = global.window || {};
    
    // Mock Config module
    global.window.Config = {
      getConfig: jest.fn().mockResolvedValue({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      })
    };
    
    // Mock ShareMenuIntegration module
    global.window.ShareMenuIntegration = {
      initializeShareMenuIntegration: jest.fn().mockResolvedValue({
        cleanup: jest.fn(),
        isActive: jest.fn().mockReturnValue(true)
      })
    };
    
    // Clear instagramIntegration
    global.window.instagramIntegration = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // UNIT TESTS
  // ============================================================================
  
  describe('Unit Tests', () => {
    
    test('init() should initialize share menu integration with Instagram config', async () => {
      // Call init
      await init();
      
      // Verify ShareMenuIntegration was called with correct config
      expect(window.ShareMenuIntegration.initializeShareMenuIntegration).toHaveBeenCalledWith({
        platform: 'instagram',
        platformKey: 'instagram',
        getConfig: expect.any(Function)
      });
      
      // Verify integration was stored
      expect(window.instagramIntegration).toBeDefined();
      expect(typeof window.instagramIntegration.cleanup).toBe('function');
      expect(typeof window.instagramIntegration.isActive).toBe('function');
    });

    test('init() should handle initialization errors gracefully', async () => {
      // Mock initialization to throw error
      window.ShareMenuIntegration.initializeShareMenuIntegration.mockRejectedValue(
        new Error('Initialization failed')
      );
      
      // Should not throw
      await expect(init()).resolves.not.toThrow();
      
      // Integration should not be set on error
      expect(window.instagramIntegration).toBeNull();
    });

    test('getConfig() should use Config module when available', async () => {
      // Call getConfig
      const config = await getConfig();
      
      // Verify Config.getConfig was called
      expect(window.Config.getConfig).toHaveBeenCalled();
      
      // Verify correct config was returned
      expect(config).toEqual({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });
    });

    test('getConfig() should fall back to direct storage access when Config module unavailable', async () => {
      // Remove Config module
      delete window.Config;
      
      // Call getConfig
      const config = await getConfig();
      
      // Verify browser.storage was called
      expect(browser.storage.sync.get).toHaveBeenCalledWith('config');
      
      // Verify correct config was returned
      expect(config).toEqual({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });
    });

    test('getConfig() should return default config when storage is empty', async () => {
      // Remove Config module
      delete window.Config;
      
      // Mock empty storage
      browser.storage.sync.get.mockResolvedValue({});
      
      // Call getConfig
      const config = await getConfig();
      
      // Verify default config was returned
      expect(config).toEqual({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });
    });

    test('getConfig() should return default config on storage error', async () => {
      // Remove Config module
      delete window.Config;
      
      // Mock storage error
      browser.storage.sync.get.mockRejectedValue(new Error('Storage error'));
      
      // Call getConfig
      const config = await getConfig();
      
      // Verify default config was returned
      expect(config).toEqual({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });
    });

    test('init() should pass getConfig function that works correctly', async () => {
      // Call init
      await init();
      
      // Get the config object passed to initializeShareMenuIntegration
      const callArgs = window.ShareMenuIntegration.initializeShareMenuIntegration.mock.calls[0][0];
      const passedGetConfig = callArgs.getConfig;
      
      // Call the passed getConfig function
      const config = await passedGetConfig();
      
      // Verify it returns correct config
      expect(config).toEqual({
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      });
    });

    test('init() should work when ShareMenuIntegration returns minimal controller', async () => {
      // Mock minimal controller
      window.ShareMenuIntegration.initializeShareMenuIntegration.mockResolvedValue({
        cleanup: jest.fn(),
        isActive: jest.fn().mockReturnValue(false)
      });
      
      // Call init
      await init();
      
      // Verify integration was stored
      expect(window.instagramIntegration).toBeDefined();
      expect(window.instagramIntegration.isActive()).toBe(false);
    });

    test('module exports should include init and getConfig', () => {
      // Verify exports
      expect(typeof init).toBe('function');
      expect(typeof getConfig).toBe('function');
    });
  });
});
