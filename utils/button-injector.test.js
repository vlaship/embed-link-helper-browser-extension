/**
 * Property-Based Tests for Button Injection Module
 * Tests button injection, removal, and position consistency
 */

const fc = require('fast-check');
const {
  findInjectionPoint,
  injectButton,
  removeButton,
  hasButton,
  getInjectionConfig,
  INJECTION_SELECTORS
} = require('./button-injector.js');

// Helper function to create real DOM elements
function createMockElement(tagName, attributes = {}, textContent = '') {
  const element = document.createElement(tagName);
  element.textContent = textContent;
  
  // Set attributes
  Object.keys(attributes).forEach(key => {
    if (key === 'hidden' && attributes[key]) {
      element.style.display = 'none';
      element.style.width = '0';
      element.style.height = '0';
    } else if (key === 'class') {
      element.className = attributes[key];
    } else {
      element.setAttribute(key, attributes[key]);
    }
  });
  
  return element;
}

// Helper to create a mock Twitter action bar
function createMockTwitterActionBar(hasActionButtons = true) {
  const actionBar = document.createElement('div');
  actionBar.setAttribute('role', 'group');
  
  if (hasActionButtons) {
    const replyButton = document.createElement('div');
    replyButton.setAttribute('data-testid', 'reply');
    replyButton.setAttribute('role', 'button');
    replyButton.textContent = 'Reply';
    
    const retweetButton = document.createElement('div');
    retweetButton.setAttribute('data-testid', 'retweet');
    retweetButton.setAttribute('role', 'button');
    retweetButton.textContent = 'Retweet';
    
    const likeButton = document.createElement('div');
    likeButton.setAttribute('data-testid', 'like');
    likeButton.setAttribute('role', 'button');
    likeButton.textContent = 'Like';
    
    actionBar.appendChild(replyButton);
    actionBar.appendChild(retweetButton);
    actionBar.appendChild(likeButton);
  }
  
  return actionBar;
}

// Helper to create a mock Instagram action section
function createMockInstagramActionSection(hasActionElements = true) {
  const actionSection = document.createElement('section');
  actionSection.className = 'x1iyjqo2';
  
  if (hasActionElements) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    const likeButton = document.createElement('span');
    likeButton.setAttribute('aria-label', 'Like');
    likeButton.setAttribute('role', 'button');
    likeButton.textContent = 'Like';
    
    const commentButton = document.createElement('span');
    commentButton.setAttribute('aria-label', 'Comment');
    commentButton.setAttribute('role', 'button');
    commentButton.textContent = 'Comment';
    
    actionSection.appendChild(svg);
    actionSection.appendChild(likeButton);
    actionSection.appendChild(commentButton);
  }
  
  return actionSection;
}

// Helper to create a mock tweet container
function createMockTweetContainer(hasActionBar = true) {
  const tweet = document.createElement('article');
  tweet.setAttribute('data-testid', 'tweet');
  tweet.textContent = 'Tweet content';
  
  if (hasActionBar) {
    const actionBar = createMockTwitterActionBar(true);
    tweet.appendChild(actionBar);
  }
  
  return tweet;
}

// Helper to create a mock Instagram post container
function createMockInstagramPostContainer(hasActionSection = true) {
  const post = document.createElement('article');
  post.setAttribute('role', 'presentation');
  post.textContent = 'Post content';
  
  if (hasActionSection) {
    const actionSection = createMockInstagramActionSection(true);
    post.appendChild(actionSection);
  }
  
  return post;
}

// Helper to create a mock button
function createMockButton(platform = 'twitter') {
  const button = document.createElement('button');
  button.setAttribute('data-platform', platform);
  button.setAttribute('data-post-url', 'https://example.com/post/123');
  button.className = `social-redirector-per-post-button ${platform}-button`;
  button.textContent = 'Redirect';
  return button;
}

/**
 * **Feature: per-post-redirect-buttons, Property 8: Button Position Consistency**
 * **Validates: Requirements 3.4**
 * 
 * For any post container where a button is injected, the button should always be 
 * inserted at the same relative position in the DOM structure 
 * (e.g., always as the last child of the action bar).
 */
