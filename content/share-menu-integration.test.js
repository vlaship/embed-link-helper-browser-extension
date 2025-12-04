/**
 * End-to-End Integration Tests for Share Menu Integration
 * Tests complete share menu flow for Twitter and Instagram
 */

const fc = require('fast-check');

// Setup mocks before loading modules
beforeAll(() => {
  // Mock browser API
  global.browser = {
    storage: {
      sync: {
        get: jest.fn(),
        set: jest.fn()
      },
      onChanged: {
        addListener: jest.fn()
      }
    }
  };

  // Mock navigator.clipboard
  global.navigator = {
    clipboard: {
      writeText: jest.fn()
    }
  };

  // Mock document
  global.document = {
    readyState: 'complete',
    addEventListener: jest.fn(),
    createElement: jest.fn(),
    createElementNS: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    },
    execCommand: jest.fn(),
    querySelectorAll: jest.fn(() => [])
  };

  // Mock console methods to reduce noise
  global.console = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  };
});

// Helper function to create mock DOM elements
function createMockElement(tagName, attributes = {}) {
  const element = {
    tagName: tagName.toUpperCase(),
    attributes: attributes,
    children: [],
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn((className) => {
        return element.className && element.className.includes(className);
      })
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    getAttribute: jest.fn((name) => attributes[name]),
    setAttribute: jest.fn((name, value) => { attributes[name] = value; }),
    getBoundingClientRect: jest.fn(() => ({
      width: 200,
      height: 300,
      top: attributes.top || 100,
      left: attributes.left || 100,
      bottom: (attributes.top || 100) + 300,
      right: (attributes.left || 100) + 200
    })),
    appendChild: jest.fn((child) => {
      element.children.push(child);
      child.parentElement = element;
      if (!element.firstChild) {
        element.firstChild = child;
      }
    }),
    insertBefore: jest.fn((newChild, referenceChild) => {
      if (!referenceChild) {
        element.appendChild(newChild);
        return;
      }
      const index = element.children.indexOf(referenceChild);
      if (index >= 0) {
        element.children.splice(index, 0, newChild);
        newChild.parentElement = element;
        if (index === 0) {
          element.firstChild = newChild;
        }
      }
    }),
    style: {},
    textContent: '',
    className: '',
    type: attributes.type || '',
    parentElement: null,
    firstChild: null,
    matches: jest.fn((selector) => {
      // Handle tag name matching
      const tagMatch = selector.match(/^([a-z]+)/i);
      if (tagMatch && tagMatch[1].toUpperCase() !== element.tagName) {
        return false;
      }
      
      // Handle data-testid attribute
      if (selector.includes('[data-testid=')) {
        const testIdMatch = selector.match(/\[data-testid="([^"]+)"\]/);
        if (testIdMatch && attributes['data-testid'] !== testIdMatch[1]) {
          return false;
        }
      }
      
      // Handle role attribute
      if (selector.includes('[role=')) {
        const roleMatch = selector.match(/\[role="([^"]+)"\]/);
        if (roleMatch && attributes.role !== roleMatch[1]) {
          return false;
        }
      }
      
      // Handle aria-label attribute
      if (selector.includes('[aria-label')) {
        const ariaMatch = selector.match(/\[aria-label[*^$]?="([^"]+)"\]/);
        if (ariaMatch) {
          const ariaValue = attributes['aria-label'];
          if (!ariaValue) return false;
          
          if (selector.includes('*=')) {
            // Contains
            if (!ariaValue.includes(ariaMatch[1])) return false;
          } else if (selector.includes('^=')) {
            // Starts with
            if (!ariaValue.startsWith(ariaMatch[1])) return false;
          } else if (selector.includes('$=')) {
            // Ends with
            if (!ariaValue.endsWith(ariaMatch[1])) return false;
          } else {
            // Exact match
            if (ariaValue !== ariaMatch[1]) return false;
          }
        }
      }
      
      return true;
    }),
    closest: jest.fn((selector) => {
      let current = element;
      while (current) {
        if (current.matches && current.matches(selector)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    })
  };
  
  Object.setPrototypeOf(element, HTMLElement.prototype);
  return element;
}

// Mock document.createElement
document.createElement = function(tagName) {
  return createMockElement(tagName);
};

document.createElementNS = function(namespace, tagName) {
  const element = createMockElement(tagName);
  element.namespace = namespace;
  element.setAttributeNS = function(ns, name, value) {
    this.setAttribute(name, value);
  };
  return element;
};

// Load utility modules first
const ShareMenuDetector = require('../utils/share-menu-detector.js');
const ShareMenuInjector = require('../utils/share-menu-injector.js');
const FeedbackManager = require('../utils/feedback-manager.js');
const PostUrlExtractor = require('../utils/post-url-extractor.js');
const UrlTransformer = require('../utils/url-transformer.js');

// Set modules on window for content scripts BEFORE loading them
if (!global.window) {
  global.window = {};
}
global.window.ShareMenuDetector = ShareMenuDetector;
global.window.ShareMenuInjector = ShareMenuInjector;
global.window.FeedbackManager = FeedbackManager;
global.window.PostUrlExtractor = PostUrlExtractor;
global.window.UrlTransformer = UrlTransformer;

// Now load content scripts
const twitterShareMenu = require('./twitter-share-menu.js');
const instagramShareMenu = require('./instagram-share-menu.js');

/**
 * Integration Test: Complete Twitter Share Menu Flow
 * Tests the end-to-end flow from menu detection to clipboard copy
 */
describe('Integration: Complete Twitter Share Menu Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default configuration
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });

    // Reset and mock clipboard API
    if (!global.navigator.clipboard) {
      global.navigator.clipboard = {};
    }
    global.navigator.clipboard.writeText = jest.fn().mockResolvedValue();
  });

  test('should complete full flow: detect menu -> inject item -> click -> copy to clipboard', async () => {
    // Initialize the content script
    await twitterShareMenu.init();

    // Create a mock post with URL
    const postUrl = 'https://x.com/testuser/status/123456789';
    const post = createMockElement('ARTICLE', { 'data-testid': 'tweet' });
    const timeElement = createMockElement('TIME', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    timeElement.closest = jest.fn(() => link);
    post.querySelector = jest.fn((selector) => {
      if (selector === 'time') return timeElement;
      return null;
    });

    // Create a mock share menu
    const menu = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });
    const existingItem = createMockElement('DIV', { role: 'menuitem' });
    existingItem.textContent = 'Copy link';
    menu.appendChild(existingItem);
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      if (selector === 'div[role="menuitem"]') {
        return menu.children.filter(c => c.attributes.role === 'menuitem');
      }
      return [];
    });

    // Mock document.querySelectorAll to return our post
    document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('article') || selector.includes('tweet')) {
        return [post];
      }
      return [];
    });

    // Simulate share menu detection
    await twitterShareMenu.handleShareMenuDetected(menu);

    // Verify menu item was injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);

    const menuItem = injectedItems[0];
    expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
    expect(menuItem.getAttribute('data-target-hostname')).toBe('fixvx.com');

    // Simulate click on the menu item
    const clickHandler = menuItem.addEventListener.mock.calls.find(
      call => call[0] === 'click'
    );
    expect(clickHandler).toBeDefined();

    // Trigger the click handler
    const clickEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    await clickHandler[1](clickEvent);

    // Verify clipboard was written with transformed URL
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://fixvx.com/testuser/status/123456789'
    );
  });

  test('should handle configuration changes during flow', async () => {
    // Initialize with initial config
    await twitterShareMenu.init();

    // Get the storage listener
    const storageListener = global.browser.storage.onChanged.addListener.mock.calls[0][0];

    // Simulate configuration change
    const configUpdate = {
      config: {
        newValue: {
          twitter: {
            enabled: true,
            targetHostname: 'vxtwitter.com'
          },
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        },
        oldValue: {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
          },
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        }
      }
    };

    storageListener(configUpdate, 'sync');

    // Now detect a share menu
    const postUrl = 'https://x.com/testuser/status/987654321';
    const post = createMockElement('ARTICLE', { 'data-testid': 'tweet' });
    const timeElement = createMockElement('TIME', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    timeElement.closest = jest.fn(() => link);
    post.querySelector = jest.fn((selector) => {
      if (selector === 'time') return timeElement;
      return null;
    });

    const menu = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      return [];
    });

    document.querySelectorAll = jest.fn(() => [post]);

    await twitterShareMenu.handleShareMenuDetected(menu);

    // Verify the new configuration was used
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);
    expect(injectedItems[0].getAttribute('data-target-hostname')).toBe('vxtwitter.com');
  });

  test('should handle disabled configuration', async () => {
    // Setup disabled configuration
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: false,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });

    await twitterShareMenu.init();

    // Try to detect a share menu
    const menu = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });

    await twitterShareMenu.handleShareMenuDetected(menu);

    // Verify no menu item was injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(0);
  });
});

