/**
 * Clipboard Manager Tests
 * Unit tests and property-based tests for clipboard operations
 */

const fc = require('fast-check');
const { copyToClipboard } = require('./clipboard-manager');

describe('Clipboard Manager', () => {
  
  // ============================================================================
  // UNIT TESTS
  // ============================================================================
  
  describe('Unit Tests', () => {
    
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

    describe('copyToClipboard', () => {
      test('returns false for non-string input', async () => {
        const result = await copyToClipboard(123);
        expect(result).toBe(false);
        expect(window.Logger.error).toHaveBeenCalledWith(
          '[clipboard-manager] Invalid input: text must be a string'
        );
      });

      test('returns false for null input', async () => {
        const result = await copyToClipboard(null);
        expect(result).toBe(false);
      });

      test('returns false for undefined input', async () => {
        const result = await copyToClipboard(undefined);
        expect(result).toBe(false);
      });

      test('successfully copies text when API is available', async () => {
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

        const result = await copyToClipboard('test text');
        
        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith('test text');
        expect(window.Logger.log).toHaveBeenCalledWith(
          '[clipboard-manager] Text copied successfully'
        );
      });

      test('returns false when clipboard API is not available', async () => {
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

      test('returns false when clipboard API fails', async () => {
        const mockWriteText = jest.fn().mockRejectedValue(new Error('Permission denied'));
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
        expect(mockWriteText).toHaveBeenCalledWith('test text');
        expect(window.Logger.error).toHaveBeenCalledWith(
          '[clipboard-manager] Clipboard copy failed:',
          expect.any(Error)
        );
      });
    });
  });

  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
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

    /**
     * Feature: code-refactoring, Property 1: Clipboard operations consistency
     * Validates: Requirements 3.2, 3.3
     * 
     * For any text string, calling the clipboard manager should use the modern clipboard API
     * and return consistent success/failure results
     */
    test('Property 1: Clipboard operations consistency', async () => {
      await fc.assert(
        fc.asyncProperty(fc.string(), async (text) => {
          // Test scenario 1: Clipboard API succeeds
          const mockWriteTextSuccess = jest.fn().mockResolvedValue(undefined);
          Object.defineProperty(global, 'navigator', {
            value: {
              clipboard: {
                writeText: mockWriteTextSuccess
              }
            },
            writable: true,
            configurable: true
          });

          const result1 = await copyToClipboard(text);
          
          // Should succeed
          expect(result1).toBe(true);
          expect(mockWriteTextSuccess).toHaveBeenCalledWith(text);

          // Reset mocks
          jest.clearAllMocks();

          // Test scenario 2: Clipboard API fails
          const mockWriteTextFail = jest.fn().mockRejectedValue(new Error('Permission denied'));
          Object.defineProperty(global, 'navigator', {
            value: {
              clipboard: {
                writeText: mockWriteTextFail
              }
            },
            writable: true,
            configurable: true
          });

          const result2 = await copyToClipboard(text);
          
          // Should fail
          expect(result2).toBe(false);
          expect(mockWriteTextFail).toHaveBeenCalledWith(text);

          // Reset mocks
          jest.clearAllMocks();

          // Test scenario 3: Clipboard API not available
          Object.defineProperty(global, 'navigator', {
            value: {},
            writable: true,
            configurable: true
          });

          const result3 = await copyToClipboard(text);
          
          // Should fail
          expect(result3).toBe(false);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    test('Property 2: Invalid input handling', async () => {
      /**
       * For any non-string input, the clipboard manager should return false
       * without attempting any clipboard operations
       */
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer(),
            fc.float(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object(),
            fc.array(fc.string())
          ),
          async (invalidInput) => {
            const mockWriteText = jest.fn();
            Object.defineProperty(global, 'navigator', {
              value: {
                clipboard: {
                  writeText: mockWriteText
                }
              },
              writable: true,
              configurable: true
            });

            const result = await copyToClipboard(invalidInput);
            
            // Should return false
            expect(result).toBe(false);
            
            // Should not attempt any clipboard operations
            expect(mockWriteText).not.toHaveBeenCalled();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 3: Consistent return type', async () => {
      /**
       * For any input, the clipboard manager should always return a boolean
       */
      await fc.assert(
        fc.asyncProperty(fc.anything(), async (input) => {
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

          const result = await copyToClipboard(input);
          
          // Should always return a boolean
          expect(typeof result).toBe('boolean');

          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
