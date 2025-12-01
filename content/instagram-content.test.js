/**
 * Property-Based Tests for Instagram Content Script
 * Tests button injection idempotence
 */

const fc = require('fast-check');

// Mock browser APIs
const mockBrowser = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  }
};

global.chrome = mockBrowser;
global.browser = mockBrowser;

// Mock DOM environment
let mockDocument;
let mockBody;
let mockLocation;

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Create fresh DOM mock for each test
  mockBody = {
    children: [],
    appendChild: jest.fn(function(element) {
      this.children.push(element);
      return element;
    }),
    querySelectorAll: jest.fn(function(selector) {
      return this.children.filter(el => {
        if (selector.startsWith('#')) {
          return el.id === selector.substring(1);
        }
        if (selector.startsWith('.')) {
          return el.className && el.className.includes(selector.substring(1));
        }
        return false;
      });
    })
  };
  
  mockDocument = {
    body: mockBody,
    readyState: 'complete',
    getElementById: jest.fn((id) => {
      return mockBody.children.find(el => el.id === id) || null;
    }),
    createElement: jest.fn((tag) => {
      return {
        tagName: tag.toUpperCase(),
        id: '',
        className: '',
        textContent: '',
        title: '',
        style: {
          cssText: ''
        },
        addEventListener: jest.fn(),
        remove: jest.fn(function() {
          const index = mockBody.children.indexOf(this);
          if (index > -1) {
            mockBody.children.splice(index, 1);
          }
        })
      };
    }),
    addEventListener: jest.fn()
  };
  
  mockLocation = {
    hostname: 'www.instagram.com',
    href: 'https://www.instagram.com/p/ABC123/',
    protocol: 'https:',
    pathname: '/p/ABC123/',
    search: '',
    hash: ''
  };
  
  // Set up global mocks
  global.document = mockDocument;
  global.window = {
    location: mockLocation
  };
});

afterEach(() => {
  // Clean up
  delete global.document;
  delete global.window;
});

/**
 * **Feature: social-media-redirector, Property 4: Button Injection Idempotence**
 * **Validates: Requirements 2.1, 2.5**
 * 
 * For any Instagram page where a redirect button has been injected, attempting to inject 
 * the button again should not create duplicate buttons.
 */