/**
 * Integration Test: Complete Instagram Share Menu Flow
 * Tests the end-to-end flow from menu detection to clipboard copy
 */
describe('Integration: Complete Instagram Share Menu Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default configuration
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });

    // Reset and mock clipboard API
    if (!global.navigator.clipboard) {
      global.navigator.clipboard = {};
    }
    global.navigator.clipboard.writeText = jest.fn().mockResolvedValue();
  });

  test('should complete full flow: detect menu -> inject item -> click -> copy to clipboard', async () => {
    // Initialize the content script
    await instagramShareMenu.init();

    // Create a mock post with URL
    const postUrl = 'https://www.instagram.com/p/ABC123/';
    const post = createMockElement('ARTICLE', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    post.querySelector = jest.fn((selector) => {
      if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
        return link;
      }
      return null;
    });
    post.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
        return [link];
      }
      return [];
    });

    // Create a mock share menu with proper structure
    const menu = createMockElement('DIV', { role: 'dialog' });
    menu.textContent = 'Share to...'; // Add text content so isShareMenu passes
    
    // Add multiple menu items (Instagram needs at least 3 for injection point detection)
    const item1 = createMockElement('BUTTON', {});
    item1.textContent = 'Share to...';
    menu.appendChild(item1);
    
    const item2 = createMockElement('BUTTON', {});
    item2.textContent = 'Copy link';
    menu.appendChild(item2);
    
    const item3 = createMockElement('BUTTON', {});
    item3.textContent = 'Embed';
    menu.appendChild(item3);
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      if (selector === 'div') {
        return [menu];
      }
      if (selector === 'button') {
        return menu.children.filter(c => c.tagName === 'BUTTON');
      }
      return [];
    });
    menu.getBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 300,
      top: 100,
      left: 100,
      bottom: 400,
      right: 300
    }));

    // Mock document.querySelectorAll to return our post
    document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('article')) {
        return [post];
      }
      if (selector.includes('[aria-label*="Share"]') || selector.includes('Share')) {
        const shareButton = createMockElement('BUTTON', { 'aria-label': 'Share' });
        shareButton.parentElement = post;
        shareButton.getBoundingClientRect = jest.fn(() => ({
          width: 50,
          height: 50,
          top: 120,
          left: 120,
          bottom: 170,
          right: 170
        }));
        return [shareButton];
      }
      return [];
    });

    // Simulate share menu detection
    await instagramShareMenu.handleShareMenuDetected(menu);

    // Verify menu item was injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);

    const menuItem = injectedItems[0];
    expect(menuItem.getAttribute('data-post-url')).toBe(postUrl);
    expect(menuItem.getAttribute('data-target-hostname')).toBe('kkinstagram.com');

    // Simulate click on the menu item
    const clickHandler = menuItem.addEventListener.mock.calls.find(
      call => call[0] === 'click'
    );
    expect(clickHandler).toBeDefined();

    // Trigger the click handler
    const clickEvent = { preventDefault: jest.fn(), stopPropagation: jest.fn() };
    await clickHandler[1](clickEvent);

    // Verify clipboard was written with transformed URL
    expect(global.navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://kkinstagram.com/p/ABC123/'
    );
  });

  test('should handle configuration changes during flow', async () => {
    // Initialize with initial config
    await instagramShareMenu.init();

    // Get the storage listener
    const storageListener = global.browser.storage.onChanged.addListener.mock.calls[0][0];

    // Simulate configuration change
    const configUpdate = {
      config: {
        newValue: {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
          },
          instagram: {
            enabled: true,
            targetHostname: 'ddinstagram.com'
          }
        },
        oldValue: {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
          },
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        }
      }
    };

    storageListener(configUpdate, 'sync');

    // Now detect a share menu
    const postUrl = 'https://www.instagram.com/p/XYZ789/';
    const post = createMockElement('ARTICLE', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    post.querySelector = jest.fn((selector) => {
      if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
        return link;
      }
      return null;
    });
    post.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
        return [link];
      }
      return [];
    });

    const menu = createMockElement('DIV', { role: 'dialog' });
    menu.textContent = 'Share to...';
    
    // Add multiple menu items
    const item1 = createMockElement('BUTTON', {});
    item1.textContent = 'Share to...';
    menu.appendChild(item1);
    
    const item2 = createMockElement('BUTTON', {});
    item2.textContent = 'Copy link';
    menu.appendChild(item2);
    
    const item3 = createMockElement('BUTTON', {});
    item3.textContent = 'Embed';
    menu.appendChild(item3);
    
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      if (selector === 'div') {
        return [menu];
      }
      if (selector === 'button') {
        return menu.children.filter(c => c.tagName === 'BUTTON');
      }
      return [];
    });
    menu.getBoundingClientRect = jest.fn(() => ({
      width: 200,
      height: 300,
      top: 100,
      left: 100,
      bottom: 400,
      right: 300
    }));

    document.querySelectorAll = jest.fn((selector) => {
      if (selector.includes('article')) {
        return [post];
      }
      if (selector.includes('[aria-label*="Share"]') || selector.includes('Share')) {
        const shareButton = createMockElement('BUTTON', { 'aria-label': 'Share' });
        shareButton.parentElement = post;
        shareButton.getBoundingClientRect = jest.fn(() => ({
          width: 50,
          height: 50,
          top: 120,
          left: 120,
          bottom: 170,
          right: 170
        }));
        return [shareButton];
      }
      return [];
    });

    await instagramShareMenu.handleShareMenuDetected(menu);

    // Verify the new configuration was used
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);
    expect(injectedItems[0].getAttribute('data-target-hostname')).toBe('ddinstagram.com');
  });

  test('should handle disabled configuration', async () => {
    // Setup disabled configuration
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: false,
          targetHostname: 'kkinstagram.com'
        }
      }
    });

    await instagramShareMenu.init();

    // Try to detect a share menu
    const menu = createMockElement('DIV', { role: 'dialog' });

    await instagramShareMenu.handleShareMenuDetected(menu);

    // Verify no menu item was injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(0);
  });
});

