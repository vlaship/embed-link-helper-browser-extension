/**
 * Property-Based Tests for Share Menu Injector Module
 * Tests menu item creation, injection, and URL transformation
 */

const fc = require('fast-check');
const {
  createEmbedLinkMenuItem,
  injectMenuItem,
  findMenuInjectionPoint,
  applyPlatformStyling
} = require('./share-menu-injector.js');

// Import URL transformer for testing
const { transformUrl } = require('./url-transformer.js');

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}, textContent = '') {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: textContent,
    attributes: attributes,
    children: [],
    parentElement: null,
    style: {},
    className: '',
    type: attributes.type || '',
    firstChild: null,
    matches: function(selector) {
      if (selector.includes('[role=')) {
        const roleMatch = selector.match(/\[role="([^"]+)"\]/);
        if (roleMatch && this.attributes.role === roleMatch[1]) {
          return true;
        }
      }
      if (selector.includes('.embed-link-menu-item')) {
        return this.className.includes('embed-link-menu-item');
      }
      return false;
    },
    querySelectorAll: function(selector) {
      if (selector === '.embed-link-menu-item') {
        return this.children.filter(child => child.className && child.className.includes('embed-link-menu-item'));
      }
      if (selector === 'div') {
        return this.children.filter(child => child.tagName === 'DIV');
      }
      if (selector === 'button') {
        return this.children.filter(child => child.tagName === 'BUTTON');
      }
      if (selector === '[role="menuitem"]') {
        return this.children.filter(child => child.attributes.role === 'menuitem');
      }
      if (selector === '[role="menu"]') {
        return this.children.filter(child => child.attributes.role === 'menu');
      }
      return [];
    },
    querySelector: function(selector) {
      const results = this.querySelectorAll(selector);
      return results.length > 0 ? results[0] : null;
    },
    setAttribute: function(name, value) {
      this.attributes[name] = value;
    },
    getAttribute: function(name) {
      return this.attributes[name] || null;
    },
    appendChild: function(child) {
      this.children.push(child);
      child.parentElement = this;
      if (!this.firstChild) {
        this.firstChild = child;
      }
    },
    insertBefore: function(newChild, referenceChild) {
      if (!referenceChild) {
        this.appendChild(newChild);
        return;
      }
      const index = this.children.indexOf(referenceChild);
      if (index >= 0) {
        this.children.splice(index, 0, newChild);
        newChild.parentElement = this;
        if (index === 0) {
          this.firstChild = newChild;
        }
      }
    },
    addEventListener: function(event, handler) {
      // Mock implementation - store handlers if needed
      if (!this._eventHandlers) {
        this._eventHandlers = {};
      }
      if (!this._eventHandlers[event]) {
        this._eventHandlers[event] = [];
      }
      this._eventHandlers[event].push(handler);
    },
    getBoundingClientRect: function() {
      return { width: 200, height: 300, top: 100, left: 100, bottom: 400, right: 300 };
    }
  };
  
  // Add instanceof check
  Object.setPrototypeOf(element, HTMLElement.prototype);
  
  return element;
}

// Mock document.createElement and document.createElementNS
global.document = {
  createElement: function(tagName) {
    return createMockElement(tagName);
  },
  createElementNS: function(namespace, tagName) {
    const element = createMockElement(tagName);
    element.namespace = namespace;
    element.setAttributeNS = function(ns, name, value) {
      this.setAttribute(name, value);
    };
    return element;
  }
};

/**
 * **Feature: share-menu-integration, Property 2: URL transformation on click**
 * **Validates: Requirements 1.3, 2.3**
 * 
 * For any post URL and configured target hostname, when the "Copy embed link" menu item
 * is clicked, the extension should transform the URL to use the target hostname while
 * preserving the path, query parameters, and hash.
 */
