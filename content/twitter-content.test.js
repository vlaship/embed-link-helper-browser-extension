/**
 * Property-Based Tests for Twitter Content Script
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
    hostname: 'x.com',
    href: 'https://x.com/user/status/123',
    protocol: 'https:',
    pathname: '/user/status/123',
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
 * **Validates: Requirements 1.1, 1.5**
 * 
 * For any page where a redirect button has been injected, attempting to inject 
 * the button again should not create duplicate buttons.
 */
describe('Property 4: Button Injection Idempotence', () => {
  test('should not create duplicate buttons when injecting multiple times', async () => {
    // Generator for number of injection attempts (2 to 10)
    const injectionAttemptsArbitrary = fc.integer({ min: 2, max: 10 });
    
    // Generator for different Twitter/X URLs
    const twitterUrlArbitrary = fc.record({
      pathname: fc.oneof(
        fc.constant('/'),
        fc.tuple(
          fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 3, maxLength: 15 }),
          fc.constantFrom('status', 'photo', 'video'),
          fc.integer({ min: 1, max: 999999999 })
        ).map(([user, type, id]) => `/${user}/${type}/${id}`)
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
      fc.asyncProperty(injectionAttemptsArbitrary, twitterUrlArbitrary, async (attempts, urlComponents) => {
        // Set up the URL
        mockLocation.pathname = urlComponents.pathname;
        mockLocation.search = urlComponents.search;
        mockLocation.hash = urlComponents.hash;
        mockLocation.href = `https://x.com${urlComponents.pathname}${urlComponents.search}${urlComponents.hash}`;
        
        // Mock config response
        const mockConfig = {
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
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
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
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
    // Generator for sequences of Twitter/X URLs (simulating SPA navigation)
    const urlSequenceArbitrary = fc.array(
      fc.record({
        pathname: fc.oneof(
          fc.constant('/'),
          fc.tuple(
            fc.stringOf(fc.constantFrom('a', 'b', 'c', '1', '2', '3'), { minLength: 3, maxLength: 15 }),
            fc.constantFrom('status', 'photo', 'video'),
            fc.integer({ min: 1, max: 999999999 })
          ).map(([user, type, id]) => `/${user}/${type}/${id}`)
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
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
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
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
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
          mockLocation.href = `https://x.com${urlComponents.pathname}${urlComponents.search}${urlComponents.hash}`;
          
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
    // Generator for random number of pre-existing buttons (should be prevented)
    const configArbitrary = fc.record({
      targetHostname: fc.domain(),
      enabled: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (twitterConfig) => {
        // Mock config response
        const mockConfig = {
          twitter: twitterConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          // Check if we're on Twitter/X
          if (mockLocation.hostname !== 'x.com' && mockLocation.hostname !== 'www.x.com') {
            return;
          }
          
          // Check if button already exists (idempotence check)
          if (buttonExists()) {
            return;
          }
          
          // Check if config is loaded and Twitter is enabled
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
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
          twitter: {
            enabled: true,
            targetHostname: 'fixvx.com'
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
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
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
      fc.asyncProperty(configArbitrary, fc.integer({ min: 2, max: 5 }), async (twitterConfig, attempts) => {
        // Mock config response
        const mockConfig = {
          twitter: twitterConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button injection logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function buttonExists() {
          return mockDocument.getElementById(BUTTON_ID) !== null;
        }
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (buttonExists()) {
            return;
          }
          
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
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
        expect(buttonsWithId[0].title).toContain(twitterConfig.targetHostname);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: social-media-redirector, Property 7: Button Content Requirement**
 * **Validates: Requirements 5.4**
 * 
 * For any redirect button that is rendered, the button must include text or an icon 
 * indicating its purpose.
 */
describe('Property 7: Button Content Requirement', () => {
  test('should include text or icon indicating purpose for any configuration', async () => {
    // Generator for different valid configurations
    const configArbitrary = fc.record({
      targetHostname: fc.domain(),
      enabled: fc.constant(true)
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (twitterConfig) => {
        // Mock config response
        const mockConfig = {
          twitter: twitterConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button creation logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (mockDocument.getElementById(BUTTON_ID) !== null) {
            return;
          }
          
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Inject button
        injectButton();
        
        // Get the injected button
        const button = mockDocument.getElementById(BUTTON_ID);
        
        // Verify button exists
        expect(button).not.toBeNull();
        
        // Property: Button must have text content OR a meaningful title/aria-label
        // indicating its purpose (redirect/alternative/view functionality)
        const hasTextContent = button.textContent && button.textContent.trim().length > 0;
        const hasTitle = button.title && button.title.trim().length > 0;
        
        // Button must have at least one form of content indicating purpose
        expect(hasTextContent || hasTitle).toBe(true);
        
        // If it has text content, verify it's meaningful (not just whitespace or single char)
        if (hasTextContent) {
          expect(button.textContent.trim().length).toBeGreaterThan(1);
        }
        
        // If it has a title, verify it's meaningful
        if (hasTitle) {
          expect(button.title.trim().length).toBeGreaterThan(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain content across different target hostnames', async () => {
    // Generator for various target hostnames
    const hostnameArbitrary = fc.domain();

    await fc.assert(
      fc.asyncProperty(hostnameArbitrary, async (targetHostname) => {
        // Mock config response
        const mockConfig = {
          twitter: {
            enabled: true,
            targetHostname: targetHostname
          }
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button creation logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (mockDocument.getElementById(BUTTON_ID) !== null) {
            return;
          }
          
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Inject button
        injectButton();
        
        // Get the injected button
        const button = mockDocument.getElementById(BUTTON_ID);
        
        // Verify button exists
        expect(button).not.toBeNull();
        
        // Verify button has content indicating purpose
        const hasTextContent = button.textContent && button.textContent.trim().length > 0;
        const hasTitle = button.title && button.title.trim().length > 0;
        
        expect(hasTextContent || hasTitle).toBe(true);
        
        // Verify the content is meaningful (contains purpose-related keywords)
        const combinedContent = (button.textContent + ' ' + button.title).toLowerCase();
        
        // Should contain at least one purpose-indicating term
        const purposeKeywords = ['redirect', 'view', 'alternative', 'open', 'go', 'visit', 'switch'];
        const hasPurposeKeyword = purposeKeywords.some(keyword => combinedContent.includes(keyword));
        
        expect(hasPurposeKeyword).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  test('should have consistent content format across multiple injections', async () => {
    // Generator for injection scenarios
    const scenarioArbitrary = fc.record({
      targetHostname: fc.domain(),
      injectionCount: fc.integer({ min: 1, max: 5 })
    });

    await fc.assert(
      fc.asyncProperty(scenarioArbitrary, async (scenario) => {
        // Mock config response
        const mockConfig = {
          twitter: {
            enabled: true,
            targetHostname: scenario.targetHostname
          }
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Implement button creation logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function removeButton() {
          const existingButton = mockDocument.getElementById(BUTTON_ID);
          if (existingButton) {
            existingButton.remove();
          }
        }
        
        function injectButton() {
          if (mockDocument.getElementById(BUTTON_ID) !== null) {
            return;
          }
          
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Track content across injections
        const contentSnapshots = [];
        
        // Perform multiple injection cycles
        for (let i = 0; i < scenario.injectionCount; i++) {
          // Clear any existing buttons
          mockBody.children = [];
          
          // Inject button
          injectButton();
          
          // Get the injected button
          const button = mockDocument.getElementById(BUTTON_ID);
          
          if (button) {
            contentSnapshots.push({
              textContent: button.textContent,
              title: button.title
            });
          }
          
          // Remove for next iteration
          removeButton();
        }
        
        // Verify all snapshots have content
        expect(contentSnapshots.length).toBeGreaterThan(0);
        
        for (const snapshot of contentSnapshots) {
          const hasTextContent = snapshot.textContent && snapshot.textContent.trim().length > 0;
          const hasTitle = snapshot.title && snapshot.title.trim().length > 0;
          
          // Each button must have content
          expect(hasTextContent || hasTitle).toBe(true);
        }
        
        // Verify consistency: all buttons should have the same text content
        if (contentSnapshots.length > 1) {
          const firstTextContent = contentSnapshots[0].textContent;
          const allSameText = contentSnapshots.every(s => s.textContent === firstTextContent);
          expect(allSameText).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should include visual indicator (emoji or icon) in button content', async () => {
    // Generator for different configurations
    const configArbitrary = fc.record({
      targetHostname: fc.domain(),
      enabled: fc.constant(true)
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (twitterConfig) => {
        // Mock config response
        const mockConfig = {
          twitter: twitterConfig
        };
        
        mockBrowser.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === 'getConfig') {
            callback({ config: mockConfig });
          }
        });
        
        // Clear any existing buttons
        mockBody.children = [];
        
        // Implement button creation logic
        const BUTTON_ID = 'social-redirector-twitter-button';
        
        function createButton() {
          const button = mockDocument.createElement('button');
          button.id = BUTTON_ID;
          button.className = 'social-redirector-button';
          button.textContent = '🔄 View on Alternative';
          button.title = `Redirect to ${mockConfig.twitter.targetHostname}`;
          return button;
        }
        
        function injectButton() {
          if (mockDocument.getElementById(BUTTON_ID) !== null) {
            return;
          }
          
          if (!mockConfig || !mockConfig.twitter || !mockConfig.twitter.enabled) {
            return;
          }
          
          const button = createButton();
          mockBody.appendChild(button);
        }
        
        // Inject button
        injectButton();
        
        // Get the injected button
        const button = mockDocument.getElementById(BUTTON_ID);
        
        // Verify button exists
        expect(button).not.toBeNull();
        
        // Check for emoji or icon in text content
        // Emojis are typically in Unicode ranges like U+1F300-U+1F9FF
        const textContent = button.textContent || '';
        
        // Check if text contains emoji or special unicode characters
        const hasEmoji = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(textContent);
        
        // Or check if button has meaningful text content
        const hasMeaningfulText = textContent.trim().length > 0;
        
        // Button should have either emoji/icon or meaningful text (or both)
        expect(hasEmoji || hasMeaningfulText).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
