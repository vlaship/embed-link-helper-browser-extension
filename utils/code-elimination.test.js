/**
 * Code Elimination Safety Tests
 * Property-based tests to verify that removed code has no remaining references
 */

const fc = require('fast-check');
const fs = require('fs');
const path = require('path');

describe('Code Elimination Safety', () => {
  
  // ============================================================================
  // PROPERTY-BASED TESTS
  // ============================================================================
  
  describe('Property-Based Tests', () => {
    
    /**
     * Feature: code-refactoring, Property 5: Code elimination safety
     * Validates: Requirements 5.1, 5.2, 5.3, 5.4
     * 
     * For any removed function or module, no remaining code should reference 
     * or depend on the removed code
     */
    test('Property 5: Code elimination safety - no references to removed functions', async () => {
      // List of functions that should be removed from dom-utils.js
      const removedFunctions = [
        'elementExists',
        'removeElement',
        'createRedirectButton',
        'injectButton',
        'observeUrlChanges',
        'onDomReady'
      ];
      
      // List of files to check for references (excluding test files and node_modules)
      const filesToCheck = [
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
      ];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...filesToCheck),
          fc.constantFrom(...removedFunctions),
          async (filePath, functionName) => {
            // Read the file
            const fullPath = path.join(__dirname, '..', filePath);
            
            // Skip if file doesn't exist
            if (!fs.existsSync(fullPath)) {
              return true;
            }
            
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Check for references to the removed function
            // We need to be careful to avoid false positives from comments
            const lines = content.split('\n');
            const codeLines = lines.filter(line => {
              const trimmed = line.trim();
              // Skip comment lines
              if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
                return false;
              }
              return true;
            });
            
            const codeContent = codeLines.join('\n');
            
            // Check if the function is referenced
            // Look for function calls: functionName(
            const hasFunctionCall = codeContent.includes(`${functionName}(`);
            
            // Look for property access: .functionName or window.functionName
            const hasPropertyAccess = 
              codeContent.includes(`.${functionName}`) ||
              codeContent.includes(`window.${functionName}`);
            
            // Should not have any references to removed functions
            expect(hasFunctionCall).toBe(false);
            expect(hasPropertyAccess).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 5: Code elimination safety - dom-utils.js should be minimal or removed', () => {
      /**
       * After cleanup, dom-utils.js should either:
       * 1. Not exist (if all functions are removed), OR
       * 2. Only contain functions that are actively used
       */
      const domUtilsPath = path.join(__dirname, 'dom-utils.js');
      
      if (fs.existsSync(domUtilsPath)) {
        const content = fs.readFileSync(domUtilsPath, 'utf-8');
        
        // List of legacy functions that should NOT be in the file
        const legacyFunctions = [
          'createRedirectButton',
          'injectButton',
          'elementExists',
          'removeElement',
          'observeUrlChanges',
          'onDomReady'
        ];
        
        // Check that none of the legacy functions are defined
        for (const funcName of legacyFunctions) {
          const hasFunctionDefinition = 
            content.includes(`function ${funcName}(`) ||
            content.includes(`const ${funcName} =`) ||
            content.includes(`let ${funcName} =`) ||
            content.includes(`var ${funcName} =`);
          
          expect(hasFunctionDefinition).toBe(false);
        }
      }
      
      // If the file doesn't exist, that's also acceptable (all functions removed)
      expect(true).toBe(true);
    });

    test('Property 5: Code elimination safety - no imports of removed functions', async () => {
      /**
       * For any file that previously imported functions from dom-utils.js,
       * it should not import the removed functions
       */
      const filesToCheck = [
        'content/twitter-share-menu.js',
        'content/instagram-share-menu.js',
        'utils/share-menu-integration.js',
        'background/background.js',
        'popup/popup.js'
      ];
      
      const removedFunctions = [
        'elementExists',
        'removeElement',
        'createRedirectButton',
        'injectButton',
        'observeUrlChanges',
        'onDomReady'
      ];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...filesToCheck),
          async (filePath) => {
            const fullPath = path.join(__dirname, '..', filePath);
            
            // Skip if file doesn't exist
            if (!fs.existsSync(fullPath)) {
              return true;
            }
            
            const content = fs.readFileSync(fullPath, 'utf-8');
            
            // Check for require/import statements that include removed functions
            for (const funcName of removedFunctions) {
              // Check for destructured imports: { functionName }
              const hasDestructuredImport = 
                content.includes(`{ ${funcName}`) ||
                content.includes(`{${funcName}`) ||
                content.includes(`${funcName} }`);
              
              // If there's a destructured import, it should be from a different module
              if (hasDestructuredImport) {
                // Make sure it's not from dom-utils
                const importRegex = new RegExp(`{[^}]*${funcName}[^}]*}[^;]*['"].*dom-utils`, 'g');
                const hasImportFromDomUtils = importRegex.test(content);
                
                expect(hasImportFromDomUtils).toBe(false);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    test('Property 5: Code elimination safety - manifest does not load dom-utils.js', async () => {
      /**
       * After cleanup, if dom-utils.js has no used functions, it should not be
       * loaded in the manifest files
       */
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'manifest.json',
            'manifest-firefox.json',
            'manifest-chrome.json'
          ),
          async (manifestPath) => {
            const fullPath = path.join(__dirname, '..', manifestPath);
            
            // Skip if manifest doesn't exist
            if (!fs.existsSync(fullPath)) {
              return true;
            }
            
            const content = fs.readFileSync(fullPath, 'utf-8');
            const manifest = JSON.parse(content);
            
            // Check if dom-utils.js is loaded anywhere
            let loadsDomUtils = false;
            
            // Check background scripts
            if (manifest.background && manifest.background.scripts) {
              loadsDomUtils = manifest.background.scripts.some(script => 
                script.includes('dom-utils.js')
              );
            }
            
            // Check content scripts
            if (manifest.content_scripts) {
              for (const contentScript of manifest.content_scripts) {
                const scripts = contentScript.js || [];
                if (scripts.some(script => script.includes('dom-utils.js'))) {
                  loadsDomUtils = true;
                  break;
                }
              }
            }
            
            // After cleanup, dom-utils.js should not be loaded
            // (since all its functions are unused)
            expect(loadsDomUtils).toBe(false);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