describe('Property 2: URL transformation on click', () => {
  test('should create menu items with correct URL transformation data', async () => {
    // Generator for Twitter URLs
    const twitterUrlArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString()),
      queryParams: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      hash: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
    }).map(({ username, statusId, queryParams, hash }) => {
      let url = `https://x.com/${username}/status/${statusId}`;
      if (queryParams) {
        url += `?${queryParams}`;
      }
      if (hash) {
        url += `#${hash}`;
      }
      return url;
    });

    // Generator for target hostnames
    const hostnameArbitrary = fc.oneof(
      fc.constant('fixvx.com'),
      fc.constant('fxtwitter.com'),
      fc.constant('vxtwitter.com')
    );

    await fc.assert(
      fc.asyncProperty(
        twitterUrlArbitrary,
        hostnameArbitrary,
        async (postUrl, targetHostname) => {
          const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, 'twitter');
          
          // Menu item should be created
          expect(menuItem).not.toBeNull();
          
          // Should store the post URL
          expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
          
          // Should store the target hostname
          expect(menuItem.getAttribute('data-target-hostname')).toBe(targetHostname);
          
          // Verify URL transformation would work correctly
          const transformedUrl = transformUrl(postUrl, targetHostname);
          expect(transformedUrl).not.toBeNull();
          
          // Transformed URL should use target hostname
          const transformedUrlObj = new URL(transformedUrl);
          expect(transformedUrlObj.hostname).toBe(targetHostname);
          
          // Transformed URL should preserve path
          const originalUrlObj = new URL(postUrl);
          expect(transformedUrlObj.pathname).toBe(originalUrlObj.pathname);
          
          // Transformed URL should preserve query parameters
          expect(transformedUrlObj.search).toBe(originalUrlObj.search);
          
          // Transformed URL should preserve hash
          expect(transformedUrlObj.hash).toBe(originalUrlObj.hash);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should create menu items for Instagram URLs with correct transformation data', async () => {
    // Generator for Instagram URLs
    const instagramUrlArbitrary = fc.record({
      type: fc.constantFrom('p', 'reel', 'tv'),
      postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), { minLength: 8, maxLength: 12 }),
      queryParams: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
      hash: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
    }).map(({ type, postId, queryParams, hash }) => {
      let url = `https://www.instagram.com/${type}/${postId}/`;
      if (queryParams) {
        url += `?${queryParams}`;
      }
      if (hash) {
        url += `#${hash}`;
      }
      return url;
    });

    // Generator for target hostnames
    const hostnameArbitrary = fc.oneof(
      fc.constant('ddinstagram.com'),
      fc.constant('kkinstagram.com')
    );

    await fc.assert(
      fc.asyncProperty(
        instagramUrlArbitrary,
        hostnameArbitrary,
        async (postUrl, targetHostname) => {
          const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, 'instagram');
          
          // Menu item should be created
          expect(menuItem).not.toBeNull();
          
          // Should store the post URL
          expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
          
          // Should store the target hostname
          expect(menuItem.getAttribute('data-target-hostname')).toBe(targetHostname);
          
          // Verify URL transformation would work correctly
          const transformedUrl = transformUrl(postUrl, targetHostname);
          expect(transformedUrl).not.toBeNull();
          
          // Transformed URL should use target hostname
          const transformedUrlObj = new URL(transformedUrl);
          expect(transformedUrlObj.hostname).toBe(targetHostname);
          
          // Transformed URL should preserve path
          const originalUrlObj = new URL(postUrl);
          expect(transformedUrlObj.pathname).toBe(originalUrlObj.pathname);
          
          // Transformed URL should preserve query parameters
          expect(transformedUrlObj.search).toBe(originalUrlObj.search);
          
          // Transformed URL should preserve hash
          expect(transformedUrlObj.hash).toBe(originalUrlObj.hash);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('should preserve all URL components during transformation', async () => {
    // Generator for complete URLs with all components
    const completeUrlArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      path: fc.string({ minLength: 10, maxLength: 50 }),
      query: fc.dictionary(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        { minKeys: 0, maxKeys: 3 }
      ),
      hash: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null })
    }).chain(({ platform, path, query, hash }) => {
      // Create valid URLs for each platform
      if (platform === 'twitter') {
        return fc.record({
          username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { minLength: 1, maxLength: 15 }),
          statusId: fc.bigUintN(64).map(n => n.toString())
        }).map(({ username, statusId }) => {
          let url = `https://x.com/${username}/status/${statusId}`;
          const queryString = Object.entries(query).map(([k, v]) => `${k}=${v}`).join('&');
          if (queryString) {
            url += `?${queryString}`;
          }
          if (hash) {
            url += `#${hash}`;
          }
          return { url, platform, targetHostname: 'fixvx.com' };
        });
      } else {
        return fc.record({
          type: fc.constantFrom('p', 'reel'),
          postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), { minLength: 8, maxLength: 12 })
        }).map(({ type, postId }) => {
          let url = `https://www.instagram.com/${type}/${postId}/`;
          const queryString = Object.entries(query).map(([k, v]) => `${k}=${v}`).join('&');
          if (queryString) {
            url += `?${queryString}`;
          }
          if (hash) {
            url += `#${hash}`;
          }
          return { url, platform, targetHostname: 'ddinstagram.com' };
        });
      }
    });

    await fc.assert(
      fc.asyncProperty(completeUrlArbitrary, async ({ url, platform, targetHostname }) => {
        const menuItem = createEmbedLinkMenuItem(url, targetHostname, platform);
        
        expect(menuItem).not.toBeNull();
        
        // Get stored data
        const storedUrl = menuItem.getAttribute('data-post-url');
        const storedHostname = menuItem.getAttribute('data-target-hostname');
        
        // Transform the URL
        const transformedUrl = transformUrl(storedUrl, storedHostname);
        expect(transformedUrl).not.toBeNull();
        
        // Parse both URLs
        const original = new URL(url);
        const transformed = new URL(transformedUrl);
        
        // Verify hostname changed
        expect(transformed.hostname).toBe(targetHostname);
        expect(transformed.hostname).not.toBe(original.hostname);
        
        // Verify all other components preserved
        expect(transformed.pathname).toBe(original.pathname);
        expect(transformed.search).toBe(original.search);
        expect(transformed.hash).toBe(original.hash);
        expect(transformed.protocol).toBe(original.protocol);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle URLs with special characters in query parameters', async () => {
    // Generator for URLs with special characters
    const urlWithSpecialCharsArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString()),
      specialQuery: fc.oneof(
        fc.constant('ref_src=twsrc%5Etfw'),
        fc.constant('s=20&t=abc123'),
        fc.constant('utm_source=test&utm_medium=social')
      )
    }).map(({ username, statusId, specialQuery }) => {
      return `https://x.com/${username}/status/${statusId}?${specialQuery}`;
    });

    await fc.assert(
      fc.asyncProperty(
        urlWithSpecialCharsArbitrary,
        fc.constant('fixvx.com'),
        async (postUrl, targetHostname) => {
          const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, 'twitter');
          
          expect(menuItem).not.toBeNull();
          
          const transformedUrl = transformUrl(postUrl, targetHostname);
          expect(transformedUrl).not.toBeNull();
          
          // Parse URLs
          const original = new URL(postUrl);
          const transformed = new URL(transformedUrl);
          
          // Verify query parameters are preserved exactly
          expect(transformed.search).toBe(original.search);
          
          // Verify hostname changed
          expect(transformed.hostname).toBe(targetHostname);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 3: Clipboard copy on click**
 * **Validates: Requirements 1.4, 2.4**
 * 
 * For any post, when the "Copy embed link" menu item is clicked,
 * the transformed URL should be copied to the clipboard.
 * 
 * Note: This test verifies that the menu item stores the correct data
 * that would be used for clipboard operations. Actual clipboard API testing
 * requires browser environment and user interaction.
 */
describe('Property 3: Clipboard copy on click', () => {
  test('should store correct transformed URL data for clipboard operations', async () => {
    // Generator for Twitter URLs and hostnames
    const twitterConfigArbitrary = fc.record({
      username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { minLength: 1, maxLength: 15 }),
      statusId: fc.bigUintN(64).map(n => n.toString()),
      targetHostname: fc.constantFrom('fixvx.com', 'fxtwitter.com', 'vxtwitter.com')
    }).map(({ username, statusId, targetHostname }) => ({
      postUrl: `https://x.com/${username}/status/${statusId}`,
      targetHostname,
      platform: 'twitter'
    }));

    await fc.assert(
      fc.asyncProperty(twitterConfigArbitrary, async ({ postUrl, targetHostname, platform }) => {
        const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, platform);
        
        expect(menuItem).not.toBeNull();
        
        // Verify the menu item stores the data needed for clipboard copy
        const storedUrl = menuItem.getAttribute('data-post-url');
        const storedHostname = menuItem.getAttribute('data-target-hostname');
        
        expect(storedUrl).toBe(postUrl);
        expect(storedHostname).toBe(targetHostname);
        
        // Verify that transforming the stored data produces a valid URL
        const transformedUrl = transformUrl(storedUrl, storedHostname);
        expect(transformedUrl).not.toBeNull();
        expect(typeof transformedUrl).toBe('string');
        expect(transformedUrl.length).toBeGreaterThan(0);
        
        // Verify the transformed URL is a valid URL
        expect(() => new URL(transformedUrl)).not.toThrow();
        
        // Verify the transformed URL uses the target hostname
        const urlObj = new URL(transformedUrl);
        expect(urlObj.hostname).toBe(targetHostname);
      }),
      { numRuns: 100 }
    );
  });

  test('should store correct transformed URL data for Instagram posts', async () => {
    // Generator for Instagram URLs and hostnames
    const instagramConfigArbitrary = fc.record({
      type: fc.constantFrom('p', 'reel', 'tv'),
      postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), { minLength: 8, maxLength: 12 }),
      targetHostname: fc.constantFrom('ddinstagram.com', 'kkinstagram.com')
    }).map(({ type, postId, targetHostname }) => ({
      postUrl: `https://www.instagram.com/${type}/${postId}/`,
      targetHostname,
      platform: 'instagram'
    }));

    await fc.assert(
      fc.asyncProperty(instagramConfigArbitrary, async ({ postUrl, targetHostname, platform }) => {
        const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, platform);
        
        expect(menuItem).not.toBeNull();
        
        // Verify the menu item stores the data needed for clipboard copy
        const storedUrl = menuItem.getAttribute('data-post-url');
        const storedHostname = menuItem.getAttribute('data-target-hostname');
        
        expect(storedUrl).toBe(postUrl);
        expect(storedHostname).toBe(targetHostname);
        
        // Verify that transforming the stored data produces a valid URL
        const transformedUrl = transformUrl(storedUrl, storedHostname);
        expect(transformedUrl).not.toBeNull();
        expect(typeof transformedUrl).toBe('string');
        expect(transformedUrl.length).toBeGreaterThan(0);
        
        // Verify the transformed URL is a valid URL
        expect(() => new URL(transformedUrl)).not.toThrow();
        
        // Verify the transformed URL uses the target hostname
        const urlObj = new URL(transformedUrl);
        expect(urlObj.hostname).toBe(targetHostname);
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain data integrity across different URL formats', async () => {
    // Generator for various URL formats
    const urlFormatArbitrary = fc.oneof(
      // Twitter URLs with various formats
      fc.record({
        username: fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789_'.split('')), { minLength: 1, maxLength: 15 }),
        statusId: fc.bigUintN(64).map(n => n.toString()),
        hasQuery: fc.boolean(),
        hasHash: fc.boolean()
      }).map(({ username, statusId, hasQuery, hasHash }) => {
        let url = `https://x.com/${username}/status/${statusId}`;
        if (hasQuery) url += '?s=20';
        if (hasHash) url += '#reply';
        return { url, platform: 'twitter', hostname: 'fixvx.com' };
      }),
      // Instagram URLs with various formats
      fc.record({
        type: fc.constantFrom('p', 'reel'),
        postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), { minLength: 8, maxLength: 12 }),
        hasQuery: fc.boolean(),
        hasHash: fc.boolean()
      }).map(({ type, postId, hasQuery, hasHash }) => {
        let url = `https://www.instagram.com/${type}/${postId}/`;
        if (hasQuery) url += '?utm_source=ig_web';
        if (hasHash) url += '#comments';
        return { url, platform: 'instagram', hostname: 'ddinstagram.com' };
      })
    );

    await fc.assert(
      fc.asyncProperty(urlFormatArbitrary, async ({ url, platform, hostname }) => {
        const menuItem = createEmbedLinkMenuItem(url, hostname, platform);
        
        expect(menuItem).not.toBeNull();
        
        // Get the data that would be used for clipboard copy
        const storedUrl = menuItem.getAttribute('data-post-url');
        const storedHostname = menuItem.getAttribute('data-target-hostname');
        const storedPlatform = menuItem.getAttribute('data-platform');
        
        // Verify all data is stored correctly
        expect(storedUrl).toBe(url);
        expect(storedHostname).toBe(hostname);
        expect(storedPlatform).toBe(platform);
        
        // Verify transformation produces valid result
        const transformedUrl = transformUrl(storedUrl, storedHostname);
        expect(transformedUrl).not.toBeNull();
        
        // Verify the transformed URL can be parsed
        const originalUrlObj = new URL(url);
        const transformedUrlObj = new URL(transformedUrl);
        
        // Verify transformation is correct
        expect(transformedUrlObj.hostname).toBe(hostname);
        expect(transformedUrlObj.pathname).toBe(originalUrlObj.pathname);
        expect(transformedUrlObj.search).toBe(originalUrlObj.search);
        expect(transformedUrlObj.hash).toBe(originalUrlObj.hash);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle edge cases in URL transformation for clipboard', async () => {
    // Generator for edge case URLs
    const edgeCaseArbitrary = fc.oneof(
      // URLs with long status IDs
      fc.record({
        username: fc.constant('testuser'),
        statusId: fc.bigUintN(64).map(n => n.toString())
      }).map(({ username, statusId }) => ({
        url: `https://x.com/${username}/status/${statusId}`,
        platform: 'twitter',
        hostname: 'fixvx.com'
      })),
      // URLs with special characters in query
      fc.constant({
        url: 'https://x.com/user/status/123456789?ref_src=twsrc%5Etfw',
        platform: 'twitter',
        hostname: 'fixvx.com'
      }),
      // Instagram URLs with trailing slash variations
      fc.record({
        postId: fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('')), { minLength: 8, maxLength: 12 }),
        hasTrailingSlash: fc.boolean()
      }).map(({ postId, hasTrailingSlash }) => ({
        url: `https://www.instagram.com/p/${postId}${hasTrailingSlash ? '/' : ''}`,
        platform: 'instagram',
        hostname: 'ddinstagram.com'
      }))
    );

    await fc.assert(
      fc.asyncProperty(edgeCaseArbitrary, async ({ url, platform, hostname }) => {
        const menuItem = createEmbedLinkMenuItem(url, hostname, platform);
        
        expect(menuItem).not.toBeNull();
        
        // Verify data is stored
        const storedUrl = menuItem.getAttribute('data-post-url');
        const storedHostname = menuItem.getAttribute('data-target-hostname');
        
        expect(storedUrl).toBe(url);
        expect(storedHostname).toBe(hostname);
        
        // Verify transformation works for edge cases
        const transformedUrl = transformUrl(storedUrl, storedHostname);
        expect(transformedUrl).not.toBeNull();
        
        // Verify the result is a valid URL
        expect(() => new URL(transformedUrl)).not.toThrow();
        
        // Verify hostname was changed
        const transformedUrlObj = new URL(transformedUrl);
        expect(transformedUrlObj.hostname).toBe(hostname);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Unit Tests for Share Menu Injector Module
 * Tests specific examples and edge cases for menu item creation and injection
 */

describe('Unit Tests: Menu Item Creation', () => {
  describe('createEmbedLinkMenuItem', () => {
    test('should create Twitter menu item with valid parameters', () => {
      const postUrl = 'https://x.com/user/status/123456789';
      const targetHostname = 'fixvx.com';
      const platform = 'twitter';

      const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, platform);

      expect(menuItem).not.toBeNull();
      expect(menuItem.tagName).toBe('DIV');
      expect(menuItem.getAttribute('role')).toBe('menuitem');
      expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
      expect(menuItem.getAttribute('data-target-hostname')).toBe(targetHostname);
      expect(menuItem.getAttribute('data-platform')).toBe(platform);
      expect(menuItem.className).toContain('embed-link-menu-item');
    });

    test('should create Instagram menu item with valid parameters', () => {
      const postUrl = 'https://www.instagram.com/p/ABC123/';
      const targetHostname = 'ddinstagram.com';
      const platform = 'instagram';

      const menuItem = createEmbedLinkMenuItem(postUrl, targetHostname, platform);

      expect(menuItem).not.toBeNull();
      expect(menuItem.tagName).toBe('BUTTON');
      expect(menuItem.type).toBe('button');
      expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
      expect(menuItem.getAttribute('data-target-hostname')).toBe(targetHostname);
      expect(menuItem.getAttribute('data-platform')).toBe(platform);
      expect(menuItem.className).toContain('embed-link-menu-item');
    });

    test('should return null for invalid post URL', () => {
      const menuItem = createEmbedLinkMenuItem(null, 'fixvx.com', 'twitter');
      expect(menuItem).toBeNull();
    });

    test('should return null for empty post URL', () => {
      const menuItem = createEmbedLinkMenuItem('', 'fixvx.com', 'twitter');
      expect(menuItem).toBeNull();
    });

    test('should return null for invalid target hostname', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', null, 'twitter');
      expect(menuItem).toBeNull();
    });

    test('should return null for empty target hostname', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', '', 'twitter');
      expect(menuItem).toBeNull();
    });

    test('should return null for invalid platform', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'invalid');
      expect(menuItem).toBeNull();
    });

    test('should return null for null platform', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', null);
      expect(menuItem).toBeNull();
    });

    test('should create menu item with text content', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      
      expect(menuItem).not.toBeNull();
      // Check that the menu item has the expected text somewhere in its structure
      const hasText = menuItem.textContent.includes('Copy embed link') || 
                      menuItem.children.some(child => child.textContent && child.textContent.includes('Copy embed link'));
      expect(hasText).toBe(true);
    });

    test('should create menu item with icon', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      
      expect(menuItem).not.toBeNull();
      // Check that the menu item has children (icon + text structure)
      expect(menuItem.children.length).toBeGreaterThan(0);
    });

    test('should handle URLs with query parameters', () => {
      const postUrl = 'https://x.com/user/status/123?s=20&t=abc';
      const menuItem = createEmbedLinkMenuItem(postUrl, 'fixvx.com', 'twitter');
      
      expect(menuItem).not.toBeNull();
      expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
    });

    test('should handle URLs with hash fragments', () => {
      const postUrl = 'https://x.com/user/status/123#reply';
      const menuItem = createEmbedLinkMenuItem(postUrl, 'fixvx.com', 'twitter');
      
      expect(menuItem).not.toBeNull();
      expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
    });

    test('should handle Instagram reel URLs', () => {
      const postUrl = 'https://www.instagram.com/reel/ABC123/';
      const menuItem = createEmbedLinkMenuItem(postUrl, 'ddinstagram.com', 'instagram');
      
      expect(menuItem).not.toBeNull();
      expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
    });
  });

  describe('injectMenuItem', () => {
    test('should inject menu item into Twitter share menu', () => {
      const menuContainer = createMockElement('DIV', { role: 'menu' });
      const existingItem = createMockElement('DIV', { role: 'menuitem' }, 'Copy link');
      menuContainer.appendChild(existingItem);

      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      const result = injectMenuItem(menuItem, menuContainer, 'twitter');

      expect(result).toBe(true);
      expect(menuContainer.children.length).toBe(2);
      expect(menuContainer.children[0]).toBe(menuItem);
    });

    test('should inject menu item into Instagram share menu', () => {
      const menuContainer = createMockElement('DIV', { role: 'dialog' });
      const existingItem = createMockElement('BUTTON', {}, 'Share to...');
      menuContainer.appendChild(existingItem);

      const menuItem = createEmbedLinkMenuItem('https://www.instagram.com/p/ABC123/', 'ddinstagram.com', 'instagram');
      const result = injectMenuItem(menuItem, menuContainer, 'instagram');

      expect(result).toBe(true);
      expect(menuContainer.children.length).toBe(2);
      expect(menuContainer.children[0]).toBe(menuItem);
    });

    test('should not inject duplicate menu items', () => {
      const menuContainer = createMockElement('DIV', { role: 'menu' });
      const menuItem1 = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      
      const result1 = injectMenuItem(menuItem1, menuContainer, 'twitter');
      expect(result1).toBe(true);
      expect(menuContainer.children.length).toBe(1);

      const menuItem2 = createEmbedLinkMenuItem('https://x.com/user/status/456', 'fixvx.com', 'twitter');
      const result2 = injectMenuItem(menuItem2, menuContainer, 'twitter');
      
      // Should return true but not add duplicate
      expect(result2).toBe(true);
      expect(menuContainer.children.length).toBe(1);
    });

    test('should return false for null menu item', () => {
      const menuContainer = createMockElement('DIV', { role: 'menu' });
      const result = injectMenuItem(null, menuContainer, 'twitter');
      expect(result).toBe(false);
    });

    test('should return false for null menu container', () => {
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      const result = injectMenuItem(menuItem, null, 'twitter');
      expect(result).toBe(false);
    });

    test('should return false for invalid platform', () => {
      const menuContainer = createMockElement('DIV', { role: 'menu' });
      const menuItem = createEmbedLinkMenuItem('https://x.com/user/status/123', 'fixvx.com', 'twitter');
      const result = injectMenuItem(menuItem, menuContainer, 'invalid');
      expect(result).toBe(false);
    });
  });

  describe('findMenuInjectionPoint', () => {
    test('should find injection point in Twitter menu with role="menu"', () => {
      const menuContainer = createMockElement('DIV', { 'data-testid': 'Dropdown' });
      const menuItemsContainer = createMockElement('DIV', { role: 'menu' });
      menuContainer.appendChild(menuItemsContainer);

      const injectionPoint = findMenuInjectionPoint(menuContainer, 'twitter');
      expect(injectionPoint).toBe(menuItemsContainer);
    });

    test('should find injection point in Twitter menu with menuitem children', () => {
      const menuContainer = createMockElement('DIV', { 'data-testid': 'Dropdown' });
      const itemsContainer = createMockElement('DIV');
      const item1 = createMockElement('DIV', { role: 'menuitem' }, 'Copy link');
      const item2 = createMockElement('DIV', { role: 'menuitem' }, 'Bookmark');
      itemsContainer.appendChild(item1);
      itemsContainer.appendChild(item2);
      menuContainer.appendChild(itemsContainer);

      const injectionPoint = findMenuInjectionPoint(menuContainer, 'twitter');
      expect(injectionPoint).toBe(itemsContainer);
    });

    test('should fallback to menu container for Twitter', () => {
      const menuContainer = createMockElement('DIV', { 'data-testid': 'Dropdown' });
      
      const injectionPoint = findMenuInjectionPoint(menuContainer, 'twitter');
      expect(injectionPoint).toBe(menuContainer);
    });

    test('should find injection point in Instagram menu with multiple buttons', () => {
      const menuContainer = createMockElement('DIV', { role: 'dialog' });
      const buttonsContainer = createMockElement('DIV');
      buttonsContainer.appendChild(createMockElement('BUTTON', {}, 'Share'));
      buttonsContainer.appendChild(createMockElement('BUTTON', {}, 'Copy'));
      buttonsContainer.appendChild(createMockElement('BUTTON', {}, 'Embed'));
      menuContainer.appendChild(buttonsContainer);

      const injectionPoint = findMenuInjectionPoint(menuContainer, 'instagram');
      expect(injectionPoint).toBe(buttonsContainer);
    });

    test('should fallback to menu container for Instagram', () => {
      const menuContainer = createMockElement('DIV', { role: 'dialog' });
      
      const injectionPoint = findMenuInjectionPoint(menuContainer, 'instagram');
      expect(injectionPoint).toBe(menuContainer);
    });

    test('should return null for null menu container', () => {
      const injectionPoint = findMenuInjectionPoint(null, 'twitter');
      expect(injectionPoint).toBeNull();
    });

    test('should return null for invalid platform', () => {
      const menuContainer = createMockElement('DIV', { role: 'menu' });
      const injectionPoint = findMenuInjectionPoint(menuContainer, 'invalid');
      expect(injectionPoint).toBeNull();
    });
  });

  describe('applyPlatformStyling', () => {
    test('should apply Twitter styling to menu item', () => {
      const menuItem = createMockElement('DIV', { role: 'menuitem' });
      applyPlatformStyling(menuItem, 'twitter');

      // Check that cssText was set (contains cursor: pointer)
      expect(menuItem.style.cssText).toContain('cursor');
      expect(menuItem._eventHandlers).toBeDefined();
      expect(menuItem._eventHandlers.mouseenter).toBeDefined();
      expect(menuItem._eventHandlers.mouseleave).toBeDefined();
    });

    test('should apply Instagram styling to menu item', () => {
      const menuItem = createMockElement('BUTTON');
      applyPlatformStyling(menuItem, 'instagram');

      // Check that cssText was set (contains cursor: pointer)
      expect(menuItem.style.cssText).toContain('cursor');
      expect(menuItem._eventHandlers).toBeDefined();
      expect(menuItem._eventHandlers.mouseenter).toBeDefined();
      expect(menuItem._eventHandlers.mouseleave).toBeDefined();
    });

    test('should handle null menu item gracefully', () => {
      expect(() => applyPlatformStyling(null, 'twitter')).not.toThrow();
    });

    test('should handle invalid platform gracefully', () => {
      const menuItem = createMockElement('DIV');
      expect(() => applyPlatformStyling(menuItem, 'invalid')).not.toThrow();
    });

    test('should add hover effects for Twitter', () => {
      const menuItem = createMockElement('DIV', { role: 'menuitem' });
      applyPlatformStyling(menuItem, 'twitter');

      // Verify event handlers were added
      expect(menuItem._eventHandlers.mouseenter.length).toBeGreaterThan(0);
      expect(menuItem._eventHandlers.mouseleave.length).toBeGreaterThan(0);
      expect(menuItem._eventHandlers.focus.length).toBeGreaterThan(0);
      expect(menuItem._eventHandlers.blur.length).toBeGreaterThan(0);
    });

    test('should add hover effects for Instagram', () => {
      const menuItem = createMockElement('BUTTON');
      applyPlatformStyling(menuItem, 'instagram');

      // Verify event handlers were added
      expect(menuItem._eventHandlers.mouseenter.length).toBeGreaterThan(0);
      expect(menuItem._eventHandlers.mouseleave.length).toBeGreaterThan(0);
    });
  });
});
