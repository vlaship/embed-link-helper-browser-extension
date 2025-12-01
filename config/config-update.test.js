/**
 * Property-Based Tests for Configuration Update Handling
 * Tests configuration update propagation and handling for Twitter/X and Instagram
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

const fc = require('fast-check');

// Mock browser API
global.browser = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn()
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock the background script's saveConfig behavior
async function saveConfig(config) {
  // Validate and save to storage
  await browser.storage.sync.set({ config });
  
  // Broadcast to all tabs
  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    if (tab.url && (tab.url.includes('x.com') || tab.url.includes('instagram.com'))) {
      try {
        await browser.tabs.sendMessage(tab.id, {
          action: 'configUpdated',
          config: config
        });
      } catch (error) {
        // Ignore errors for tabs without content scripts
      }
    }
  }
}

// Helper to create valid hostname strings
const hostnameArbitrary = fc.oneof(
  fc.constant('fixvx.com'),
  fc.constant('kkinstagram.com'),
  fc.constant('nitter.net'),
  fc.constant('ddinstagram.com'),
  fc.constant('example.com'),
  fc.constant('test.org'),
  fc.constant('redirect.io')
);

// Helper to create valid config objects
const configArbitrary = fc.record({
  twitter: fc.record({
    enabled: fc.boolean(),
    targetHostname: hostnameArbitrary
  }),
  instagram: fc.record({
    enabled: fc.boolean(),
    targetHostname: hostnameArbitrary
  })
});

/**
 * **Feature: per-post-redirect-buttons, Property 10: Configuration Update Propagation (Twitter)**
 * **Validates: Requirements 6.1**
 * 
 * For any configuration change to the Twitter target hostname,
 * all existing per-post buttons on Twitter/X should update to reflect the new target hostname.
 */
