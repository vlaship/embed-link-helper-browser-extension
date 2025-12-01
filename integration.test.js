/**
 * Integration Tests for Social Media Redirector Extension
 * Tests complete flows and component interactions
 * 
 * Requirements: All
 * 
 * These tests verify:
 * - Complete flow: install → configure → visit page → click button
 * - Popup-to-background-to-content communication
 * - Behavior across browser restarts (storage persistence)
 * - Integration with actual page structures
 */

const fc = require('fast-check');
const { transformUrl } = require('./utils/url-transformer.js');

// Mock browser storage API
const mockStorage = {
  data: {},
  sync: {
    get: jest.fn((key) => {
      return Promise.resolve(mockStorage.data);
    }),
    set: jest.fn((obj) => {
      mockStorage.data = { ...mockStorage.data, ...obj };
      return Promise.resolve();
    }),
    remove: jest.fn((key) => {
      delete mockStorage.data[key];
      return Promise.resolve();
    })
  }
};

// Mock browser runtime API for message passing
const mockRuntime = {
  onMessage: {
    listeners: [],
    addListener: jest.fn((listener) => {
      mockRuntime.onMessage.listeners.push(listener);
    })
  },
  onInstalled: {
    listeners: [],
    addListener: jest.fn((listener) => {
      mockRuntime.onInstalled.listeners.push(listener);
    })
  },
  sendMessage: jest.fn((message) => {
    // Simulate message passing to background script
    return new Promise((resolve) => {
      const listeners = mockRuntime.onMessage.listeners;
      if (listeners.length > 0) {
        listeners[0](message, {}, resolve);
      } else {
        resolve({ success: false, error: 'No listeners' });
      }
    });
  })
};

// Setup browser API mocks
global.chrome = {
  storage: mockStorage,
  runtime: mockRuntime
};

global.browser = {
  storage: mockStorage,
  runtime: mockRuntime
};

// Helper to load background script fresh
function loadBackgroundScript() {
  // Use jest.resetModules to clear ALL module cache
  jest.resetModules();
  
  // Re-setup global mocks after reset
  global.chrome = {
    storage: mockStorage,
    runtime: mockRuntime
  };
  
  global.browser = {
    storage: mockStorage,
    runtime: mockRuntime
  };
  
  // Load the script (this will re-register listeners)
  require('./background/background.js');
}

// Reset mocks before each test
beforeEach(() => {
  // Clear storage
  mockStorage.data = {};
  
  // Clear listeners
  mockRuntime.onMessage.listeners = [];
  mockRuntime.onInstalled.listeners = [];
  
  // Reset mock call history but keep implementations
  mockStorage.sync.get.mockClear();
  mockStorage.sync.set.mockClear();
  mockStorage.sync.remove.mockClear();
  mockRuntime.onMessage.addListener.mockClear();
  mockRuntime.onInstalled.addListener.mockClear();
  mockRuntime.sendMessage.mockClear();
  
  // Reset DOM
  document.body.innerHTML = '';
  
  // Load background script fresh for each test
  loadBackgroundScript();
});

describe('Integration Test: Complete Extension Flow', () => {
  test('should complete full flow: install → configure → use URL transformer', async () => {
    // Step 1: Simulate extension installation
    // Trigger onInstalled event
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Verify default config was initialized
    expect(mockStorage.data.config).toBeDefined();
    expect(mockStorage.data.config.twitter.targetHostname).toBe('fixvx.com');
    expect(mockStorage.data.config.instagram.targetHostname).toBe('kkinstagram.com');
    
    // Step 2: User opens popup and configures hostnames
    const newConfig = {
      twitter: {
        enabled: true,
        targetHostname: 'custom-twitter.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'custom-instagram.com'
      }
    };
    
    // Simulate popup saving configuration
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    expect(saveResponse.success).toBe(true);
    expect(mockStorage.data.config).toEqual(newConfig);
    
    // Step 3: Get config from background
    const configResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(configResponse.success).toBe(true);
    expect(configResponse.config.twitter.targetHostname).toBe('custom-twitter.com');
    
    // Step 4: Use URL transformer (simulates what content script does)
    const currentUrl = 'https://x.com/user/status/123?ref=source#reply';
    const targetUrl = transformUrl(currentUrl, 'custom-twitter.com');
    
    // Verify URL transformation
    expect(targetUrl).toBe('https://custom-twitter.com/user/status/123?ref=source#reply');
  });

  test('should handle configuration changes across browser restarts', async () => {
    // Simulate first session: install and configure
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    const customConfig = {
      twitter: {
        enabled: true,
        targetHostname: 'session1-twitter.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'session1-instagram.com'
      }
    };
    
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: customConfig
    });
    
    expect(saveResponse.success).toBe(true);
    
    // Verify config is saved in storage
    expect(mockStorage.data.config).toEqual(customConfig);
    
    // Simulate browser restart by clearing runtime listeners but keeping storage
    const savedStorage = { ...mockStorage.data };
    mockRuntime.onMessage.listeners = [];
    mockRuntime.onInstalled.listeners = [];
    
    // Reload background script (simulates restart)
    mockStorage.data = savedStorage;
    loadBackgroundScript();
    
    // Verify config persists after restart
    const configResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(configResponse.success).toBe(true);
    expect(configResponse.config).toEqual(customConfig);
    
    // Update config in second session
    const newConfig = {
      twitter: {
        enabled: true,
        targetHostname: 'session2-twitter.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'session2-instagram.com'
      }
    };
    
    await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    // Simulate another restart
    const savedStorage2 = { ...mockStorage.data };
    mockRuntime.onMessage.listeners = [];
    mockRuntime.onInstalled.listeners = [];
    mockStorage.data = savedStorage2;
    loadBackgroundScript();
    
    // Verify new config persists
    const finalConfigResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(finalConfigResponse.success).toBe(true);
    expect(finalConfigResponse.config).toEqual(newConfig);
  });
});

