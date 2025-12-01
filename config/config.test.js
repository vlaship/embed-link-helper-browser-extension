/**
 * Property-Based Tests for Configuration Module
 * Tests configuration round-trip consistency and storage operations
 */

const fc = require('fast-check');
const {
  getDefaultConfig,
  validateHostname,
  validateConfig,
  saveConfig,
  getConfig,
  clearConfig
} = require('./config.js');

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

// Setup browser API mock
global.chrome = {
  storage: mockStorage
};

global.browser = {
  storage: mockStorage
};

// Reset storage before each test
beforeEach(() => {
  mockStorage.data = {};
  jest.clearAllMocks();
});

/**
 * **Feature: social-media-redirector, Property 2: Configuration Round-Trip Consistency**
 * **Validates: Requirements 3.3, 3.4, 6.1, 6.2**
 * 
 * For any valid configuration object, saving it to storage and then retrieving it 
 * should return an equivalent configuration object.
 */
describe('Property 2: Configuration Round-Trip Consistency', () => {
  test('should preserve configuration through save and load cycle', async () => {
    // Generator for valid hostnames
    const hostnameArbitrary = fc.domain();

    // Generator for valid configuration objects
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

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Clear storage before each iteration
        mockStorage.data = {};
        
        // Save the configuration
        await saveConfig(config);
        
        // Retrieve the configuration
        const retrievedConfig = await getConfig();
        
        // Verify the configuration matches
        expect(retrievedConfig).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle partial configuration updates', async () => {
    // Generator for partial configs (only twitter or only instagram)
    const partialConfigArbitrary = fc.oneof(
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.record({
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      })
    );

    await fc.assert(
      fc.asyncProperty(partialConfigArbitrary, async (config) => {
        // Clear storage before each iteration
        mockStorage.data = {};
        
        // Save the configuration
        await saveConfig(config);
        
        // Retrieve the configuration
        const retrievedConfig = await getConfig();
        
        // Verify that saved fields match
        if (config.twitter) {
          expect(retrievedConfig.twitter.enabled).toBe(config.twitter.enabled);
          expect(retrievedConfig.twitter.targetHostname).toBe(config.twitter.targetHostname);
        }
        if (config.instagram) {
          expect(retrievedConfig.instagram.enabled).toBe(config.instagram.enabled);
          expect(retrievedConfig.instagram.targetHostname).toBe(config.instagram.targetHostname);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should preserve configuration with special characters in hostnames', async () => {
    // Generator for hostnames with hyphens and multiple subdomains
    const complexHostnameArbitrary = fc.stringOf(
      fc.oneof(
        fc.constantFrom('a', 'b', 'c', '1', '2', '3', '-', '.'),
      ),
      { minLength: 3, maxLength: 50 }
    ).filter(validateHostname);

    const configArbitrary = fc.record({
      twitter: fc.record({
        enabled: fc.boolean(),
        targetHostname: complexHostnameArbitrary
      }),
      instagram: fc.record({
        enabled: fc.boolean(),
        targetHostname: complexHostnameArbitrary
      })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Clear storage before each iteration
        mockStorage.data = {};
        
        // Save the configuration
        await saveConfig(config);
        
        // Retrieve the configuration
        const retrievedConfig = await getConfig();
        
        // Verify exact match
        expect(retrievedConfig).toEqual(config);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property 6: Storage Default Fallback**
 * **Validates: Requirements 6.4**
 * 
 * For any storage retrieval operation that returns null or undefined, 
 * the extension should use the default configuration values.
 */
describe('Property 6: Storage Default Fallback', () => {
  test('should return default config when storage is empty', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Clear storage to simulate empty state
        mockStorage.data = {};
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it matches default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should return default config when storage returns undefined', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Mock storage to return undefined
        mockStorage.data = { config: undefined };
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it matches default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should return default config when storage returns null', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Mock storage to return null
        mockStorage.data = { config: null };
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it matches default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should return default config when storage operation fails', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Mock storage to throw an error
        mockStorage.sync.get.mockRejectedValueOnce(new Error('Storage error'));
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it matches default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
        
        // Restore mock
        mockStorage.sync.get.mockImplementation((key) => {
          return Promise.resolve(mockStorage.data);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should return default config when storage contains invalid data', async () => {
    // Generator for invalid configuration objects
    const invalidConfigArbitrary = fc.oneof(
      fc.constant({ invalid: 'data' }),
      fc.constant({ twitter: { enabled: 'not-a-boolean' } }),
      fc.constant({ instagram: { targetHostname: 'http://invalid.com' } }),
      fc.constant({ twitter: { targetHostname: 'invalid..hostname' } }),
      fc.string(), // Random string
      fc.integer(), // Random number
      fc.array(fc.anything()) // Random array
    );

    await fc.assert(
      fc.asyncProperty(invalidConfigArbitrary, async (invalidConfig) => {
        // Set invalid config in storage
        mockStorage.data = { config: invalidConfig };
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it matches default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should merge partial config with defaults', async () => {
    // Generator for partial configs missing some fields
    const partialConfigArbitrary = fc.oneof(
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean()
          // Missing targetHostname
        })
      }),
      fc.record({
        instagram: fc.record({
          targetHostname: fc.domain()
          // Missing enabled
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
        // Missing instagram entirely
      })
    );

    await fc.assert(
      fc.asyncProperty(partialConfigArbitrary, async (partialConfig) => {
        // Set partial config in storage
        mockStorage.data = { config: partialConfig };
        
        // Get configuration
        const config = await getConfig();
        
        // Verify it has all required fields from defaults
        const defaultConfig = getDefaultConfig();
        expect(config).toHaveProperty('twitter');
        expect(config).toHaveProperty('instagram');
        expect(config.twitter).toHaveProperty('enabled');
        expect(config.twitter).toHaveProperty('targetHostname');
        expect(config.instagram).toHaveProperty('enabled');
        expect(config.instagram).toHaveProperty('targetHostname');
        
        // Verify default values are used for missing fields
        if (!partialConfig.twitter) {
          expect(config.twitter).toEqual(defaultConfig.twitter);
        }
        if (!partialConfig.instagram) {
          expect(config.instagram).toEqual(defaultConfig.instagram);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property: Configuration Validation**
 * **Validates: Requirements 6.5**
 * 
 * For any configuration data retrieved from storage, the extension should validate 
 * the data before applying it, rejecting invalid configurations and using defaults.
 */
describe('Property: Configuration Validation', () => {
  test('should reject configurations with invalid hostname formats', async () => {
    // Generator for invalid hostnames (with protocols, paths, invalid chars)
    const invalidHostnameArbitrary = fc.oneof(
      fc.constant('http://example.com'),
      fc.constant('https://example.com'),
      fc.constant('example.com/path'),
      fc.constant('example..com'),
      fc.constant(''),
      fc.constant('   '),
      fc.constant('example com'),
      fc.constant('example@com'),
      fc.constant('example#com'),
      fc.constant('example$com'),
      fc.stringOf(fc.char(), { minLength: 1, maxLength: 20 }).filter(s => !validateHostname(s) && s.trim().length > 0)
    );

    // Generator for configs with at least one invalid hostname
    const invalidConfigArbitrary = fc.oneof(
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: invalidHostnameArbitrary
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: invalidHostnameArbitrary
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: invalidHostnameArbitrary
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: invalidHostnameArbitrary
        })
      })
    ).filter(config => !validateConfig(config)); // Ensure the config is actually invalid

    await fc.assert(
      fc.asyncProperty(invalidConfigArbitrary, async (invalidConfig) => {
        // Set invalid config in storage
        mockStorage.data = { config: invalidConfig };
        
        // Get configuration - should validate and reject invalid data
        const config = await getConfig();
        
        // Verify it returns default configuration instead of invalid one
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
        
        // Verify the invalid config was not applied
        expect(config).not.toEqual(invalidConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject configurations with invalid enabled field types', async () => {
    // Generator for configs with non-boolean enabled fields
    const invalidEnabledArbitrary = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything()),
      fc.object()
    );

    const invalidConfigArbitrary = fc.oneof(
      fc.record({
        twitter: fc.record({
          enabled: invalidEnabledArbitrary,
          targetHostname: fc.domain()
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        }),
        instagram: fc.record({
          enabled: invalidEnabledArbitrary,
          targetHostname: fc.domain()
        })
      })
    );

    await fc.assert(
      fc.asyncProperty(invalidConfigArbitrary, async (invalidConfig) => {
        // Set invalid config in storage
        mockStorage.data = { config: invalidConfig };
        
        // Get configuration - should validate and reject
        const config = await getConfig();
        
        // Verify it returns default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should reject non-object configurations', async () => {
    // Generator for non-object values
    const nonObjectArbitrary = fc.oneof(
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything())
    );

    await fc.assert(
      fc.asyncProperty(nonObjectArbitrary, async (invalidConfig) => {
        // Set invalid config in storage
        mockStorage.data = { config: invalidConfig };
        
        // Get configuration - should validate and reject
        const config = await getConfig();
        
        // Verify it returns default configuration
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
      }),
      { numRuns: 100 }
    );
  });

  test('should accept valid configurations', async () => {
    // Generator for valid configurations
    const validConfigArbitrary = fc.record({
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
      fc.asyncProperty(validConfigArbitrary, async (validConfig) => {
        // Set valid config in storage
        mockStorage.data = { config: validConfig };
        
        // Get configuration - should validate and accept
        const config = await getConfig();
        
        // Verify it returns the valid configuration (not defaults)
        expect(config).toEqual(validConfig);
        
        // Verify it's not the default config (unless by chance)
        const defaultConfig = getDefaultConfig();
        const isDefault = JSON.stringify(config) === JSON.stringify(defaultConfig);
        const inputIsDefault = JSON.stringify(validConfig) === JSON.stringify(defaultConfig);
        
        // If input wasn't default, output shouldn't be default either
        if (!inputIsDefault) {
          expect(isDefault).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should validate before saving configuration', async () => {
    // Generator for invalid configurations
    const invalidConfigArbitrary = fc.oneof(
      fc.record({
        twitter: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.constant('http://invalid.com')
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.record({
        twitter: fc.record({
          enabled: fc.constant('not-boolean'),
          targetHostname: fc.domain()
        }),
        instagram: fc.record({
          enabled: fc.boolean(),
          targetHostname: fc.domain()
        })
      }),
      fc.constant(null),
      fc.constant('invalid'),
      fc.constant(123)
    );

    await fc.assert(
      fc.asyncProperty(invalidConfigArbitrary, async (invalidConfig) => {
        // Clear storage
        mockStorage.data = {};
        
        // Attempt to save invalid configuration - should throw error
        await expect(saveConfig(invalidConfig)).rejects.toThrow();
        
        // Verify nothing was saved to storage
        expect(mockStorage.data.config).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property: Storage Error Handling**
 * **Validates: Requirements 6.3**
 * 
 * For any storage operation that fails, the extension should handle errors gracefully 
 * and notify the user (by throwing an error with a descriptive message).
 */
describe('Property: Storage Error Handling', () => {
  test('should handle storage read errors gracefully and return defaults', async () => {
    // Generator for different error types
    const errorArbitrary = fc.oneof(
      fc.constant(new Error('Storage quota exceeded')),
      fc.constant(new Error('Network error')),
      fc.constant(new Error('Permission denied')),
      fc.constant(new Error('Storage unavailable')),
      fc.string().map(msg => new Error(msg))
    );

    await fc.assert(
      fc.asyncProperty(errorArbitrary, async (error) => {
        // Mock storage to throw an error on read
        mockStorage.sync.get.mockRejectedValueOnce(error);
        
        // Get configuration - should handle error gracefully
        const config = await getConfig();
        
        // Verify it returns default configuration (graceful fallback)
        const defaultConfig = getDefaultConfig();
        expect(config).toEqual(defaultConfig);
        
        // Verify the function didn't throw (error was handled)
        expect(config).toBeDefined();
        
        // Restore mock
        mockStorage.sync.get.mockImplementation((key) => {
          return Promise.resolve(mockStorage.data);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should throw descriptive error when storage write fails', async () => {
    // Generator for valid configurations
    const validConfigArbitrary = fc.record({
      twitter: fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.domain()
      }),
      instagram: fc.record({
        enabled: fc.boolean(),
        targetHostname: fc.domain()
      })
    });

    // Generator for different error types with non-empty messages
    const errorArbitrary = fc.oneof(
      fc.constant(new Error('Storage quota exceeded')),
      fc.constant(new Error('Network error')),
      fc.constant(new Error('Permission denied')),
      fc.constant(new Error('Storage unavailable'))
    );

    await fc.assert(
      fc.asyncProperty(validConfigArbitrary, errorArbitrary, async (validConfig, error) => {
        // Mock storage to throw an error on write
        mockStorage.sync.set.mockRejectedValueOnce(error);
        
        // Attempt to save configuration - should throw descriptive error
        let thrownError;
        try {
          await saveConfig(validConfig);
          // If we get here, the test should fail
          expect(true).toBe(false); // Force failure
        } catch (err) {
          thrownError = err;
        }
        
        // Verify the error message includes context
        expect(thrownError).toBeDefined();
        expect(thrownError.message).toContain('Failed to save configuration');
        expect(thrownError.message).toContain(error.message);
        
        // Restore mock
        mockStorage.sync.set.mockImplementation((obj) => {
          mockStorage.data = { ...mockStorage.data, ...obj };
          return Promise.resolve();
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should handle storage clear errors gracefully', async () => {
    // Generator for different error types with non-empty messages
    const errorArbitrary = fc.oneof(
      fc.constant(new Error('Storage quota exceeded')),
      fc.constant(new Error('Network error')),
      fc.constant(new Error('Permission denied'))
    );

    await fc.assert(
      fc.asyncProperty(errorArbitrary, async (error) => {
        // Mock storage to throw an error on remove
        mockStorage.sync.remove.mockRejectedValueOnce(error);
        
        // Attempt to clear configuration - should throw descriptive error
        let thrownError;
        try {
          await clearConfig();
          // If we get here, the test should fail
          expect(true).toBe(false); // Force failure
        } catch (err) {
          thrownError = err;
        }
        
        // Verify the error message includes context
        expect(thrownError).toBeDefined();
        expect(thrownError.message).toContain('Failed to clear configuration');
        expect(thrownError.message).toContain(error.message);
        
        // Restore mock
        mockStorage.sync.remove.mockImplementation((key) => {
          delete mockStorage.data[key];
          return Promise.resolve();
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should not corrupt storage when write fails', async () => {
    // Generator for valid configurations
    const validConfigArbitrary = fc.record({
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
      fc.asyncProperty(validConfigArbitrary, validConfigArbitrary, async (initialConfig, newConfig) => {
        // Save initial configuration
        mockStorage.data = {};
        await saveConfig(initialConfig);
        
        // Verify initial config was saved
        const savedInitial = await getConfig();
        expect(savedInitial).toEqual(initialConfig);
        
        // Mock storage to fail on next write
        mockStorage.sync.set.mockRejectedValueOnce(new Error('Storage error'));
        
        // Attempt to save new configuration - should fail
        await expect(saveConfig(newConfig)).rejects.toThrow();
        
        // Verify original configuration is still intact (not corrupted)
        const configAfterFailure = await getConfig();
        expect(configAfterFailure).toEqual(initialConfig);
        
        // Restore mock
        mockStorage.sync.set.mockImplementation((obj) => {
          mockStorage.data = { ...mockStorage.data, ...obj };
          return Promise.resolve();
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should handle multiple consecutive storage errors', async () => {
    // Generator for error sequences
    const errorSequenceArbitrary = fc.array(
      fc.oneof(
        fc.constant(new Error('Storage quota exceeded')),
        fc.constant(new Error('Network error')),
        fc.constant(new Error('Permission denied'))
      ),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(errorSequenceArbitrary, async (errors) => {
        // Mock storage to fail multiple times
        for (const error of errors) {
          mockStorage.sync.get.mockRejectedValueOnce(error);
        }
        
        // Each call should handle error gracefully and return defaults
        for (let i = 0; i < errors.length; i++) {
          const config = await getConfig();
          const defaultConfig = getDefaultConfig();
          expect(config).toEqual(defaultConfig);
        }
        
        // Restore mock
        mockStorage.sync.get.mockImplementation((key) => {
          return Promise.resolve(mockStorage.data);
        });
      }),
      { numRuns: 100 }
    );
  });

  test('should recover from storage errors when storage becomes available', async () => {
    // Generator for valid configurations
    const validConfigArbitrary = fc.record({
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
      fc.asyncProperty(validConfigArbitrary, async (validConfig) => {
        // Clear storage
        mockStorage.data = {};
        
        // Mock storage to fail once
        mockStorage.sync.set.mockRejectedValueOnce(new Error('Temporary storage error'));
        
        // First attempt should fail
        await expect(saveConfig(validConfig)).rejects.toThrow();
        
        // Restore mock (storage becomes available)
        mockStorage.sync.set.mockImplementation((obj) => {
          mockStorage.data = { ...mockStorage.data, ...obj };
          return Promise.resolve();
        });
        
        // Second attempt should succeed
        await expect(saveConfig(validConfig)).resolves.not.toThrow();
        
        // Verify configuration was saved correctly
        const savedConfig = await getConfig();
        expect(savedConfig).toEqual(validConfig);
      }),
      { numRuns: 100 }
    );
  });
});