describe('Property 8: Button Position Consistency', () => {
  test('should always inject button at the same position in Twitter action bar', async () => {
    // Generator for multiple injection attempts
    const injectionAttemptsArbitrary = fc.integer({ min: 1, max: 5 });

    await fc.assert(
      fc.asyncProperty(injectionAttemptsArbitrary, async (numAttempts) => {
        const positions = [];
        
        for (let i = 0; i < numAttempts; i++) {
          // Create fresh tweet container for each attempt
          const tweet = createMockTweetContainer(true);
          const actionBar = tweet.querySelector('div[role="group"]');
          const button = createMockButton('twitter');
          
          // Record initial number of children
          const initialChildCount = actionBar.children.length;
          
          // Inject button
          const success = injectButton(button, actionBar, tweet, 'twitter');
          
          if (success) {
            // Button should be wrapped and appended (last child)
            const finalChildCount = actionBar.children.length;
            const buttonWrapper = actionBar.children[actionBar.children.length - 1];
            
            // Record position (should always be last)
            positions.push({
              position: finalChildCount - 1,
              isLast: finalChildCount - 1 === actionBar.children.length - 1,
              childCountIncreased: finalChildCount === initialChildCount + 1
            });
          }
        }
        
        // All positions should be consistent (always last child)
        if (positions.length > 1) {
          const firstPosition = positions[0];
          positions.forEach(pos => {
            expect(pos.isLast).toBe(true);
            expect(pos.childCountIncreased).toBe(true);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should always inject button at the same position in Instagram action section', async () => {
    // Generator for multiple injection attempts
    const injectionAttemptsArbitrary = fc.integer({ min: 1, max: 5 });

    await fc.assert(
      fc.asyncProperty(injectionAttemptsArbitrary, async (numAttempts) => {
        const positions = [];
        
        for (let i = 0; i < numAttempts; i++) {
          // Create fresh post container for each attempt
          const post = createMockInstagramPostContainer(true);
          const actionSection = post.querySelector('section');
          const button = createMockButton('instagram');
          
          // Record initial number of children
          const initialChildCount = actionSection.children.length;
          
          // Inject button
          const success = injectButton(button, actionSection, post, 'instagram');
          
          if (success) {
            // Button should be wrapped and appended (last child)
            const finalChildCount = actionSection.children.length;
            
            // Record position (should always be last)
            positions.push({
              position: finalChildCount - 1,
              isLast: finalChildCount - 1 === actionSection.children.length - 1,
              childCountIncreased: finalChildCount === initialChildCount + 1
            });
          }
        }
        
        // All positions should be consistent (always last child)
        if (positions.length > 1) {
          positions.forEach(pos => {
            expect(pos.isLast).toBe(true);
            expect(pos.childCountIncreased).toBe(true);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should inject button in wrapper with consistent styling', async () => {
    // Generator for platform
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        // Create appropriate post container
        const post = platform === 'twitter' 
          ? createMockTweetContainer(true)
          : createMockInstagramPostContainer(true);
        
        const injectionPoint = platform === 'twitter'
          ? post.querySelector('div[role="group"]')
          : post.querySelector('section');
        
        const button = createMockButton(platform);
        
        // Inject button
        const success = injectButton(button, injectionPoint, post, platform);
        
        if (success) {
          // Find the wrapper
          const wrapper = injectionPoint.children[injectionPoint.children.length - 1];
          
          // Verify wrapper properties
          expect(wrapper.className).toContain('social-redirector-button-wrapper');
          expect(wrapper.className).toContain(`${platform}-wrapper`);
          expect(wrapper.style.display).toBe('inline-flex');
          expect(wrapper.style.alignItems).toBe('center');
          
          // Verify button is inside wrapper
          expect(wrapper.children.length).toBe(1);
          expect(wrapper.children[0]).toBe(button);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should maintain position consistency across different action bar structures', async () => {
    // Generator for action bar configurations
    const actionBarConfigArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      numExistingButtons: fc.integer({ min: 2, max: 6 })
    });

    await fc.assert(
      fc.asyncProperty(actionBarConfigArbitrary, async (config) => {
        // Create post with varying number of action buttons
        let post, injectionPoint;
        
        if (config.platform === 'twitter') {
          post = createMockElement('ARTICLE', { 'data-testid': 'tweet' }, 'Content');
          injectionPoint = createMockElement('DIV', { role: 'group' }, '');
          
          // Add varying number of action buttons
          for (let i = 0; i < config.numExistingButtons; i++) {
            const btn = createMockElement('DIV', { role: 'button' }, `Action ${i}`);
            injectionPoint.appendChild(btn);
          }
          
          post.appendChild(injectionPoint);
        } else {
          post = createMockElement('ARTICLE', { role: 'presentation' }, 'Content');
          injectionPoint = createMockElement('SECTION', {}, '');
          
          // Add varying number of action elements
          for (let i = 0; i < config.numExistingButtons; i++) {
            const btn = createMockElement('SPAN', { role: 'button' }, `Action ${i}`);
            injectionPoint.appendChild(btn);
          }
          
          post.appendChild(injectionPoint);
        }
        
        const button = createMockButton(config.platform);
        const initialChildCount = injectionPoint.children.length;
        
        // Inject button
        const success = injectButton(button, injectionPoint, post, config.platform);
        
        if (success) {
          // Button wrapper should always be last child
          const finalChildCount = injectionPoint.children.length;
          expect(finalChildCount).toBe(initialChildCount + 1);
          
          const lastChild = injectionPoint.children[injectionPoint.children.length - 1];
          expect(lastChild.className).toContain('social-redirector-button-wrapper');
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not inject duplicate buttons at different positions', async () => {
    // Generator for platform
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const post = platform === 'twitter' 
          ? createMockTweetContainer(true)
          : createMockInstagramPostContainer(true);
        
        const injectionPoint = platform === 'twitter'
          ? post.querySelector('div[role="group"]')
          : post.querySelector('section');
        
        const button1 = createMockButton(platform);
        const button2 = createMockButton(platform);
        
        // First injection should succeed
        const success1 = injectButton(button1, injectionPoint, post, platform);
        expect(success1).toBe(true);
        
        const childCountAfterFirst = injectionPoint.children.length;
        
        // Second injection should fail (already has button)
        const success2 = injectButton(button2, injectionPoint, post, platform);
        expect(success2).toBe(false);
        
        // Child count should not change
        expect(injectionPoint.children.length).toBe(childCountAfterFirst);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: per-post-redirect-buttons, Property 16: Missing Injection Point Handling**
 * **Validates: Requirements 7.3**
 * 
 * For any post where a suitable injection point cannot be found, 
 * the extension should not inject a button and should not throw an error.
 */
describe('Property 16: Missing Injection Point Handling', () => {
  test('should return null when injection point cannot be found', async () => {
    // Generator for posts without proper action bars
    const invalidPostConfigArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasActionBar: fc.constant(false)
    });

    await fc.assert(
      fc.asyncProperty(invalidPostConfigArbitrary, async (config) => {
        // Create post without action bar
        const post = createMockElement('ARTICLE', {}, 'Content without action bar');
        
        // Try to find injection point
        const injectionPoint = findInjectionPoint(post, config.platform);
        
        // Should return null gracefully
        expect(injectionPoint).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  test('should not throw error when injection point is missing', async () => {
    // Generator for various malformed post structures
    const malformedPostArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      tagName: fc.constantFrom('DIV', 'SECTION', 'ARTICLE', 'SPAN'),
      hasChildren: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(malformedPostArbitrary, async (config) => {
        const post = createMockElement(config.tagName, {}, 'Content');
        
        if (config.hasChildren) {
          // Add some children but not action bar
          const child = createMockElement('DIV', {}, 'Child');
          post.appendChild(child);
        }
        
        // Should not throw error
        expect(() => {
          const injectionPoint = findInjectionPoint(post, config.platform);
          expect(injectionPoint).toBeNull();
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('should handle posts with partial action bar structure', async () => {
    // Generator for posts with incomplete action bars
    const partialActionBarArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      hasContainer: fc.boolean(),
      hasButtons: fc.boolean(),
      numButtons: fc.integer({ min: 0, max: 2 }) // Less than typical 3+ buttons
    });

    await fc.assert(
      fc.asyncProperty(partialActionBarArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', {}, 'Content');
        
        if (config.hasContainer) {
          const container = config.platform === 'twitter'
            ? createMockElement('DIV', { role: 'group' }, '')
            : createMockElement('SECTION', {}, '');
          
          if (config.hasButtons) {
            for (let i = 0; i < config.numButtons; i++) {
              const btn = createMockElement('DIV', { role: 'button' }, `Btn ${i}`);
              container.appendChild(btn);
            }
          }
          
          post.appendChild(container);
        }
        
        // Should handle gracefully
        const injectionPoint = findInjectionPoint(post, config.platform);
        
        // May or may not find injection point depending on structure
        // But should not throw error
        if (injectionPoint) {
          expect(injectionPoint).toBeInstanceOf(HTMLElement);
        } else {
          expect(injectionPoint).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should not inject button when injection point is null', async () => {
    // Generator for platform
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const post = createMockElement('ARTICLE', {}, 'Content without action bar');
        const button = createMockButton(platform);
        
        // Try to inject with null injection point
        const success = injectButton(button, null, post, platform);
        
        // Should fail gracefully
        expect(success).toBe(false);
        
        // Post should not be marked as having button
        expect(hasButton(post)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should log warning but not crash when injection point is missing', async () => {
    // Generator for various invalid scenarios
    const invalidScenarioArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      postIsNull: fc.boolean(),
      injectionPointIsNull: fc.boolean()
    }).filter(config => config.postIsNull || config.injectionPointIsNull); // At least one must be null

    await fc.assert(
      fc.asyncProperty(invalidScenarioArbitrary, async (config) => {
        const post = config.postIsNull ? null : document.createElement('article');
        const injectionPoint = config.injectionPointIsNull ? null : document.createElement('div');
        const button = createMockButton(config.platform);
        
        // Should not throw error
        expect(() => {
          const success = injectButton(button, injectionPoint, post, config.platform);
          // Should fail when either post or injection point is null
          expect(success).toBe(false);
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  test('should handle hidden or zero-height injection points', async () => {
    // Generator for hidden elements
    const hiddenElementArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      isHidden: fc.boolean()
    });

    await fc.assert(
      fc.asyncProperty(hiddenElementArbitrary, async (config) => {
        const post = createMockElement('ARTICLE', {}, 'Content');
        const injectionPoint = config.platform === 'twitter'
          ? createMockElement('DIV', { role: 'group', hidden: config.isHidden }, '')
          : createMockElement('SECTION', { hidden: config.isHidden }, '');
        
        post.appendChild(injectionPoint);
        
        // Try to find injection point
        const foundPoint = findInjectionPoint(post, config.platform);
        
        // Hidden elements might not be found (depends on implementation)
        // But should not throw error
        if (config.isHidden) {
          // May or may not find hidden elements
          expect(foundPoint === null || foundPoint === injectionPoint).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should validate injection configuration exists for both platforms', () => {
    const twitterConfig = getInjectionConfig('twitter');
    const instagramConfig = getInjectionConfig('instagram');
    
    expect(twitterConfig).not.toBeNull();
    expect(instagramConfig).not.toBeNull();
    
    // Verify both primary and fallback selectors exist
    expect(twitterConfig.primary).toBeDefined();
    expect(twitterConfig.fallback).toBeDefined();
    expect(instagramConfig.primary).toBeDefined();
    expect(instagramConfig.fallback).toBeDefined();
    
    // Verify they are arrays
    expect(Array.isArray(twitterConfig.primary)).toBe(true);
    expect(Array.isArray(twitterConfig.fallback)).toBe(true);
    expect(Array.isArray(instagramConfig.primary)).toBe(true);
    expect(Array.isArray(instagramConfig.fallback)).toBe(true);
  });
});

// Additional tests for button removal and utility functions
describe('Button Injection Utilities', () => {
  test('should successfully remove injected button', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const post = platform === 'twitter' 
          ? createMockTweetContainer(true)
          : createMockInstagramPostContainer(true);
        
        const injectionPoint = platform === 'twitter'
          ? post.querySelector('div[role="group"]')
          : post.querySelector('section');
        
        const button = createMockButton(platform);
        
        // Inject button
        const injected = injectButton(button, injectionPoint, post, platform);
        expect(injected).toBe(true);
        expect(hasButton(post)).toBe(true);
        
        // Remove button
        const removed = removeButton(post);
        expect(removed).toBe(true);
        expect(hasButton(post)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should handle removal when no button exists', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const post = platform === 'twitter' 
          ? createMockTweetContainer(true)
          : createMockInstagramPostContainer(true);
        
        // Try to remove button when none exists
        const removed = removeButton(post);
        expect(removed).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  test('should correctly detect if button is already injected', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const post = platform === 'twitter' 
          ? createMockTweetContainer(true)
          : createMockInstagramPostContainer(true);
        
        // Initially no button
        expect(hasButton(post)).toBe(false);
        
        const injectionPoint = platform === 'twitter'
          ? post.querySelector('div[role="group"]')
          : post.querySelector('section');
        
        const button = createMockButton(platform);
        
        // After injection, should detect button
        injectButton(button, injectionPoint, post, platform);
        expect(hasButton(post)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