/**
 * Integration Test: Dynamic Content Support
 * Tests that share menu integration works with dynamically loaded posts
 */
describe('Integration: Dynamic Content Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });
  });

  test('should handle multiple posts loaded via infinite scroll on Instagram', async () => {
    await instagramShareMenu.init();

    // Simulate loading multiple posts dynamically
    const posts = [
      { url: 'https://www.instagram.com/p/POST1/', id: 'POST1' },
      { url: 'https://www.instagram.com/p/POST2/', id: 'POST2' },
      { url: 'https://www.instagram.com/p/POST3/', id: 'POST3' }
    ];

    for (const postData of posts) {
      const post = createMockElement('ARTICLE', {});
      const link = createMockElement('A', { href: postData.url });
      link.href = postData.url;
      post.querySelector = jest.fn((selector) => {
        if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
          return link;
        }
        return null;
      });
      post.querySelectorAll = jest.fn((selector) => {
        if (selector.includes('a[href*="/p/"]') || selector.includes('a[href*="/reel/"]') || selector.includes('a[href*="/tv/"]')) {
          return [link];
        }
        return [];
      });

      const menu = createMockElement('DIV', { role: 'dialog', _uniqueId: Math.random() });
      menu.textContent = 'Share to...';
      
      // Add multiple menu items
      const item1 = createMockElement('BUTTON', {});
      item1.textContent = 'Share to...';
      menu.appendChild(item1);
      
      const item2 = createMockElement('BUTTON', {});
      item2.textContent = 'Copy link';
      menu.appendChild(item2);
      
      const item3 = createMockElement('BUTTON', {});
      item3.textContent = 'Embed';
      menu.appendChild(item3);
      
      menu.querySelectorAll = jest.fn((selector) => {
        if (selector === '.embed-link-menu-item') {
          return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
        }
        if (selector === 'div') {
          return [menu];
        }
        if (selector === 'button') {
          return menu.children.filter(c => c.tagName === 'BUTTON');
        }
        return [];
      });
      menu.getBoundingClientRect = jest.fn(() => ({
        width: 200,
        height: 300,
        top: 100,
        left: 100,
        bottom: 400,
        right: 300
      }));

      document.querySelectorAll = jest.fn((selector) => {
        if (selector.includes('article')) {
          return [post];
        }
        if (selector.includes('[aria-label*="Share"]') || selector.includes('Share')) {
          const shareButton = createMockElement('BUTTON', { 'aria-label': 'Share' });
          shareButton.parentElement = post;
          shareButton.getBoundingClientRect = jest.fn(() => ({
            width: 50,
            height: 50,
            top: 120,
            left: 120,
            bottom: 170,
            right: 170
          }));
          return [shareButton];
        }
        return [];
      });

      await instagramShareMenu.handleShareMenuDetected(menu);

      // Verify menu item was injected for this post
      const injectedItems = menu.children.filter(c => 
        c.className && c.className.includes('embed-link-menu-item')
      );
      expect(injectedItems.length).toBe(1);
      expect(injectedItems[0].getAttribute('data-post-url')).toBe(postData.url);
    }
  });

  test('should handle multiple posts loaded via infinite scroll on Twitter', async () => {
    await twitterShareMenu.init();

    // Simulate loading multiple posts dynamically
    const posts = [
      { url: 'https://x.com/user1/status/111', id: '111' },
      { url: 'https://x.com/user2/status/222', id: '222' },
      { url: 'https://x.com/user3/status/333', id: '333' }
    ];

    for (const postData of posts) {
      const post = createMockElement('ARTICLE', { 'data-testid': 'tweet' });
      const timeElement = createMockElement('TIME', {});
      const link = createMockElement('A', { href: postData.url });
      link.href = postData.url;
      timeElement.closest = jest.fn(() => link);
      post.querySelector = jest.fn((selector) => {
        if (selector === 'time') return timeElement;
        return null;
      });

      const menu = createMockElement('DIV', { 
        'data-testid': 'Dropdown',
        role: 'menu',
        _uniqueId: Math.random()
      });
      menu.querySelectorAll = jest.fn((selector) => {
        if (selector === '.embed-link-menu-item') {
          return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
        }
        return [];
      });

      document.querySelectorAll = jest.fn(() => [post]);

      await twitterShareMenu.handleShareMenuDetected(menu);

      // Verify menu item was injected for this post
      const injectedItems = menu.children.filter(c => 
        c.className && c.className.includes('embed-link-menu-item')
      );
      expect(injectedItems.length).toBe(1);
      expect(injectedItems[0].getAttribute('data-post-url')).toBe(postData.url);
    }
  });
});

