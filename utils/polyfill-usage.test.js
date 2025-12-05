/**
 * Polyfill Usage Tests
 * Property-based tests to verify consistent browser API usage across all modules
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

describe('Polyfill Usage Consistency', () => {
  
  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
    /**
     * Feature: code-refactoring, Property 4: Polyfill usage consistency
     * Validates: Requirements 2.1, 2.2, 2.3, 2.4
     * 
     * For any browser API call across all modules, the extension should use the browser 
     * namespace provided by the official polyfill (lib/browser-polyfill.js) and not 
     * reference the redundant utils/browser-polyfill.js
     */
    test('Property 4: Polyfill usage consistency', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'config/config.js',
            'background/background.js',
            'content/twitter-share-menu.js',
            'content/instagram-share-menu.js',
            'utils/share-menu-integration.js',
            'popup/popup.js'
          ),
          async (modulePath) => {
            // Read the module file
            const fullPath = path.join(__dirname, '..', modulePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Verify: Should NOT import/require utils/browser-polyfill.js
            const hasUtilsPolyfillImport = 
              content.includes('require(\'./browser-polyfill')  ||
              content.includes('require("./browser-polyfill')   ||
              content.includes('require(\'../utils/browser-polyfill') ||
              content.includes('require("../utils/browser-polyfill') ||
              content.includes('import') && content.includes('utils/browser-polyfill') ||
              content.includes('from') && content.includes('utils/browser-polyfill');
            
            expect(hasUtilsPolyfillImport).toBe(false);
            
            // Verify: Should use 'browser' namespace (not 'chrome' directly for storage/runtime)
            // We check that if browser APIs are used, they use the 'browser' namespace
            const hasBrowserStorageUsage = content.includes('browser.storage');
            const hasBrowserRuntimeUsage = content.includes('browser.runtime');
            const hasBrowserTabsUsage = content.includes('browser.tabs');
            
            const hasChromeStorageUsage = content.includes('chrome.storage');
            const hasChromeRuntimeUsage = content.includes('chrome.runtime');
            const hasChromeTabsUsage = content.includes('chrome.tabs');
            
            // If the module uses browser APIs, it should use 'browser' namespace
            // (The polyfill provides this namespace consistently)
            if (hasBrowserStorageUsage || hasBrowserRuntimeUsage || hasBrowserTabsUsage) {
              // Good - using browser namespace
              expect(true).toBe(true);
            }
            
            // Should NOT use chrome namespace directly for these APIs
            // (unless it's in a comment or conditional check)
            if (hasChromeStorageUsage || hasChromeRuntimeUsage || hasChromeTabsUsage) {
              // Check if it's only in comments or conditional checks
              const lines = content.split('\n');
              const chromeUsageLines = lines.filter(line => 
                (line.includes('chrome.storage') || 
                 line.includes('chrome.runtime') || 
                 line.includes('chrome.tabs')) &&
                !line.trim().startsWith('//') &&
                !line.trim().startsWith('*') &&
                !line.includes('typeof chrome')
              );
              
              // Should not have direct chrome API usage outside of checks
              expect(chromeUsageLines.length).toBe(0);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 5: No references to utils/browser-polyfill.js', async () => {
      /**
       * For any JavaScript file in the codebase, there should be no references
       * to the redundant utils/browser-polyfill.js file
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'config/config.js',
            'background/background.js',
            'content/twitter-share-menu.js',
            'content/instagram-share-menu.js',
            'utils/share-menu-integration.js',
            'utils/clipboard-manager.js',
            'utils/logger.js',
            'utils/post-detector.js',
            'utils/post-url-extractor.js',
            'utils/url-transformer.js',
            'utils/share-menu-detector.js',
            'utils/share-menu-injector.js',
            'utils/feedback-manager.js',
            'popup/popup.js'
          ),
          async (modulePath) => {
            // Read the module file
            const fullPath = path.join(__dirname, '..', modulePath);
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Should NOT reference utils/browser-polyfill.js
            const hasReference = 
              content.includes('utils/browser-polyfill') ||
              content.includes('./browser-polyfill') ||
              content.includes('../utils/browser-polyfill');
            
            expect(hasReference).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 6: Manifest files load lib/browser-polyfill.js', async () => {
      /**
       * For any manifest file, if it loads a polyfill, it should load
       * lib/browser-polyfill.js (not utils/browser-polyfill.js)
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'manifest.json',
            'manifest-firefox.json'
          ),
          async (manifestPath) => {
            // Read the manifest file
            const fullPath = path.join(__dirname, '..', manifestPath);
            
            // Skip if file doesn't exist (e.g., in dist directories)
            if (!fs.existsSync(fullPath)) {
              return true;
            }
            
            const content = fs.readFileSync(fullPath, 'utf-8');
            const manifest = JSON.parse(content);
            
            // Check background scripts
            if (manifest.background && manifest.background.scripts) {
              const scripts = manifest.background.scripts;
              const hasLibPolyfill = scripts.some(script => script.includes('lib/browser-polyfill.js'));
              const hasUtilsPolyfill = scripts.some(script => script.includes('utils/browser-polyfill.js'));
              
              if (hasLibPolyfill || hasUtilsPolyfill) {
                // Should use lib/browser-polyfill.js, not utils/browser-polyfill.js
                expect(hasLibPolyfill).toBe(true);
                expect(hasUtilsPolyfill).toBe(false);
              }
            }
            
            // Check content scripts
            if (manifest.content_scripts) {
              for (const contentScript of manifest.content_scripts) {
                const scripts = contentScript.js || [];
                const hasLibPolyfill = scripts.some(script => script.includes('lib/browser-polyfill.js'));
                const hasUtilsPolyfill = scripts.some(script => script.includes('utils/browser-polyfill.js'));
                
                if (hasLibPolyfill || hasUtilsPolyfill) {
                  // Should use lib/browser-polyfill.js, not utils/browser-polyfill.js
                  expect(hasLibPolyfill).toBe(true);
                  expect(hasUtilsPolyfill).toBe(false);
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 7: utils/browser-polyfill.js should not exist', () => {
      /**
       * The redundant utils/browser-polyfill.js file should not exist in the codebase
       */
      const utilsPolyfillPath = path.join(__dirname, 'browser-polyfill.js');
      const exists = fs.existsSync(utilsPolyfillPath);
      
      // After refactoring, this file should be deleted
      // This test will fail initially and pass after the file is deleted
      expect(exists).toBe(false);
    });
  });
});