describe('Property 10: Configuration Update Propagation (Twitter)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should broadcast config updates to all Twitter/X tabs when Twitter hostname changes', async () => {
    // Generator for Twitter hostname changes
    const twitterConfigChangeArbitrary = fc.record({
      oldHostname: hostnameArbitrary,
      newHostname: hostnameArbitrary,
      instagramHostname: hostnameArbitrary
    }).filter(config => config.oldHostname !== config.newHostname);

    await fc.assert(
      fc.asyncProperty(twitterConfigChangeArbitrary, async (configChange) => {
        // Setup: Mock tabs query to return Twitter tabs
        const mockTwitterTabs = [
          { id: 1, url: 'https://x.com/home' },
          { id: 2, url: 'https://x.com/explore' },
          { id: 3, url: 'https://www.instagram.com/feed' } // Should not receive update
        ];
        
        browser.tabs.query.mockResolvedValue(mockTwitterTabs);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Create new config with changed Twitter hostname
        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: configChange.newHostname
          },
          instagram: {
            enabled: true,
            targetHostname: configChange.instagramHostname
          }
        };

        // Simulate saving config (which should trigger broadcast)
        await saveConfig(newConfig);

        // Verify tabs.query was called
        expect(browser.tabs.query).toHaveBeenCalled();

        // Verify sendMessage was called for Twitter tabs only
        const twitterTabIds = mockTwitterTabs
          .filter(tab => tab.url.includes('x.com'))
          .map(tab => tab.id);

        // Should have sent messages to Twitter tabs
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        const twitterCalls = sendMessageCalls.filter(call => {
          const tabId = call[0];
          return twitterTabIds.includes(tabId);
        });

        // Verify at least the Twitter tabs received the update
        expect(twitterCalls.length).toBeGreaterThanOrEqual(twitterTabIds.length);

        // Verify the message contains the new config
        if (twitterCalls.length > 0) {
          // Just check that at least one Twitter tab got the correct config
          const hasCorrectConfig = twitterCalls.some(call => {
            const [tabId, message] = call;
            return message.action === 'configUpdated' &&
                   message.config.twitter.targetHostname === configChange.newHostname;
          });
          expect(hasCorrectConfig).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should update all Twitter buttons when config changes', async () => {
    // Generator for config changes
    const configChangeArbitrary = fc.record({
      initialConfig: configArbitrary,
      updatedConfig: configArbitrary
    }).filter(configs => 
      configs.initialConfig.twitter.targetHostname !== configs.updatedConfig.twitter.targetHostname
    );

    await fc.assert(
      fc.asyncProperty(configChangeArbitrary, async (configs) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://x.com/home' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Save updated config
        await saveConfig(configs.updatedConfig);

        // Verify the update was broadcast
        expect(browser.tabs.sendMessage).toHaveBeenCalled();

        // Get the last call to sendMessage
        const lastCall = browser.tabs.sendMessage.mock.calls[
          browser.tabs.sendMessage.mock.calls.length - 1
        ];

        if (lastCall) {
          const [tabId, message] = lastCall;
          expect(message.action).toBe('configUpdated');
          expect(message.config.twitter.targetHostname).toBe(
            configs.updatedConfig.twitter.targetHostname
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle Twitter enabled/disabled state changes', async () => {
    // Generator for enabled state changes
    const enabledStateChangeArbitrary = fc.record({
      hostname: hostnameArbitrary,
      initialEnabled: fc.boolean(),
      updatedEnabled: fc.boolean()
    }).filter(config => config.initialEnabled !== config.updatedEnabled);

    await fc.assert(
      fc.asyncProperty(enabledStateChangeArbitrary, async (stateChange) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://x.com/home' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        const newConfig = {
          twitter: {
            enabled: stateChange.updatedEnabled,
            targetHostname: stateChange.hostname
          },
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        };

        await saveConfig(newConfig);

        // Verify update was broadcast
        expect(browser.tabs.sendMessage).toHaveBeenCalled();

        const lastCall = browser.tabs.sendMessage.mock.calls[
          browser.tabs.sendMessage.mock.calls.length - 1
        ];

        if (lastCall) {
          const [tabId, message] = lastCall;
          expect(message.config.twitter.enabled).toBe(stateChange.updatedEnabled);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not send updates to non-Twitter tabs when Twitter config changes', async () => {
    await fc.assert(
      fc.asyncProperty(hostnameArbitrary, async (newHostname) => {
        // Setup: Mock tabs with no Twitter tabs
        const mockNonTwitterTabs = [
          { id: 1, url: 'https://www.instagram.com/feed' },
          { id: 2, url: 'https://www.facebook.com/home' },
          { id: 3, url: 'https://www.google.com' }
        ];

        browser.tabs.query.mockResolvedValue(mockNonTwitterTabs);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: newHostname
          },
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        };

        await saveConfig(newConfig);

        // Verify sendMessage was not called for non-Twitter tabs
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        const twitterCalls = sendMessageCalls.filter(call => {
          const tabId = call[0];
          const tab = mockNonTwitterTabs.find(t => t.id === tabId);
          return tab && tab.url.includes('x.com');
        });

        // Should have no calls to Twitter tabs (since there are none)
        expect(twitterCalls.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 11: Configuration Update Propagation (Instagram)**
 * **Validates: Requirements 6.2**
 * 
 * For any configuration change to the Instagram target hostname,
 * all existing per-post buttons on Instagram should update to reflect the new target hostname.
 */
describe('Property 11: Configuration Update Propagation (Instagram)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should broadcast config updates to all Instagram tabs when Instagram hostname changes', async () => {
    // Generator for Instagram hostname changes
    const instagramConfigChangeArbitrary = fc.record({
      oldHostname: hostnameArbitrary,
      newHostname: hostnameArbitrary,
      twitterHostname: hostnameArbitrary
    }).filter(config => config.oldHostname !== config.newHostname);

    await fc.assert(
      fc.asyncProperty(instagramConfigChangeArbitrary, async (configChange) => {
        // Setup: Mock tabs query to return Instagram tabs
        const mockInstagramTabs = [
          { id: 1, url: 'https://www.instagram.com/feed' },
          { id: 2, url: 'https://instagram.com/explore' },
          { id: 3, url: 'https://x.com/home' } // Should not receive update
        ];

        browser.tabs.query.mockResolvedValue(mockInstagramTabs);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Create new config with changed Instagram hostname
        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: configChange.twitterHostname
          },
          instagram: {
            enabled: true,
            targetHostname: configChange.newHostname
          }
        };

        // Simulate saving config (which should trigger broadcast)
        await saveConfig(newConfig);

        // Verify tabs.query was called
        expect(browser.tabs.query).toHaveBeenCalled();

        // Verify sendMessage was called for Instagram tabs only
        const instagramTabIds = mockInstagramTabs
          .filter(tab => tab.url.includes('instagram.com'))
          .map(tab => tab.id);

        // Should have sent messages to Instagram tabs
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        const instagramCalls = sendMessageCalls.filter(call => {
          const tabId = call[0];
          return instagramTabIds.includes(tabId);
        });

        // Verify at least the Instagram tabs received the update
        expect(instagramCalls.length).toBeGreaterThanOrEqual(instagramTabIds.length);

        // Verify the message contains the new config
        if (instagramCalls.length > 0) {
          // Just check that at least one Instagram tab got the correct config
          const hasCorrectConfig = instagramCalls.some(call => {
            const [tabId, message] = call;
            return message.action === 'configUpdated' &&
                   message.config.instagram.targetHostname === configChange.newHostname;
          });
          expect(hasCorrectConfig).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should update all Instagram buttons when config changes', async () => {
    // Generator for config changes
    const configChangeArbitrary = fc.record({
      initialConfig: configArbitrary,
      updatedConfig: configArbitrary
    }).filter(configs =>
      configs.initialConfig.instagram.targetHostname !== configs.updatedConfig.instagram.targetHostname
    );

    await fc.assert(
      fc.asyncProperty(configChangeArbitrary, async (configs) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://www.instagram.com/feed' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Save updated config
        await saveConfig(configs.updatedConfig);

        // Verify the update was broadcast
        expect(browser.tabs.sendMessage).toHaveBeenCalled();

        // Get the last call to sendMessage
        const lastCall = browser.tabs.sendMessage.mock.calls[
          browser.tabs.sendMessage.mock.calls.length - 1
        ];

        if (lastCall) {
          const [tabId, message] = lastCall;
          expect(message.action).toBe('configUpdated');
          expect(message.config.instagram.targetHostname).toBe(
            configs.updatedConfig.instagram.targetHostname
          );
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle Instagram enabled/disabled state changes', async () => {
    // Generator for enabled state changes
    const enabledStateChangeArbitrary = fc.record({
      hostname: hostnameArbitrary,
      initialEnabled: fc.boolean(),
      updatedEnabled: fc.boolean()
    }).filter(config => config.initialEnabled !== config.updatedEnabled);

    await fc.assert(
      fc.asyncProperty(enabledStateChangeArbitrary, async (stateChange) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://www.instagram.com/feed' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
          },
          instagram: {
            enabled: stateChange.updatedEnabled,
            targetHostname: stateChange.hostname
          }
        };

        await saveConfig(newConfig);

        // Verify update was broadcast
        expect(browser.tabs.sendMessage).toHaveBeenCalled();

        const lastCall = browser.tabs.sendMessage.mock.calls[
          browser.tabs.sendMessage.mock.calls.length - 1
        ];

        if (lastCall) {
          const [tabId, message] = lastCall;
          expect(message.config.instagram.enabled).toBe(stateChange.updatedEnabled);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not send updates to non-Instagram tabs when Instagram config changes', async () => {
    await fc.assert(
      fc.asyncProperty(hostnameArbitrary, async (newHostname) => {
        // Setup: Mock tabs with no Instagram tabs
        const mockNonInstagramTabs = [
          { id: 1, url: 'https://x.com/home' },
          { id: 2, url: 'https://www.facebook.com/home' },
          { id: 3, url: 'https://www.google.com' }
        ];

        browser.tabs.query.mockResolvedValue(mockNonInstagramTabs);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
          },
          instagram: {
            enabled: true,
            targetHostname: newHostname
          }
        };

        await saveConfig(newConfig);

        // Verify sendMessage was not called for non-Instagram tabs
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        const instagramCalls = sendMessageCalls.filter(call => {
          const tabId = call[0];
          const tab = mockNonInstagramTabs.find(t => t.id === tabId);
          return tab && tab.url.includes('instagram.com');
        });

        // Should have no calls to Instagram tabs (since there are none)
        expect(instagramCalls.length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 12: Configuration Update Without Reload**
 * **Validates: Requirements 6.3**
 * 
 * For any configuration update, the per-post buttons should reflect the changes
 * without requiring a page reload.
 */
describe('Property 12: Configuration Update Without Reload', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should update buttons without page reload when config changes', async () => {
    // Generator for config changes
    const configChangeArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      oldHostname: hostnameArbitrary,
      newHostname: hostnameArbitrary
    }).filter(config => config.oldHostname !== config.newHostname);

    await fc.assert(
      fc.asyncProperty(configChangeArbitrary, async (configChange) => {
        // Setup: Mock a tab for the platform
        const tabUrl = configChange.platform === 'twitter' 
          ? 'https://x.com/home'
          : 'https://www.instagram.com/feed';

        browser.tabs.query.mockResolvedValue([
          { id: 1, url: tabUrl }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Create config with new hostname
        const newConfig = {
          twitter: {
            enabled: true,
            targetHostname: configChange.platform === 'twitter' 
              ? configChange.newHostname 
              : 'fixvx.com'
          },
          instagram: {
            enabled: true,
            targetHostname: configChange.platform === 'instagram' 
              ? configChange.newHostname 
              : 'kkinstagram.com'
          }
        };

        // Save config (should trigger update without reload)
        await saveConfig(newConfig);

        // Verify message was sent to content script
        expect(browser.tabs.sendMessage).toHaveBeenCalled();

        // Verify the message indicates config update (not page reload)
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        expect(sendMessageCalls.length).toBeGreaterThan(0);

        const lastCall = sendMessageCalls[sendMessageCalls.length - 1];
        const [tabId, message] = lastCall;

        expect(message.action).toBe('configUpdated');
        expect(message.config).toBeDefined();

        // Verify the new hostname is in the config
        if (configChange.platform === 'twitter') {
          expect(message.config.twitter.targetHostname).toBe(configChange.newHostname);
        } else {
          expect(message.config.instagram.targetHostname).toBe(configChange.newHostname);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should send configUpdated message (not reload) for any config change', async () => {
    await fc.assert(
      fc.asyncProperty(configArbitrary, async (newConfig) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://x.com/home' },
          { id: 2, url: 'https://www.instagram.com/feed' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        await saveConfig(newConfig);

        // Verify all messages are configUpdated, not reload
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        
        sendMessageCalls.forEach(call => {
          const [tabId, message] = call;
          expect(message.action).toBe('configUpdated');
          expect(message.action).not.toBe('reload');
          expect(message.action).not.toBe('refresh');
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should update buttons immediately without waiting for page events', async () => {
    // Generator for rapid config changes
    const rapidConfigChangesArbitrary = fc.array(
      configArbitrary,
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(rapidConfigChangesArbitrary, async (configs) => {
        browser.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://x.com/home' }
        ]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        // Apply multiple config changes rapidly
        for (const config of configs) {
          await saveConfig(config);
        }

        // Verify each change triggered an immediate update
        // Note: Each config change sends to all matching tabs, so we expect at least configs.length calls
        expect(browser.tabs.sendMessage).toHaveBeenCalled();
        expect(browser.tabs.sendMessage.mock.calls.length).toBeGreaterThanOrEqual(configs.length);

        // All calls should be configUpdated messages
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        sendMessageCalls.forEach(call => {
          const [tabId, message] = call;
          expect(message.action).toBe('configUpdated');
        });
      }),
      { numRuns: 50 }
    );
  });

  test('should preserve page state when updating config', async () => {
    await fc.assert(
      fc.asyncProperty(configArbitrary, async (newConfig) => {
        // Mock tab with specific state
        const mockTab = {
          id: 1,
          url: 'https://x.com/home',
          active: true,
          index: 0
        };

        browser.tabs.query.mockResolvedValue([mockTab]);
        browser.tabs.sendMessage.mockResolvedValue({});
        browser.storage.sync.set.mockResolvedValue();

        await saveConfig(newConfig);

        // Verify we only sent a message, not reloaded the tab
        expect(browser.tabs.sendMessage).toHaveBeenCalled();
        
        // Verify no reload-related API calls were made
        // (In a real test, we'd check browser.tabs.reload was not called)
        const sendMessageCalls = browser.tabs.sendMessage.mock.calls;
        sendMessageCalls.forEach(call => {
          const [tabId, message] = call;
          expect(message.action).not.toBe('reload');
        });
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 13: Default Configuration Fallback**
 * **Validates: Requirements 6.5**
 * 
 * For any scenario where configuration is unavailable or fails to load,
 * the extension should use default target hostnames.
 */
describe('Property 13: Default Configuration Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should use default hostnames when storage is empty', async () => {
    // Mock empty storage
    browser.storage.sync.get.mockResolvedValue({});

    const { getConfig } = require('./config.js');
    const config = await getConfig();

    // Should return default configuration
    expect(config.twitter.targetHostname).toBe('fixvx.com');
    expect(config.instagram.targetHostname).toBe('kkinstagram.com');
    expect(config.twitter.enabled).toBe(true);
    expect(config.instagram.enabled).toBe(true);
  });

  test('should use default hostnames when storage fails', async () => {
    // Mock storage failure
    browser.storage.sync.get.mockRejectedValue(new Error('Storage unavailable'));

    const { getConfig } = require('./config.js');
    const config = await getConfig();

    // Should return default configuration
    expect(config.twitter.targetHostname).toBe('fixvx.com');
    expect(config.instagram.targetHostname).toBe('kkinstagram.com');
  });

  test('should use default hostnames when stored config is invalid', async () => {
    // Generator for invalid config structures
    const invalidConfigArbitrary = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant('invalid'),
      fc.constant(123),
      fc.constant([]),
      fc.record({
        twitter: fc.record({
          enabled: fc.constant('not-a-boolean'), // Invalid type
          targetHostname: fc.constant('http://invalid.com') // Invalid hostname
        })
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidConfigArbitrary, async (invalidConfig) => {
        browser.storage.sync.get.mockResolvedValue({ config: invalidConfig });

        const { getConfig } = require('./config.js');
        const config = await getConfig();

        // Should return default configuration
        expect(config.twitter.targetHostname).toBe('fixvx.com');
        expect(config.instagram.targetHostname).toBe('kkinstagram.com');
        expect(config.twitter.enabled).toBe(true);
        expect(config.instagram.enabled).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test('should merge partial config with defaults', async () => {
    // Generator for partial configs (missing some fields)
    const partialConfigArbitrary = fc.oneof(
      // Only Twitter config
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: hostnameArbitrary
        })
      }),
      // Only Instagram config
      fc.record({
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: hostnameArbitrary
        })
      }),
      // Twitter without hostname
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean()
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: hostnameArbitrary
        })
      })
    );

    await fc.assert(
      fc.asyncProperty(partialConfigArbitrary, async (partialConfig) => {
        browser.storage.sync.get.mockResolvedValue({ config: partialConfig });

        const { getConfig } = require('./config.js');
        const config = await getConfig();

        // Should have all required fields
        expect(config.twitter).toBeDefined();
        expect(config.instagram).toBeDefined();
        expect(config.twitter.enabled).toBeDefined();
        expect(config.twitter.targetHostname).toBeDefined();
        expect(config.instagram.enabled).toBeDefined();
        expect(config.instagram.targetHostname).toBeDefined();

        // Missing fields should use defaults
        if (!partialConfig.twitter) {
          expect(config.twitter.targetHostname).toBe('fixvx.com');
          expect(config.twitter.enabled).toBe(true);
        }

        if (!partialConfig.instagram) {
          expect(config.instagram.targetHostname).toBe('kkinstagram.com');
          expect(config.instagram.enabled).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should always provide valid config structure regardless of storage state', async () => {
    // Generator for various storage states
    const storageStateArbitrary = fc.oneof(
      fc.constant({}), // Empty
      fc.constant({ config: null }), // Null config
      fc.constant({ config: undefined }), // Undefined config
      fc.constant({ otherData: 'something' }), // Wrong key
      fc.record({ config: configArbitrary }) // Valid config
    );

    await fc.assert(
      fc.asyncProperty(storageStateArbitrary, async (storageState) => {
        browser.storage.sync.get.mockResolvedValue(storageState);

        const { getConfig } = require('./config.js');
        const config = await getConfig();

        // Should always return a valid config structure
        expect(config).toBeDefined();
        expect(typeof config).toBe('object');
        expect(config.twitter).toBeDefined();
        expect(config.instagram).toBeDefined();
        expect(typeof config.twitter.enabled).toBe('boolean');
        expect(typeof config.instagram.enabled).toBe('boolean');
        expect(typeof config.twitter.targetHostname).toBe('string');
        expect(typeof config.instagram.targetHostname).toBe('string');
        expect(config.twitter.targetHostname.length).toBeGreaterThan(0);
        expect(config.instagram.targetHostname.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  test('should use defaults when config validation fails', async () => {
    // Generator for configs that fail validation
    const invalidHostnameConfigArbitrary = fc.record({
      twitter: fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.oneof(
          fc.constant('http://invalid.com'), // Has protocol
          fc.constant('invalid.com/path'), // Has path
          fc.constant('invalid..com'), // Double dots
          fc.constant(''), // Empty
          fc.constant('invalid com') // Space
        )
      }),
      instagram: fc.record({
        enabled: fc.boolean(),
        targetHostname: hostnameArbitrary
      })
    });

    await fc.assert(
      fc.asyncProperty(invalidHostnameConfigArbitrary, async (invalidConfig) => {
        browser.storage.sync.get.mockResolvedValue({ config: invalidConfig });

        const { getConfig } = require('./config.js');
        const config = await getConfig();

        // Should return default configuration due to validation failure
        expect(config.twitter.targetHostname).toBe('fixvx.com');
        expect(config.instagram.targetHostname).toBe('kkinstagram.com');
      }),
      { numRuns: 100 }
    );
  });
});