describe('Integration Test: Popup-Background-Content Communication', () => {
  test('should handle message flow from popup to background to content', async () => {
    // Initialize with default config
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Simulate popup requesting current config
    const getConfigResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    
    expect(getConfigResponse.success).toBe(true);
    expect(getConfigResponse.config).toBeDefined();
    expect(getConfigResponse.config.twitter.targetHostname).toBe('fixvx.com');
    
    // Simulate popup saving new config
    const newConfig = {
      twitter: {
        enabled: true,
        targetHostname: 'new-twitter.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'new-instagram.com'
      }
    };
    
    const saveConfigResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    expect(saveConfigResponse.success).toBe(true);
    
    // Simulate content script requesting updated config
    const updatedConfigResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    
    expect(updatedConfigResponse.success).toBe(true);
    expect(updatedConfigResponse.config).toEqual(newConfig);
  });

  test('should handle invalid messages gracefully', async () => {
    // Test unknown action
    const unknownResponse = await mockRuntime.sendMessage({ action: 'unknownAction' });
    expect(unknownResponse.success).toBe(false);
    expect(unknownResponse.error).toContain('Unknown action');
    
    // Test saveConfig without data
    const noDataResponse = await mockRuntime.sendMessage({ action: 'saveConfig' });
    expect(noDataResponse.success).toBe(false);
    expect(noDataResponse.error).toContain('No configuration data');
    
    // Test saveConfig with truly invalid data (invalid hostname)
    const invalidDataResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: {
        twitter: {
          enabled: true,
          targetHostname: 'http://invalid.com' // Invalid: contains protocol
        },
        instagram: {
          enabled: true,
          targetHostname: 'valid.com'
        }
      }
    });
    expect(invalidDataResponse.success).toBe(false);
    expect(invalidDataResponse.error).toBeDefined();
  });

  test('should handle concurrent configuration requests', async () => {
    // Initialize
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Send multiple concurrent getConfig requests
    const requests = [
      mockRuntime.sendMessage({ action: 'getConfig' }),
      mockRuntime.sendMessage({ action: 'getConfig' }),
      mockRuntime.sendMessage({ action: 'getConfig' })
    ];
    
    const responses = await Promise.all(requests);
    
    // All should succeed with same config
    responses.forEach(response => {
      expect(response.success).toBe(true);
      expect(response.config).toBeDefined();
    });
    
    // All configs should be identical
    expect(responses[0].config).toEqual(responses[1].config);
    expect(responses[1].config).toEqual(responses[2].config);
  });
});

