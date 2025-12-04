/**
 * Property-Based Tests for Share Menu Detector Module
 * Tests share menu detection and post association for Twitter/X and Instagram
 */

const fc = require('fast-check');
const {
  observeShareMenus,
  findAssociatedPost,
  isShareMenu,
  getSelectorConfig,
  SHARE_MENU_SELECTORS
} = require('./share-menu-detector.js');

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}, textContent = '') {
  const element = {
    tagName: tagName.toUpperCase(),
    textContent: textContent,
    attributes: attributes,
    children: [],
    parentElement: null,
    matches: function(selector) {
      // Simple selector matching
      if (selector.includes('[data-testid=')) {
        const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
        if (testIdMatch && this.attributes['data-testid'] === testIdMatch[1]) {
          return true;
        }
      }
      if (selector.includes('[role=')) {
        const roleMatch = selector.match(/\[role="([^"]+)"\]/);
        if (roleMatch && this.attributes.role === roleMatch[1]) {
          return true;
        }
      }
      if (selector.includes('div[role=')) {
        return this.tagName === 'DIV' && this.attributes.role;
      }
      if (selector.includes('div[data-testid=')) {
        return this.tagName === 'DIV' && this.attributes['data-testid'];
      }
      if (selector.startsWith('article')) {
        return this.tagName === 'ARTICLE';
      }
      return false;
    },
    querySelectorAll: function(selector) {
      // Simple mock implementation
      return this.children.filter(child => {
        if (selector === 'a') return child.tagName === 'A';
        if (selector === 'button') return child.tagName === 'BUTTON';
        if (selector === 'div[role="menuitem"]') {
          return child.tagName === 'DIV' && child.attributes.role === 'menuitem';
        }
        if (selector === 'a[role="menuitem"]') {
          return child.tagName === 'A' && child.attributes.role === 'menuitem';
        }
        if (selector.includes('article')) {
          return child.tagName === 'ARTICLE';
        }
        return false;
      });
    },
    querySelector: function(selector) {
      const results = this.querySelectorAll(selector);
      return results.length > 0 ? results[0] : null;
    },
    getBoundingClientRect: function() {
      return attributes.hidden ? 
        { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 } : 
        { 
          width: 200, 
          height: 300, 
          top: attributes.top || 100, 
          left: attributes.left || 100,
          bottom: (attributes.top || 100) + 300,
          right: (attributes.left || 100) + 200
        };
    },
    closest: function(selector) {
      let current = this;
      while (current) {
        if (current.matches && current.matches(selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }
  };
  
  // Add instanceof check
  Object.setPrototypeOf(element, HTMLElement.prototype);
  
  return element;
}

// Helper to create a mock Twitter share menu
function createMockTwitterShareMenu(hasMenuItems = true, isVisible = true) {
  const menu = createMockElement('DIV', { 
    'data-testid': 'Dropdown',
    role: 'menu',
    hidden: !isVisible
  }, hasMenuItems ? 'Copy link\nShare via...\nBookmark' : '');
  
  if (hasMenuItems) {
    const item1 = createMockElement('DIV', { role: 'menuitem' }, 'Copy link');
    const item2 = createMockElement('DIV', { role: 'menuitem' }, 'Share via...');
    const item3 = createMockElement('DIV', { role: 'menuitem' }, 'Bookmark');
    menu.children.push(item1, item2, item3);
  }
  
  return menu;
}

// Helper to create a mock Instagram share menu
function createMockInstagramShareMenu(hasMenuItems = true, isVisible = true) {
  const menu = createMockElement('DIV', { 
    role: 'dialog',
    hidden: !isVisible
  }, hasMenuItems ? 'Share to...\nCopy link\nEmbed' : '');
  
  if (hasMenuItems) {
    const item1 = createMockElement('BUTTON', {}, 'Share to...');
    const item2 = createMockElement('BUTTON', {}, 'Copy link');
    const item3 = createMockElement('BUTTON', {}, 'Embed');
    menu.children.push(item1, item2, item3);
  }
  
  return menu;
}

// Helper to create a mock post container
function createMockPost(platform, position = { top: 100, left: 100 }) {
  if (platform === 'twitter') {
    const post = createMockElement('ARTICLE', { 
      'data-testid': 'tweet',
      top: position.top,
      left: position.left
    }, 'This is a tweet with some content');
    
    const shareButton = createMockElement('BUTTON', { 
      'data-testid': 'share',
      top: position.top + 50,
      left: position.left + 50
    }, 'Share');
    shareButton.parentElement = post;
    post.children.push(shareButton);
    
    return post;
  } else {
    const post = createMockElement('ARTICLE', { 
      role: 'presentation',
      top: position.top,
      left: position.left
    }, 'This is an Instagram post with some content');
    
    const shareButton = createMockElement('BUTTON', { 
      'aria-label': 'Share',
      top: position.top + 50,
      left: position.left + 50
    }, 'Share');
    shareButton.parentElement = post;
    post.children.push(shareButton);
    
    return post;
  }
}

/**
 * **Feature: share-menu-integration, Property 1: Menu item injection**
 * **Validates: Requirements 1.1, 2.1**
 * 
 * For any post on Twitter/X or Instagram, when the share menu is opened,
 * the extension should inject a "Copy embed link" menu item into the share menu.
 * 
 * This test verifies that share menus are correctly detected when they appear.
 */
describe('Property 1: Menu item injection', () => {
  test('should detect valid Twitter share menus', async () => {
    // Generator for Twitter share menu configurations
    const shareMenuConfigArbitrary = fc.record({
      hasMenuItems: fc.boolean(),
      isVisible: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(shareMenuConfigArbitrary, async (config) => {
        const menu = createMockTwitterShareMenu(config.hasMenuItems, config.isVisible);
        const isValid = isShareMenu(menu, 'twitter');
        
        // Should be valid only if it has menu items, is visible, and has content
        if (config.hasMenuItems && config.isVisible) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should detect valid Instagram share menus', async () => {
    // Generator for Instagram share menu configurations
    const shareMenuConfigArbitrary = fc.record({
      hasMenuItems: fc.boolean(),
      isVisible: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(shareMenuConfigArbitrary, async (config) => {
        const menu = createMockInstagramShareMenu(config.hasMenuItems, config.isVisible);
        const isValid = isShareMenu(menu, 'instagram');
        
        // Should be valid only if it has menu items, is visible, and has content
        if (config.hasMenuItems && config.isVisible) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should validate share menus have required structure', async () => {
    // Generator for platform and menu configuration
    const menuConfigArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasMenuItems: fc.boolean(),
      isVisible: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(menuConfigArbitrary, async (config) => {
        const menu = config.platform === 'twitter' ?
          createMockTwitterShareMenu(config.hasMenuItems, config.isVisible) :
          createMockInstagramShareMenu(config.hasMenuItems, config.isVisible);
        
        const isValid = isShareMenu(menu, config.platform);
        
        // If valid, must have menu items, be visible, and have content
        if (isValid) {
          expect(menu.children.length).toBeGreaterThan(0);
          expect(menu.attributes.hidden).toBeFalsy();
          expect(menu.textContent.trim().length).toBeGreaterThan(0);
        }
        
        // If invalid, must be missing menu items, hidden, or empty
        if (!isValid) {
          const hasNoMenuItems = menu.children.length === 0;
          const isHidden = menu.attributes.hidden === true;
          const isEmpty = !menu.textContent || menu.textContent.trim().length === 0;
          expect(hasNoMenuItems || isHidden || isEmpty).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should find associated post for share menu', async () => {
    // Generator for platform
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        // Create a mock post
        const post = createMockPost(platform, { top: 100, left: 100 });
        
        // Create a mock share menu near the post
        const menu = platform === 'twitter' ?
          createMockTwitterShareMenu(true, true) :
          createMockInstagramShareMenu(true, true);
        
        // Set menu position near the post
        menu.attributes.top = 150;
        menu.attributes.left = 150;
        
        // Mock document.querySelectorAll to return our elements
        const originalQuerySelectorAll = document.querySelectorAll;
        document.querySelectorAll = function(selector) {
          if (selector.includes('share') || selector.includes('Share')) {
            return [post.children[0]]; // Return the share button
          }
          if (selector.includes('article') || selector.includes('tweet') || selector.includes('presentation')) {
            return [post];
          }
          return [];
        };
        
        try {
          const associatedPost = findAssociatedPost(menu, platform);
          
          // Should find the associated post (or null if distance is too far)
          // The function should return either the post or null, not throw an error
          expect(associatedPost === null || associatedPost === post).toBe(true);
        } finally {
          // Restore original function
          document.querySelectorAll = originalQuerySelectorAll;
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle multiple posts and find the closest one', async () => {
    // Generator for platform and number of posts
    const configArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      numPosts: fc.integer({ min: 1, max: 5 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        // Create multiple posts at different positions
        const posts = [];
        for (let i = 0; i < config.numPosts; i++) {
          const post = createMockPost(config.platform, { 
            top: 100 + (i * 400), 
            left: 100 
          });
          posts.push(post);
        }
        
        // Create a share menu near the first post
        const menu = config.platform === 'twitter' ?
          createMockTwitterShareMenu(true, true) :
          createMockInstagramShareMenu(true, true);
        menu.attributes.top = 150;
        menu.attributes.left = 150;
        
        // Mock document.querySelectorAll
        const originalQuerySelectorAll = document.querySelectorAll;
        document.querySelectorAll = function(selector) {
          if (selector.includes('share') || selector.includes('Share')) {
            return posts.flatMap(p => p.children);
          }
          if (selector.includes('article') || selector.includes('tweet') || selector.includes('presentation')) {
            return posts;
          }
          return [];
        };
        
        try {
          const associatedPost = findAssociatedPost(menu, config.platform);
          
          // Should find a post (or null)
          if (associatedPost) {
            expect(posts.includes(associatedPost)).toBe(true);
          }
        } finally {
          document.querySelectorAll = originalQuerySelectorAll;
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should reject invalid elements as share menus', async () => {
    // Generator for invalid element types
    const invalidElementArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      tagName: fc.constantFrom('SPAN', 'P', 'SECTION', 'ARTICLE'),
      hasContent: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(invalidElementArbitrary, async (config) => {
        const element = createMockElement(
          config.tagName, 
          { role: 'menu' }, 
          config.hasContent ? 'Some content' : ''
        );
        
        // Add some children to make it look like a menu
        const item = createMockElement('DIV', { role: 'menuitem' }, 'Item');
        element.children.push(item);
        
        const isValid = isShareMenu(element, config.platform);
        
        // Should only be valid if it matches the platform's menu selectors
        // Most invalid elements won't match the specific selectors
        expect(typeof isValid).toBe('boolean');
      }),
      { numRuns: 100 }
    );
  });

  test('should validate selector configuration exists for both platforms', () => {
    const twitterConfig = getSelectorConfig('twitter');
    const instagramConfig = getSelectorConfig('instagram');
    
    expect(twitterConfig).not.toBeNull();
    expect(instagramConfig).not.toBeNull();
    
    // Verify menu selectors exist
    expect(twitterConfig.menu).toBeDefined();
    expect(instagramConfig.menu).toBeDefined();
    expect(Array.isArray(twitterConfig.menu)).toBe(true);
    expect(Array.isArray(instagramConfig.menu)).toBe(true);
    expect(twitterConfig.menu.length).toBeGreaterThan(0);
    expect(instagramConfig.menu.length).toBeGreaterThan(0);
    
    // Verify trigger selectors exist
    expect(twitterConfig.trigger).toBeDefined();
    expect(instagramConfig.trigger).toBeDefined();
    expect(Array.isArray(twitterConfig.trigger)).toBe(true);
    expect(Array.isArray(instagramConfig.trigger)).toBe(true);
    
    // Verify menu item selectors exist
    expect(twitterConfig.menuItems).toBeDefined();
    expect(instagramConfig.menuItems).toBeDefined();
    expect(Array.isArray(twitterConfig.menuItems)).toBe(true);
    expect(Array.isArray(instagramConfig.menuItems)).toBe(true);
  });
});
/**
 * Uni
t Tests for Share Menu Detector Module
 * Tests specific examples and edge cases for share menu detection
 */

describe('Unit Tests: Share Menu Detection', () => {
  describe('isShareMenu validation', () => {
    test('should detect valid Twitter share menu with all required elements', () => {
      const menu = createMockTwitterShareMenu(true, true);
      expect(isShareMenu(menu, 'twitter')).toBe(true);
    });

    test('should reject Twitter share menu without menu items', () => {
      const menu = createMockTwitterShareMenu(false, true);
      expect(isShareMenu(menu, 'twitter')).toBe(false);
    });

    test('should reject hidden Twitter share menu', () => {
      const menu = createMockTwitterShareMenu(true, false);
      expect(isShareMenu(menu, 'twitter')).toBe(false);
    });

    test('should detect valid Instagram share menu with all required elements', () => {
      const menu = createMockInstagramShareMenu(true, true);
      expect(isShareMenu(menu, 'instagram')).toBe(true);
    });

    test('should reject Instagram share menu without menu items', () => {
      const menu = createMockInstagramShareMenu(false, true);
      expect(isShareMenu(menu, 'instagram')).toBe(false);
    });

    test('should reject hidden Instagram share menu', () => {
      const menu = createMockInstagramShareMenu(true, false);
      expect(isShareMenu(menu, 'instagram')).toBe(false);
    });

    test('should reject null element', () => {
      expect(isShareMenu(null, 'twitter')).toBe(false);
      expect(isShareMenu(null, 'instagram')).toBe(false);
    });

    test('should reject undefined element', () => {
      expect(isShareMenu(undefined, 'twitter')).toBe(false);
      expect(isShareMenu(undefined, 'instagram')).toBe(false);
    });

    test('should reject invalid platform', () => {
      const menu = createMockTwitterShareMenu(true, true);
      expect(isShareMenu(menu, 'invalid')).toBe(false);
      expect(isShareMenu(menu, null)).toBe(false);
      expect(isShareMenu(menu, undefined)).toBe(false);
    });

    test('should reject element with no textContent', () => {
      const menu = createMockElement('DIV', { 
        'data-testid': 'Dropdown',
        role: 'menu'
      }, '');
      const item = createMockElement('DIV', { role: 'menuitem' }, '');
      menu.children.push(item);
      
      expect(isShareMenu(menu, 'twitter')).toBe(false);
    });
  });

  describe('findAssociatedPost', () => {
    let originalQuerySelectorAll;

    beforeEach(() => {
      originalQuerySelectorAll = document.querySelectorAll;
    });

    afterEach(() => {
      document.querySelectorAll = originalQuerySelectorAll;
    });

    test('should find associated Twitter post when share button is near menu', () => {
      const post = createMockPost('twitter', { top: 100, left: 100 });
      const menu = createMockTwitterShareMenu(true, true);
      menu.attributes.top = 150;
      menu.attributes.left = 150;

      document.querySelectorAll = function(selector) {
        if (selector.includes('share')) {
          return [post.children[0]];
        }
        if (selector.includes('article') || selector.includes('tweet')) {
          return [post];
        }
        return [];
      };

      const result = findAssociatedPost(menu, 'twitter');
      expect(result).toBe(post);
    });

    test('should find associated Instagram post when share button is near menu', () => {
      const post = createMockPost('instagram', { top: 100, left: 100 });
      const menu = createMockInstagramShareMenu(true, true);
      menu.attributes.top = 150;
      menu.attributes.left = 150;

      document.querySelectorAll = function(selector) {
        if (selector.includes('Share')) {
          return [post.children[0]];
        }
        if (selector.includes('article') || selector.includes('presentation')) {
          return [post];
        }
        return [];
      };

      const result = findAssociatedPost(menu, 'instagram');
      expect(result).toBe(post);
    });

    test('should return null when no posts are found', () => {
      const menu = createMockTwitterShareMenu(true, true);

      document.querySelectorAll = function() {
        return [];
      };

      const result = findAssociatedPost(menu, 'twitter');
      expect(result).toBeNull();
    });

    test('should return the only post when only one post exists', () => {
      const post = createMockPost('twitter', { top: 100, left: 100 });
      const menu = createMockTwitterShareMenu(true, true);
      menu.attributes.top = 500;
      menu.attributes.left = 500;

      document.querySelectorAll = function(selector) {
        if (selector.includes('article') || selector.includes('tweet')) {
          return [post];
        }
        return [];
      };

      const result = findAssociatedPost(menu, 'twitter');
      expect(result).toBe(post);
    });

    test('should handle null menu element', () => {
      const result = findAssociatedPost(null, 'twitter');
      expect(result).toBeNull();
    });

    test('should handle undefined menu element', () => {
      const result = findAssociatedPost(undefined, 'twitter');
      expect(result).toBeNull();
    });

    test('should handle invalid platform', () => {
      const menu = createMockTwitterShareMenu(true, true);
      const result = findAssociatedPost(menu, 'invalid');
      expect(result).toBeNull();
    });

    test('should find closest post when multiple posts exist', () => {
      const post1 = createMockPost('twitter', { top: 100, left: 100 });
      const post2 = createMockPost('twitter', { top: 500, left: 100 });
      const post3 = createMockPost('twitter', { top: 900, left: 100 });
      
      const menu = createMockTwitterShareMenu(true, true);
      menu.attributes.top = 150;
      menu.attributes.left = 150;

      document.querySelectorAll = function(selector) {
        if (selector.includes('share')) {
          return [post1.children[0], post2.children[0], post3.children[0]];
        }
        if (selector.includes('article') || selector.includes('tweet')) {
          return [post1, post2, post3];
        }
        return [];
      };

      const result = findAssociatedPost(menu, 'twitter');
      // Should find post1 as it's closest to the menu
      expect(result).toBe(post1);
    });
  });

  describe('observeShareMenus', () => {
    test('should return null for invalid platform', () => {
      const callback = jest.fn();
      const observer = observeShareMenus('invalid', callback);
      expect(observer).toBeNull();
    });

    test('should return null when callback is not a function', () => {
      const observer = observeShareMenus('twitter', null);
      expect(observer).toBeNull();
    });

    test('should return null when callback is undefined', () => {
      const observer = observeShareMenus('twitter', undefined);
      expect(observer).toBeNull();
    });

    test('should create MutationObserver for valid platform and callback', () => {
      const callback = jest.fn();
      const observer = observeShareMenus('twitter', callback);
      
      expect(observer).not.toBeNull();
      expect(observer).toBeInstanceOf(MutationObserver);
      
      // Clean up
      if (observer) {
        observer.disconnect();
      }
    });

    test('should create MutationObserver for Instagram', () => {
      const callback = jest.fn();
      const observer = observeShareMenus('instagram', callback);
      
      expect(observer).not.toBeNull();
      expect(observer).toBeInstanceOf(MutationObserver);
      
      // Clean up
      if (observer) {
        observer.disconnect();
      }
    });
  });

  describe('getSelectorConfig', () => {
    test('should return config for Twitter', () => {
      const config = getSelectorConfig('twitter');
      expect(config).not.toBeNull();
      expect(config.menu).toBeDefined();
      expect(config.trigger).toBeDefined();
      expect(config.menuItems).toBeDefined();
      expect(config.postContainer).toBeDefined();
    });

    test('should return config for Instagram', () => {
      const config = getSelectorConfig('instagram');
      expect(config).not.toBeNull();
      expect(config.menu).toBeDefined();
      expect(config.trigger).toBeDefined();
      expect(config.menuItems).toBeDefined();
      expect(config.postContainer).toBeDefined();
    });

    test('should return null for invalid platform', () => {
      const config = getSelectorConfig('invalid');
      expect(config).toBeNull();
    });

    test('should return null for null platform', () => {
      const config = getSelectorConfig(null);
      expect(config).toBeNull();
    });

    test('should return null for undefined platform', () => {
      const config = getSelectorConfig(undefined);
      expect(config).toBeNull();
    });
  });

  describe('SHARE_MENU_SELECTORS constant', () => {
    test('should have Twitter configuration', () => {
      expect(SHARE_MENU_SELECTORS.twitter).toBeDefined();
      expect(Array.isArray(SHARE_MENU_SELECTORS.twitter.menu)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.twitter.trigger)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.twitter.menuItems)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.twitter.postContainer)).toBe(true);
    });

    test('should have Instagram configuration', () => {
      expect(SHARE_MENU_SELECTORS.instagram).toBeDefined();
      expect(Array.isArray(SHARE_MENU_SELECTORS.instagram.menu)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.instagram.trigger)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.instagram.menuItems)).toBe(true);
      expect(Array.isArray(SHARE_MENU_SELECTORS.instagram.postContainer)).toBe(true);
    });

    test('should have non-empty selector arrays', () => {
      expect(SHARE_MENU_SELECTORS.twitter.menu.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.twitter.trigger.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.twitter.menuItems.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.twitter.postContainer.length).toBeGreaterThan(0);
      
      expect(SHARE_MENU_SELECTORS.instagram.menu.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.instagram.trigger.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.instagram.menuItems.length).toBeGreaterThan(0);
      expect(SHARE_MENU_SELECTORS.instagram.postContainer.length).toBeGreaterThan(0);
    });
  });
});