/**
 * Integration Test: Error Handling
 * Tests that the system handles errors gracefully
 */
describe('Integration: Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    global.browser.storage.sync.get.mockResolvedValue({
      config: {
        twitter: {
          enabled: true,
          targetHostname: 'fixvx.com'
        },
        instagram: {
          enabled: true,
          targetHostname: 'kkinstagram.com'
        }
      }
    });
  });

  test('should handle clipboard write failure gracefully', async () => {
    // Mock clipboard failure
    if (!global.navigator.clipboard) {
      global.navigator.clipboard = {};
    }
    global.navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard access denied'));

    await twitterShareMenu.init();

    const postUrl = 'https://x.com/testuser/status/123456789';
    const post = createMockElement('ARTICLE', { 'data-testid': 'tweet' });
    const timeElement = createMockElement('TIME', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    timeElement.closest = jest.fn(() => link);
    post.querySelector = jest.fn((selector) => {
      if (selector === 'time') return timeElement;
      return null;
    });

    const menu = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      return [];
    });

    document.querySelectorAll = jest.fn(() => [post]);

    // Should not throw error
    let error = null;
    try {
      await twitterShareMenu.handleShareMenuDetected(menu);
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();

    // Menu item should still be injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);
  });

  test('should handle missing post URL gracefully', async () => {
    await instagramShareMenu.init();

    // Create a post without a valid URL
    const post = createMockElement('ARTICLE', {});
    post.querySelector = jest.fn(() => null);

    const menu = createMockElement('DIV', { role: 'dialog' });
    menu.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      return [];
    });

    document.querySelectorAll = jest.fn(() => [post]);

    // Should not throw error
    let error = null;
    try {
      await instagramShareMenu.handleShareMenuDetected(menu);
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();

    // No menu item should be injected
    const injectedItems = menu.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(0);
  });

  test('should continue working after encountering errors', async () => {
    await twitterShareMenu.init();

    // First attempt: missing post (should fail gracefully)
    const menu1 = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });
    menu1.querySelectorAll = jest.fn(() => []);
    document.querySelectorAll = jest.fn(() => []);

    await twitterShareMenu.handleShareMenuDetected(menu1);

    // Second attempt: valid post (should succeed)
    const postUrl = 'https://x.com/testuser/status/123456789';
    const post = createMockElement('ARTICLE', { 'data-testid': 'tweet' });
    const timeElement = createMockElement('TIME', {});
    const link = createMockElement('A', { href: postUrl });
    link.href = postUrl;
    timeElement.closest = jest.fn(() => link);
    post.querySelector = jest.fn((selector) => {
      if (selector === 'time') return timeElement;
      return null;
    });

    const menu2 = createMockElement('DIV', { 
      'data-testid': 'Dropdown',
      role: 'menu'
    });
    menu2.querySelectorAll = jest.fn((selector) => {
      if (selector === '.embed-link-menu-item') {
        return menu2.children.filter(c => c.className && c.className.includes('embed-link-menu-item'));
      }
      return [];
    });

    document.querySelectorAll = jest.fn(() => [post]);

    await twitterShareMenu.handleShareMenuDetected(menu2);

    // Verify the second attempt succeeded
    const injectedItems = menu2.children.filter(c => 
      c.className && c.className.includes('embed-link-menu-item')
    );
    expect(injectedItems.length).toBe(1);
  });
});