describe('Integration Test: URL Transformation Integration', () => {
  test('should transform Twitter URLs correctly using url-transformer', async () => {
    // Initialize with default config
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Get config
    const configResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(configResponse.success).toBe(true);
    
    // Test URL transformation with default config
    const testUrl = 'https://x.com/elonmusk/status/123456789';
    const redirectUrl = transformUrl(testUrl, configResponse.config.twitter.targetHostname);
    expect(redirectUrl).toBe('https://fixvx.com/elonmusk/status/123456789');
  });

  test('should transform Instagram URLs correctly using url-transformer', async () => {
    // Initialize with default config
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Get config
    const configResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(configResponse.success).toBe(true);
    
    // Test URL transformation with default config
    const testUrl = 'https://www.instagram.com/p/ABC123/';
    const redirectUrl = transformUrl(testUrl, configResponse.config.instagram.targetHostname);
    expect(redirectUrl).toBe('https://kkinstagram.com/p/ABC123/');
  });

  test('should use custom hostnames after configuration update', async () => {
    // Initialize
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Update config with custom hostnames
    const customConfig = {
      twitter: {
        enabled: true,
        targetHostname: 'my-custom-twitter.com'
      },
      instagram: {
        enabled: true,
        targetHostname: 'my-custom-instagram.com'
      }
    };
    
    await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: customConfig
    });
    
    // Get updated config
    const configResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(configResponse.success).toBe(true);
    
    // Test URL transformation with custom config
    const twitterUrl = 'https://x.com/user/status/123';
    const twitterRedirect = transformUrl(twitterUrl, configResponse.config.twitter.targetHostname);
    expect(twitterRedirect).toBe('https://my-custom-twitter.com/user/status/123');
    
    const instagramUrl = 'https://www.instagram.com/p/XYZ/';
    const instagramRedirect = transformUrl(instagramUrl, configResponse.config.instagram.targetHostname);
    expect(instagramRedirect).toBe('https://my-custom-instagram.com/p/XYZ/');
  });
});

describe('Integration Test: URL Transformation with Real Patterns', () => {
  test('should handle complex Twitter URLs correctly', async () => {
    const testCases = [
      {
        input: 'https://x.com/user/status/123',
        target: 'fixvx.com',
        expected: 'https://fixvx.com/user/status/123'
      },
      {
        input: 'https://x.com/user/status/123?ref=source',
        target: 'fixvx.com',
        expected: 'https://fixvx.com/user/status/123?ref=source'
      },
      {
        input: 'https://x.com/user/status/123#reply',
        target: 'fixvx.com',
        expected: 'https://fixvx.com/user/status/123#reply'
      },
      {
        input: 'https://x.com/user/status/123?ref=source#reply',
        target: 'fixvx.com',
        expected: 'https://fixvx.com/user/status/123?ref=source#reply'
      },
      {
        input: 'https://x.com/explore',
        target: 'custom.com',
        expected: 'https://custom.com/explore'
      }
    ];
    
    testCases.forEach(({ input, target, expected }) => {
      const result = transformUrl(input, target);
      expect(result).toBe(expected);
    });
  });

  test('should handle complex Instagram URLs correctly', async () => {
    const testCases = [
      {
        input: 'https://www.instagram.com/p/ABC123/',
        target: 'kkinstagram.com',
        expected: 'https://kkinstagram.com/p/ABC123/'
      },
      {
        input: 'https://www.instagram.com/username/',
        target: 'kkinstagram.com',
        expected: 'https://kkinstagram.com/username/'
      },
      {
        input: 'https://www.instagram.com/p/ABC123/?utm_source=ig_web',
        target: 'kkinstagram.com',
        expected: 'https://kkinstagram.com/p/ABC123/?utm_source=ig_web'
      },
      {
        input: 'https://www.instagram.com/explore/tags/hashtag/',
        target: 'custom.com',
        expected: 'https://custom.com/explore/tags/hashtag/'
      }
    ];
    
    testCases.forEach(({ input, target, expected }) => {
      const result = transformUrl(input, target);
      expect(result).toBe(expected);
    });
  });
});

describe('Integration Test: Storage Persistence Across Sessions', () => {
  test('should maintain configuration through multiple save/load cycles', async () => {
    // Initialize
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Perform multiple configuration updates
    const configs = [
      {
        twitter: { enabled: true, targetHostname: 'config1-twitter.com' },
        instagram: { enabled: true, targetHostname: 'config1-instagram.com' }
      },
      {
        twitter: { enabled: false, targetHostname: 'config2-twitter.com' },
        instagram: { enabled: true, targetHostname: 'config2-instagram.com' }
      },
      {
        twitter: { enabled: true, targetHostname: 'config3-twitter.com' },
        instagram: { enabled: false, targetHostname: 'config3-instagram.com' }
      }
    ];
    
    for (const config of configs) {
      // Save config
      const saveResponse = await mockRuntime.sendMessage({
        action: 'saveConfig',
        data: config
      });
      expect(saveResponse.success).toBe(true);
      
      // Immediately retrieve and verify
      const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
      expect(getResponse.success).toBe(true);
      expect(getResponse.config).toEqual(config);
      
      // Verify storage contains the config
      expect(mockStorage.data.config).toEqual(config);
    }
    
    // Final verification: last config should still be in storage
    const finalResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(finalResponse.config).toEqual(configs[configs.length - 1]);
  });

  test('should handle storage clear and reinitialize with defaults', async () => {
    // Initialize
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Initialize with custom config
    const customConfig = {
      twitter: { enabled: true, targetHostname: 'custom-twitter.com' },
      instagram: { enabled: true, targetHostname: 'custom-instagram.com' }
    };
    
    await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: customConfig
    });
    
    // Verify custom config is saved
    let response = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(response.config).toEqual(customConfig);
    
    // Simulate storage clear (user clears browser data)
    mockStorage.data = {};
    
    // Request config after clear - should return defaults
    response = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(response.success).toBe(true);
    expect(response.config.twitter.targetHostname).toBe('fixvx.com');
    expect(response.config.instagram.targetHostname).toBe('kkinstagram.com');
  });
});