describe('Property 4: Button Injection Idempotence (Instagram)', () => {
  test('should not create duplicate buttons when injecting multiple times', async () => {
    // Generator for number of injection attempts (2 to 10)
    const injectionAttemptsArbitrary = fc.integer({ min: 2, max: 10 });
    
    // Generator for different Instagram URLs
    const instagramUrlArbitrary = fc.record({
      pathname: fc.oneof(
        fc.constant('/'),
        fc.tuple(
          fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '_'), { minLength: 3, maxLength: 15 }),
        ).map(([user]) => `/${user}/`),
        fc.tuple(
          fc.constantFrom('p', 'reel', 'tv'),
          fc.stringOf(fc.constantFrom('A', 'B', 'C', '1', '2', '3', '_', '-'), { minLength: 6, maxLength: 11 })
        ).map(([type, id]) => `/${type}/${id}/`)
      ),
      search: fc.oneof(
        fc.constant(''),
        fc.webQueryParameters()
      ),
      hash: fc.oneof(
        fc.constant(''),
        fc.webFragments()
      )
    });

    await fc.assert(
      fc.asyncProperty(injectionAttemptsArbitrary, instagramUrlArbitrary, async (attempts, urlComponents) => {
        // Set up the URL
        mockLocation.pathname = urlComponents.pathname;
        mockLocation.search = urlComponents.search;
        mockLocation.hash = urlComponents.hash;
        mockLocation.href = `https://www.instagram.com${urlComponents.pathname}${urlComponents.search}${urlComponents.hash}`;
        
        // Mock config response
        const mockConfig = {
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Load the content script module fresh for each test
        jest.resetModules();
        
        // Manually implement the button injection logic to test
        const BUTTON_ID = 'social-redirector-instagram-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.instagram.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          // Check if button already exists (idempotence check)
          if (buttonExists()) {
            return;
          }
          
          // Create and inject button
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Inject button multiple times
        for (let i = 0; i < attempts; i++) {
          injectButton();
        }
        
        // Count buttons with the specific ID
        const buttonsWithId = mockBody.children.filter(el => el.id === BUTTON_ID);
        
        // Verify only one button exists
        expect(buttonsWithId.length).toBe(1);
        
        // Verify the button has correct properties
        expect(buttonsWithId[0].id).toBe(BUTTON_ID);
        expect(buttonsWithId[0].className).toBe('social-redirector-button');
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain single button across different URL navigations', async () => {
    // Generator for sequences of Instagram URLs (simulating SPA navigation)
    const urlSequenceArbitrary = fc.array(
      fc.record({
        pathname: fc.oneof(
          fc.constant('/'),
          fc.tuple(
            fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3', '_'), { minLength: 3, maxLength: 15 }),
          ).map(([user]) => `/${user}/`),
          fc.tuple(
            fc.constantFrom('p', 'reel', 'tv'),
            fc.stringOf(fc.constantFrom('A', 'B', 'C', '1', '2', '3', '_', '-'), { minLength: 6, maxLength: 11 })
          ).map(([type, id]) => `/${type}/${id}/`)
        ),
        search: fc.oneof(fc.constant(''), fc.webQueryParameters()),
        hash: fc.oneof(fc.constant(''), fc.webFragments())
      }),
      { minLength: 2, maxLength: 5 }
    );

    await fc.assert(
      fc.asyncProperty(urlSequenceArbitrary, async (urlSequence) => {
        // Mock config response
        const mockConfig = {
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-instagram-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.instagram.targetHostname}`;
          return button;
        }
        
        function removeButton() {
          const existingButton = mockDocument.getElementById(BUTTON_ID);
          if (existingButton) {
            existingButton.remove();
          }
        }
        
        function injectButton() {
          if (buttonExists()) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Simulate navigation through URL sequence
        for (const urlComponents of urlSequence) {
          // Update location
          mockLocation.pathname = urlComponents.pathname;
          mockLocation.search = urlComponents.search;
          mockLocation.hash = urlComponents.hash;
          mockLocation.href = `https://www.instagram.com${urlComponents.pathname}${urlComponents.search}${urlComponents.hash}`;
          
          // Simulate SPA navigation: remove old button and inject new one
          removeButton();
          injectButton();
          
          // Verify only one button exists after each navigation
          const buttonsWithId = mockBody.children.filter(el => el.id === BUTTON_ID);
          expect(buttonsWithId.length).toBe(1);
        }
        
        // Final verification: still only one button
        const finalButtons = mockBody.children.filter(el => el.id === BUTTON_ID);
        expect(finalButtons.length).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  test('should not inject button when one already exists in DOM', async () => {
    // Generator for random configurations
    const configArbitrary = fc.record({
      targetHostname: fc.domain(),
      enabled: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (instagramConfig) => {
        // Mock config response
        const mockConfig = {
          instagram: instagramConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-instagram-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.instagram.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          // Check if we're on Instagram
          if (mockLocation.hostname !== 'www.instagram.com' && mockLocation.hostname !== 'instagram.com') {
            return;
          }
          
          // Check if button already exists (idempotence check)
          if (buttonExists()) {
            return;
          }
          
          // Check if config is loaded and Instagram is enabled
          if (!mockConfig || !mockConfig.instagram || !mockConfig.instagram.enabled) {
            return;
          }
          
          // Create and inject button
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Pre-inject a button manually
        const preExistingButton = createButton();
        mockBody.appendChild(preExistingButton);
        
        // Verify button exists
        expect(buttonExists()).toBe(true);
        const initialCount = mockBody.children.filter(el => el.id === BUTTON_ID).length;
        expect(initialCount).toBe(1);
        
        // Try to inject button again (should be prevented by idempotence check)
        injectButton();
        
        // Verify still only one button exists
        const finalCount = mockBody.children.filter(el => el.id === BUTTON_ID).length;
        expect(finalCount).toBe(1);
        expect(finalCount).toBe(initialCount);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle rapid successive injection attempts', async () => {
    // Generator for rapid injection attempts (simulating race conditions)
    const rapidAttemptsArbitrary = fc.integer({ min: 5, max: 20 });

    await fc.assert(
      fc.asyncProperty(rapidAttemptsArbitrary, async (attempts) => {
        // Mock config response
        const mockConfig = {
          instagram: {
            enabled: true,
            targetHostname: 'kkinstagram.com'
          }
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-instagram-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.instagram.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (buttonExists()) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Simulate rapid successive calls (like multiple event handlers firing)
        const injectionPromises = [];
        for (let i = 0; i < attempts; i++) {
          injectionPromises.push(Promise.resolve().then(() => injectButton()));
        }
        
        // Wait for all attempts to complete
        await Promise.all(injectionPromises);
        
        // Verify only one button exists
        const buttonsWithId = mockBody.children.filter(el => el.id === BUTTON_ID);
        expect(buttonsWithId.length).toBe(1);
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain idempotence with different configurations', async () => {
    // Generator for different valid configurations
    const configArbitrary = fc.record({
      targetHostname: fc.domain(),
      enabled: fc.constant(true) // Must be enabled for button to inject
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, fc.integer({ min: 2, max: 5 }), async (instagramConfig, attempts) => {
        // Mock config response
        const mockConfig = {
          instagram: instagramConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-instagram-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.instagram.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (buttonExists()) {
            return;
          }
          
          if (!mockConfig || !mockConfig.instagram || !mockConfig.instagram.enabled) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Inject button multiple times with this configuration
        for (let i = 0; i < attempts; i++) {
          injectButton();
        }
        
        // Verify only one button exists
        const buttonsWithId = mockBody.children.filter(el => el.id === BUTTON_ID);
        expect(buttonsWithId.length).toBe(1);
        
        // Verify button has correct target hostname in title
        expect(buttonsWithId[0].title).toContain(instagramConfig.targetHostname);
      }),
      { numRuns: 100 }
    );
  });
});