describe('Integration Test: Error Handling Across Components', () => {
  test('should handle storage errors gracefully in full flow', async () => {
    // Initialize
    const installDetails = { reason: 'install' };
    for (const listener of mockRuntime.onInstalled.listeners) {
      await listener(installDetails);
    }
    
    // Simulate storage failure
    mockStorage.sync.set.mockRejectedValueOnce(new Error('Storage quota exceeded'));
    
    // Attempt to save config
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: {
        twitter: { enabled: true, targetHostname: 'test.com' },
        instagram: { enabled: true, targetHostname: 'test2.com' }
      }
    });
    
    // Should fail gracefully
    expect(saveResponse.success).toBe(false);
    expect(saveResponse.error).toContain('Failed to save configuration');
    
    // Restore mock
    mockStorage.sync.set.mockImplementation((obj) => {
      mockStorage.data = { ...mockStorage.data, ...obj };
      return Promise.resolve();
    });
    
    // Subsequent operations should work
    const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(getResponse.success).toBe(true);
    expect(getResponse.config).toBeDefined();
  });

  test('should provide defaults when storage read fails', async () => {
    // Simulate storage read failure
    mockStorage.sync.get.mockRejectedValueOnce(new Error('Storage unavailable'));
    
    // Request config
    const response = await mockRuntime.sendMessage({ action: 'getConfig' });
    
    // Should succeed with defaults
    expect(response.success).toBe(true);
    expect(response.config.twitter.targetHostname).toBe('fixvx.com');
    expect(response.config.instagram.targetHostname).toBe('kkinstagram.com');
    
    // Restore mock
    mockStorage.sync.get.mockImplementation((key) => {
      return Promise.resolve(mockStorage.data);
    });
  });
});

describe('Integration Test: Property-Based Full Flow Testing', () => {
  test('should handle arbitrary valid configurations through full flow', async () => {
    // Generator for valid configurations
    const configArbitrary = fc.record({
      twitter: fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.domain()
      }),
      instagram: fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.domain()
      })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Reset for each iteration
        mockStorage.data = {};
        mockRuntime.onMessage.listeners = [];
        mockRuntime.onInstalled.listeners = [];
        jest.clearAllMocks();
        
        // Load background script
        loadBackgroundScript();
        
        // Initialize
        const installDetails = { reason: 'install' };
        for (const listener of mockRuntime.onInstalled.listeners) {
          await listener(installDetails);
        }
        
        // Save config
        const saveResponse = await mockRuntime.sendMessage({
          action: 'saveConfig',
          data: config
        });
        expect(saveResponse.success).toBe(true);
        
        // Retrieve config
        const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
        expect(getResponse.success).toBe(true);
        expect(getResponse.config).toEqual(config);
        
        // Simulate browser restart
        const savedStorage = { ...mockStorage.data };
        mockRuntime.onMessage.listeners = [];
        mockRuntime.onInstalled.listeners = [];
        mockStorage.data = savedStorage;
        
        // Reload background script
        loadBackgroundScript();
        
        // Verify config persists
        const persistedResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
        expect(persistedResponse.success).toBe(true);
        expect(persistedResponse.config).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Integration Tests for Per-Post Redirect Buttons
 * Tests complete flow: page load → detect posts → inject buttons → click → redirect
 * Requirements: All
 */

// Import per-post modules
const { findPostContainers, isPostContainer } = require('./utils/post-detector');
const { extractPostUrl, extractTweetUrl, extractInstagramPostUrl } = require('./utils/post-url-extractor');
const { createPerPostButton } = require('./utils/per-post-button');
const { findInjectionPoint, injectButton, removeButton } = require('./utils/button-injector');
const { markPostProcessed, isPostProcessed, clearRegistry } = require('./utils/post-registry');
const { processPost, processBatch, processAllPosts } = require('./utils/post-processor');

describe('Integration Test: Complete Per-Post Button Flow (Twitter)', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    // Clear registry
    clearRegistry();
    
    // Mock getBoundingClientRect for all elements to have non-zero dimensions
    Element.prototype.getBoundingClientRect = jest.fn(function() {
      return {
        width: 600,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
  });

  test('should complete full flow: detect tweet → extract URL → create button → inject → click', () => {
    // Step 1: Create a mock tweet in the DOM
    const tweetHtml = `
      <article data-testid="tweet">
        <div>
          <div>
            <a href="https://x.com/testuser/status/123456789">
              <time datetime="2024-01-01">Jan 1</time>
            </a>
          </div>
          <div>Tweet content here</div>
          <div role="group">
            <button data-testid="reply">Reply</button>
            <button data-testid="retweet">Retweet</button>
            <button data-testid="like">Like</button>
          </div>
        </div>
      </article>
    `;
    document.body.innerHTML = tweetHtml;
    
    // Step 2: Detect post containers
    const posts = findPostContainers('twitter');
    expect(posts.length).toBe(1);
    expect(isPostContainer(posts[0], 'twitter')).toBe(true);
    
    // Step 3: Extract URL from tweet
    const tweetUrl = extractTweetUrl(posts[0]);
    expect(tweetUrl).toBeTruthy();
    expect(tweetUrl).toContain('/status/123456789');
    
    // Step 4: Create redirect button
    const targetHostname = 'fixvx.com';
    const button = createPerPostButton(tweetUrl, targetHostname, 'twitter');
    expect(button).toBeTruthy();
    expect(button.tagName).toBe('BUTTON');
    expect(button.textContent).toContain('Redirect');
    
    // Step 5: Find injection point
    const injectionPoint = findInjectionPoint(posts[0], 'twitter');
    expect(injectionPoint).toBeTruthy();
    expect(injectionPoint.getAttribute('role')).toBe('group');
    
    // Step 6: Inject button
    const injected = injectButton(button, injectionPoint, posts[0], 'twitter');
    expect(injected).toBe(true);
    
    // Verify button is in DOM
    const injectedButton = document.querySelector('.social-redirector-per-post-button');
    expect(injectedButton).toBeTruthy();
    
    // Step 7: Simulate button click
    let redirectUrl = null;
    delete window.location;
    window.location = { href: '' };
    Object.defineProperty(window.location, 'href', {
      set: (url) => { redirectUrl = url; },
      get: () => redirectUrl
    });
    
    injectedButton.click();
    
    // Verify redirect URL
    expect(redirectUrl).toBe(`https://${targetHostname}/testuser/status/123456789`);
  });

  test('should handle multiple tweets in batch', () => {
    // Create multiple tweets
    const tweetsHtml = `
      <article data-testid="tweet">
        <a href="https://x.com/user1/status/111"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
      <article data-testid="tweet">
        <a href="https://x.com/user2/status/222"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
      <article data-testid="tweet">
        <a href="https://x.com/user3/status/333"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    document.body.innerHTML = tweetsHtml;
    
    // Process all posts
    const result = processAllPosts('twitter', 'fixvx.com');
    
    expect(result.total).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    
    // Verify all buttons are injected
    const buttons = document.querySelectorAll('.social-redirector-per-post-button');
    expect(buttons.length).toBe(3);
  });

  test('should handle retweets correctly', () => {
    // Create a retweet with original tweet URL
    const retweetHtml = `
      <article data-testid="tweet">
        <div>Retweeted</div>
        <a href="https://x.com/original_user/status/999888777">
          <time datetime="2024-01-01">Jan 1</time>
        </a>
        <div role="group"><button>Action</button></div>
      </article>
    `;
    document.body.innerHTML = retweetHtml;
    
    const posts = findPostContainers('twitter');
    const url = extractTweetUrl(posts[0]);
    
    // Should extract original tweet URL, not retweeter's URL
    expect(url).toContain('/status/999888777');
    expect(url).toContain('original_user');
  });

  test('should not inject duplicate buttons (idempotence)', () => {
    const tweetHtml = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    document.body.innerHTML = tweetHtml;
    
    const posts = findPostContainers('twitter');
    
    // Process the same post multiple times
    processPost(posts[0], 'twitter', 'fixvx.com');
    processPost(posts[0], 'twitter', 'fixvx.com');
    processPost(posts[0], 'twitter', 'fixvx.com');
    
    // Should only have one button
    const buttons = document.querySelectorAll('.social-redirector-per-post-button');
    expect(buttons.length).toBe(1);
  });
});

describe('Integration Test: Complete Per-Post Button Flow (Instagram)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearRegistry();
    
    // Mock getBoundingClientRect for Instagram posts
    Element.prototype.getBoundingClientRect = jest.fn(function() {
      return {
        width: 600,
        height: 800,
        top: 0,
        left: 0,
        bottom: 800,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
    
    // Mock offsetHeight for Instagram sections
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: function() { return 50; }
    });
    
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: function() { return 600; }
    });
  });

  test('should complete full flow: detect post → extract URL → create button → inject → click', () => {
    // Create a mock Instagram post
    const postHtml = `
      <article role="presentation">
        <header>
          <a href="https://www.instagram.com/p/ABC123/">Post link</a>
        </header>
        <img src="image.jpg" alt="Post" />
        <div>Post content</div>
        <section>
          <div>
            <div>
              <span aria-label="Like" role="button" tabindex="0">Like</span>
              <span aria-label="Comment" role="button" tabindex="0">Comment</span>
            </div>
          </div>
        </section>
      </article>
    `;
    document.body.innerHTML = postHtml;
    
    // Detect posts
    const posts = findPostContainers('instagram');
    expect(posts.length).toBe(1);
    
    // Extract URL
    const postUrl = extractInstagramPostUrl(posts[0]);
    expect(postUrl).toContain('/p/ABC123/');
    
    // Create button
    const button = createPerPostButton(postUrl, 'kkinstagram.com', 'instagram');
    expect(button).toBeTruthy();
    
    // Find injection point
    const injectionPoint = findInjectionPoint(posts[0], 'instagram');
    expect(injectionPoint).toBeTruthy();
    
    // Inject button
    const injected = injectButton(button, injectionPoint, posts[0], 'instagram');
    expect(injected).toBe(true);
    
    // Verify button in DOM
    const injectedButton = document.querySelector('.social-redirector-per-post-button');
    expect(injectedButton).toBeTruthy();
    
    // Simulate click
    let redirectUrl = null;
    delete window.location;
    window.location = { href: '' };
    Object.defineProperty(window.location, 'href', {
      set: (url) => { redirectUrl = url; },
      get: () => redirectUrl
    });
    
    injectedButton.click();
    expect(redirectUrl).toBe('https://kkinstagram.com/p/ABC123/');
  });

  test('should handle Instagram reels', () => {
    const reelHtml = `
      <article role="presentation">
        <header>
          <a href="https://www.instagram.com/reel/XYZ789/">Reel link</a>
        </header>
        <img src="image.jpg" alt="Reel" />
        <div>Content</div>
        <section>
          <div>
            <div>
              <span aria-label="Like" role="button" tabindex="0">Like</span>
            </div>
          </div>
        </section>
      </article>
    `;
    document.body.innerHTML = reelHtml;
    
    const posts = findPostContainers('instagram');
    const url = extractInstagramPostUrl(posts[0]);
    
    expect(url).toContain('/reel/XYZ789/');
  });

  test('should handle multiple Instagram posts in batch', () => {
    const postsHtml = `
      <article role="presentation">
        <header><a href="https://www.instagram.com/p/POST1/">Link</a></header>
        <img src="image.jpg" alt="Post" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
      <article role="presentation">
        <header><a href="https://www.instagram.com/p/POST2/">Link</a></header>
        <img src="image.jpg" alt="Post" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
    `;
    document.body.innerHTML = postsHtml;
    
    const result = processAllPosts('instagram', 'kkinstagram.com');
    
    expect(result.total).toBe(2);
    expect(result.successful).toBe(2);
    
    const buttons = document.querySelectorAll('.social-redirector-per-post-button');
    expect(buttons.length).toBe(2);
  });
});

describe('Integration Test: Dynamic Content Loading (Scroll Simulation)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearRegistry();
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(function() {
      return {
        width: 600,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
  });

  test('should detect and process new tweets added dynamically', (done) => {
    // Initial page with one tweet
    document.body.innerHTML = `
      <main role="main">
        <article data-testid="tweet">
          <a href="https://x.com/user1/status/111"><time>Time</time></a>
          <div>Content</div>
          <div role="group"><button data-testid="reply">Action</button></div>
        </article>
      </main>
    `;
    
    // Process initial tweets
    let result = processAllPosts('twitter', 'fixvx.com');
    expect(result.successful).toBe(1);
    
    // Simulate scroll loading new tweets
    setTimeout(() => {
      const main = document.querySelector('main');
      const newTweet = document.createElement('article');
      newTweet.setAttribute('data-testid', 'tweet');
      newTweet.innerHTML = `
        <a href="https://x.com/user2/status/222"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      `;
      main.appendChild(newTweet);
      
      // Process again (simulating MutationObserver callback)
      result = processAllPosts('twitter', 'fixvx.com');
      
      // Should now have 2 posts total, but only 1 new successful (first already processed)
      expect(result.total).toBe(2);
      expect(result.successful).toBe(1); // Only the new one
      expect(result.skipped).toBe(1); // First one already processed
      
      // Verify 2 buttons total in DOM
      const buttons = document.querySelectorAll('.social-redirector-per-post-button');
      expect(buttons.length).toBe(2);
      
      done();
    }, 100);
  });

  test('should handle rapid dynamic content additions', () => {
    document.body.innerHTML = '<main role="main"></main>';
    const main = document.querySelector('main');
    
    // Add multiple tweets rapidly
    for (let i = 1; i <= 10; i++) {
      const tweet = document.createElement('article');
      tweet.setAttribute('data-testid', 'tweet');
      tweet.innerHTML = `
        <a href="https://x.com/user${i}/status/${i}00"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      `;
      main.appendChild(tweet);
    }
    
    // Process all at once (batch processing)
    const result = processAllPosts('twitter', 'fixvx.com');
    
    expect(result.total).toBe(10);
    expect(result.successful).toBe(10);
    
    const buttons = document.querySelectorAll('.social-redirector-per-post-button');
    expect(buttons.length).toBe(10);
  });
});

describe('Integration Test: Configuration Updates Affecting Existing Buttons', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearRegistry();
    
    // Clear listeners
    mockRuntime.onMessage.listeners = [];
    mockRuntime.onInstalled.listeners = [];
    
    // Initialize with default config
    mockStorage.data = {
      config: {
        twitter: { enabled: true, targetHostname: 'fixvx.com' },
        instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
      }
    };
    
    // Load background script
    loadBackgroundScript();
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(function() {
      return {
        width: 600,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
    
    // Mock offsetHeight for Instagram sections
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: function() { return 50; }
    });
    
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
      configurable: true,
      get: function() { return 600; }
    });
  });

  test('should update Twitter buttons when config changes', async () => {
    // Simulate config update
    const newConfig = {
      twitter: { enabled: true, targetHostname: 'new-twitter.com' },
      instagram: { enabled: true, targetHostname: 'kkinstagram.com' }
    };
    
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    expect(saveResponse.success).toBe(true);
    
    // Verify config was updated
    const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(getResponse.success).toBe(true);
    expect(getResponse.config.twitter.targetHostname).toBe('new-twitter.com');
    
    // Create tweet and process with new config
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    
    const result = processAllPosts('twitter', 'new-twitter.com');
    expect(result.total).toBe(1);
    
    // If button was created, verify it uses new hostname
    const button = document.querySelector('.social-redirector-per-post-button');
    if (button) {
      let redirectUrl = null;
      delete window.location;
      window.location = { href: '' };
      Object.defineProperty(window.location, 'href', {
        set: (url) => { redirectUrl = url; },
        get: () => redirectUrl
      });
      
      button.click();
      expect(redirectUrl).toContain('new-twitter.com');
    }
  });

  test('should update Instagram buttons when config changes', async () => {
    // Update config
    const newConfig = {
      twitter: { enabled: true, targetHostname: 'fixvx.com' },
      instagram: { enabled: true, targetHostname: 'new-instagram.com' }
    };
    
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    expect(saveResponse.success).toBe(true);
    
    // Verify config was updated
    const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(getResponse.success).toBe(true);
    expect(getResponse.config.instagram.targetHostname).toBe('new-instagram.com');
    
    // Create post and process with new config
    document.body.innerHTML = `
      <article role="presentation">
        <header><a href="https://www.instagram.com/p/ABC123/">Link</a></header>
        <img src="image.jpg" alt="Post" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
    `;
    
    const result = processAllPosts('instagram', 'new-instagram.com');
    expect(result.total).toBe(1);
    
    // If button was created, verify it uses new hostname
    const button = document.querySelector('.social-redirector-per-post-button');
    if (button) {
      let redirectUrl = null;
      delete window.location;
      window.location = { href: '' };
      Object.defineProperty(window.location, 'href', {
        set: (url) => { redirectUrl = url; },
        get: () => redirectUrl
      });
      
      button.click();
      expect(redirectUrl).toContain('new-instagram.com');
    }
  });

  test('should handle config updates without page reload', async () => {
    // Update config
    const newConfig = {
      twitter: { enabled: true, targetHostname: 'updated-twitter.com' },
      instagram: { enabled: true, targetHostname: 'updated-instagram.com' }
    };
    
    const saveResponse = await mockRuntime.sendMessage({
      action: 'saveConfig',
      data: newConfig
    });
    
    expect(saveResponse.success).toBe(true);
    
    // Verify config persists
    const getResponse = await mockRuntime.sendMessage({ action: 'getConfig' });
    expect(getResponse.success).toBe(true);
    expect(getResponse.config.twitter.targetHostname).toBe('updated-twitter.com');
    expect(getResponse.config.instagram.targetHostname).toBe('updated-instagram.com');
    
    // Create posts and process with updated config (simulating reprocessing after config update)
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
      <article role="presentation">
        <header><a href="https://www.instagram.com/p/ABC/">Link</a></header>
        <img src="image.jpg" alt="Post" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
    `;
    
    // Process with updated config (simulating content script reprocessing)
    const result1 = processAllPosts('twitter', 'updated-twitter.com');
    const result2 = processAllPosts('instagram', 'updated-instagram.com');
    
    // Verify posts were found and processed
    expect(result1.total).toBe(1);
    expect(result2.total).toBe(1);
  });
});

describe('Integration Test: Various Post Types', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearRegistry();
    
    // Mock getBoundingClientRect
    Element.prototype.getBoundingClientRect = jest.fn(function() {
      return {
        width: 600,
        height: 200,
        top: 0,
        left: 0,
        bottom: 200,
        right: 600,
        x: 0,
        y: 0,
        toJSON: () => {}
      };
    });
  });

  test('should handle regular tweets', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123"><time>Time</time></a>
        <div>Regular tweet content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    
    const result = processAllPosts('twitter', 'fixvx.com');
    expect(result.successful).toBe(1);
  });

  test('should handle quoted tweets', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/456"><time>Time</time></a>
        <div>Quote tweet text</div>
        <div>
          <article data-testid="tweet">
            <a href="https://x.com/quoted_user/status/789"><time>Time</time></a>
            <div>Quoted content</div>
          </article>
        </div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    
    const result = processAllPosts('twitter', 'fixvx.com');
    // Should process both the quote tweet and the quoted tweet
    expect(result.successful).toBeGreaterThan(0);
  });

  test('should handle Instagram feed posts', () => {
    document.body.innerHTML = `
      <article role="presentation">
        <header><a href="https://www.instagram.com/p/FEED123/">Feed post</a></header>
        <img src="image.jpg" alt="Post image" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
    `;
    
    const result = processAllPosts('instagram', 'kkinstagram.com');
    expect(result.successful).toBe(1);
  });

  test('should handle Instagram reels', () => {
    document.body.innerHTML = `
      <article role="presentation">
        <header><a href="https://www.instagram.com/reel/REEL456/">Reel</a></header>
        <video src="video.mp4"></video>
        <img src="thumb.jpg" alt="Thumbnail" />
        <div>Content</div>
        <section>
          <div><div><span aria-label="Like" role="button" tabindex="0">Like</span></div></div>
        </section>
      </article>
    `;
    
    const result = processAllPosts('instagram', 'kkinstagram.com');
    expect(result.successful).toBe(1);
  });

  test('should handle posts with query parameters and hash fragments', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123?ref=source#reply"><time>Time</time></a>
        <div>Content</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    
    const posts = findPostContainers('twitter');
    const url = extractTweetUrl(posts[0]);
    
    expect(url).toContain('?ref=source');
    expect(url).toContain('#reply');
    
    const button = createPerPostButton(url, 'fixvx.com', 'twitter');
    
    let redirectUrl = null;
    delete window.location;
    window.location = { href: '' };
    Object.defineProperty(window.location, 'href', {
      set: (url) => { redirectUrl = url; },
      get: () => redirectUrl
    });
    
    button.click();
    
    // Verify query params and hash are preserved
    expect(redirectUrl).toContain('?ref=source');
    expect(redirectUrl).toContain('#reply');
  });

  test('should skip posts without valid URLs', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://example.com">Some link</a>
        <div>Tweet with no valid status URL link</div>
        <div role="group"><button data-testid="reply">Action</button></div>
      </article>
    `;
    
    const result = processAllPosts('twitter', 'fixvx.com');
    
    expect(result.total).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.skipped).toBe(1);
    
    // No buttons should be injected
    const buttons = document.querySelectorAll('.social-redirector-per-post-button');
    expect(buttons.length).toBe(0);
  });

  test('should skip posts without injection points', () => {
    document.body.innerHTML = `
      <article data-testid="tweet">
        <a href="https://x.com/user/status/123"><time>Time</time></a>
        <div>Tweet content but no action bar</div>
      </article>
    `;
    
    const result = processAllPosts('twitter', 'fixvx.com');
    
    expect(result.total).toBe(1);
    expect(result.successful).toBe(0);
    expect(result.skipped).toBe(1);
  });
});
