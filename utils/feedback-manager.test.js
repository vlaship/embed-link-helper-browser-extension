/**
 * Property-Based Tests for Feedback Manager Module
 * Tests visual feedback display and management for share menu operations
 */

const fc = require('fast-check');
const {
  showSuccessFeedback,
  showErrorFeedback,
  hideFeedbackAfterDelay
} = require('./feedback-manager.js');

// Helper function to create mock menu item elements
function createMockMenuItem(platform, hasExistingFeedback = false) {
  const menuItem = document.createElement('div');
  menuItem.className = 'embed-link-menu-item';
  menuItem.textContent = 'Copy embed link';
  menuItem.setAttribute('role', 'menuitem');
  menuItem.setAttribute('data-platform', platform);
  
  if (hasExistingFeedback) {
    const feedback = document.createElement('span');
    feedback.className = 'embed-link-feedback';
    feedback.textContent = '✓ Copied!';
    menuItem.appendChild(feedback);
  }
  
  return menuItem;
}

// Helper to wait for async operations
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * **Feature: share-menu-integration, Property 4: Visual feedback on success**
 * **Validates: Requirements 1.5, 2.5, 5.1**
 * 
 * For any successful copy operation, the extension should display visual feedback
 * indicating success.
 */
describe('Property 4: Visual feedback on success', () => {
  beforeEach(() => {
    // Clear any existing feedback styles
    const existingStyles = document.getElementById('embed-link-feedback-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  });

  test('should display success feedback for any menu item on any platform', async () => {
    // Generator for platform
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Show success feedback
          showSuccessFeedback(menuItem, platform);
          
          // Verify feedback element was created
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.textContent).toContain('Copied');
          expect(feedbackElement.textContent).toContain('✓');
          
          // Verify feedback is visible (has display style)
          expect(feedbackElement.style.display).toBe('inline-block');
          
          // Verify feedback has color styling
          expect(feedbackElement.style.color).toBeTruthy();
          expect(feedbackElement.style.color.length).toBeGreaterThan(0);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should create feedback element if it does not exist', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Verify no feedback exists initially
          expect(menuItem.querySelector('.embed-link-feedback')).toBeNull();
          
          // Show success feedback
          showSuccessFeedback(menuItem, platform);
          
          // Verify feedback element was created
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.parentNode).toBe(menuItem);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should update existing feedback element if it already exists', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, true);
        document.body.appendChild(menuItem);
        
        try {
          const initialFeedback = menuItem.querySelector('.embed-link-feedback');
          const initialText = initialFeedback.textContent;
          
          // Show success feedback again
          showSuccessFeedback(menuItem, platform);
          
          // Verify same element was updated (not a new one created)
          const updatedFeedback = menuItem.querySelector('.embed-link-feedback');
          expect(updatedFeedback).toBe(initialFeedback);
          
          // Verify only one feedback element exists
          const allFeedback = menuItem.querySelectorAll('.embed-link-feedback');
          expect(allFeedback.length).toBe(1);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should apply platform-specific styling', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showSuccessFeedback(menuItem, platform);
          
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          const color = feedbackElement.style.color;
          
          // Verify color is set and platform-appropriate
          // Browsers convert hex to rgb format
          expect(color).toBeTruthy();
          if (platform === 'twitter') {
            // #00ba7c = rgb(0, 186, 124)
            expect(color).toMatch(/00ba7c|rgb\(0,\s*186,\s*124\)/i);
          } else if (platform === 'instagram') {
            // #0095f6 = rgb(0, 149, 246)
            expect(color).toMatch(/0095f6|rgb\(0,\s*149,\s*246\)/i);
          }
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should inject animation styles into document head', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showSuccessFeedback(menuItem, platform);
          
          // Verify styles were injected
          const styleElement = document.getElementById('embed-link-feedback-styles');
          expect(styleElement).not.toBeNull();
          expect(styleElement.textContent).toContain('fadeIn');
          expect(styleElement.textContent).toContain('fadeOut');
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle null menu item gracefully', () => {
    // Should not throw error
    expect(() => showSuccessFeedback(null, 'twitter')).not.toThrow();
    expect(() => showSuccessFeedback(null, 'instagram')).not.toThrow();
  });

  test('should handle undefined menu item gracefully', () => {
    // Should not throw error
    expect(() => showSuccessFeedback(undefined, 'twitter')).not.toThrow();
    expect(() => showSuccessFeedback(undefined, 'instagram')).not.toThrow();
  });
});

/**
 * **Feature: share-menu-integration, Property 13: Feedback auto-hide**
 * **Validates: Requirements 5.3**
 * 
 * For any success indicator displayed, it should automatically hide after 2 seconds.
 */
describe('Property 13: Feedback auto-hide', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    const existingStyles = document.getElementById('embed-link-feedback-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should hide feedback after specified delay', async () => {
    const configArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      delay: fc.integer({ min: 100, max: 5000 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const menuItem = createMockMenuItem(config.platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Show feedback
          showSuccessFeedback(menuItem, config.platform);
          
          // Verify feedback exists
          let feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          
          // Start hide timer
          const timeoutId = hideFeedbackAfterDelay(menuItem, config.delay);
          expect(timeoutId).not.toBeNull();
          
          // Fast-forward time
          jest.advanceTimersByTime(config.delay + 250);
          
          // Verify feedback was removed
          feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).toBeNull();
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should use default 2000ms delay when not specified', () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    fc.assert(
      fc.property(platformArbitrary, (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showSuccessFeedback(menuItem, platform);
          
          // Start hide timer with default delay
          const timeoutId = hideFeedbackAfterDelay(menuItem);
          expect(timeoutId).not.toBeNull();
          
          // Verify feedback still exists before delay
          let feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          
          // Fast-forward to just before 2000ms
          jest.advanceTimersByTime(1999);
          feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          
          // Fast-forward past 2000ms + animation time
          jest.advanceTimersByTime(250);
          feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).toBeNull();
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should return timeout ID for cancellation', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showSuccessFeedback(menuItem, platform);
          
          const timeoutId = hideFeedbackAfterDelay(menuItem, 2000);
          
          // Verify timeout ID is a number
          expect(typeof timeoutId).toBe('number');
          expect(timeoutId).toBeGreaterThan(0);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle null menu item gracefully', () => {
    const result = hideFeedbackAfterDelay(null, 2000);
    expect(result).toBeNull();
  });

  test('should handle undefined menu item gracefully', () => {
    const result = hideFeedbackAfterDelay(undefined, 2000);
    expect(result).toBeNull();
  });

  test('should apply fade-out animation before removing', () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    fc.assert(
      fc.property(platformArbitrary, (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showSuccessFeedback(menuItem, platform);
          hideFeedbackAfterDelay(menuItem, 1000);
          
          // Fast-forward to trigger fade-out
          jest.advanceTimersByTime(1000);
          
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          if (feedbackElement) {
            // Verify fade-out animation was applied
            expect(feedbackElement.style.animation).toContain('fadeOut');
          }
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: share-menu-integration, Property 12: Error feedback**
 * **Validates: Requirements 5.2**
 * 
 * For any failed copy operation, the extension should display an error message
 * to the user.
 */
describe('Property 12: Error feedback', () => {
  beforeEach(() => {
    const existingStyles = document.getElementById('embed-link-feedback-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  });

  test('should display error feedback for any menu item on any platform', async () => {
    const configArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      errorMessage: fc.string({ minLength: 1, maxLength: 50 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const menuItem = createMockMenuItem(config.platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Show error feedback
          showErrorFeedback(menuItem, config.errorMessage, config.platform);
          
          // Verify feedback element was created
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.textContent).toContain('✗');
          expect(feedbackElement.textContent).toContain(config.errorMessage);
          
          // Verify feedback is visible
          expect(feedbackElement.style.display).toBe('inline-block');
          
          // Verify error color styling
          expect(feedbackElement.style.color).toBeTruthy();
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should use default error message when message is empty', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Show error feedback with empty message
          showErrorFeedback(menuItem, '', platform);
          
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.textContent).toContain('Failed');
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should use default error message when message is null', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showErrorFeedback(menuItem, null, platform);
          
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.textContent).toContain('Failed');
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should apply platform-specific error styling', async () => {
    const platformArbitrary = fc.constantFrom('twitter', 'instagram');

    await fc.assert(
      fc.asyncProperty(platformArbitrary, async (platform) => {
        const menuItem = createMockMenuItem(platform, false);
        document.body.appendChild(menuItem);
        
        try {
          showErrorFeedback(menuItem, 'Test error', platform);
          
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          const color = feedbackElement.style.color;
          
          // Verify error color is set and platform-appropriate
          // Browsers convert hex to rgb format
          expect(color).toBeTruthy();
          if (platform === 'twitter') {
            // #f91880 = rgb(249, 24, 128)
            expect(color).toMatch(/f91880|rgb\(249,\s*24,\s*128\)/i);
          } else if (platform === 'instagram') {
            // #ed4956 = rgb(237, 73, 86)
            expect(color).toMatch(/ed4956|rgb\(237,\s*73,\s*86\)/i);
          }
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should create feedback element if it does not exist', async () => {
    const configArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      errorMessage: fc.string({ minLength: 1, maxLength: 30 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const menuItem = createMockMenuItem(config.platform, false);
        document.body.appendChild(menuItem);
        
        try {
          // Verify no feedback exists initially
          expect(menuItem.querySelector('.embed-link-feedback')).toBeNull();
          
          // Show error feedback
          showErrorFeedback(menuItem, config.errorMessage, config.platform);
          
          // Verify feedback element was created
          const feedbackElement = menuItem.querySelector('.embed-link-feedback');
          expect(feedbackElement).not.toBeNull();
          expect(feedbackElement.parentNode).toBe(menuItem);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should update existing feedback element', async () => {
    const configArbitrary = fc.record({
      platform: fc.constantFrom('twitter', 'instagram'),
      errorMessage: fc.string({ minLength: 1, maxLength: 30 })
    });

    await fc.assert(
      fc.asyncProperty(configArbitrary, async (config) => {
        const menuItem = createMockMenuItem(config.platform, true);
        document.body.appendChild(menuItem);
        
        try {
          const initialFeedback = menuItem.querySelector('.embed-link-feedback');
          
          // Show error feedback
          showErrorFeedback(menuItem, config.errorMessage, config.platform);
          
          // Verify same element was updated
          const updatedFeedback = menuItem.querySelector('.embed-link-feedback');
          expect(updatedFeedback).toBe(initialFeedback);
          
          // Verify only one feedback element exists
          const allFeedback = menuItem.querySelectorAll('.embed-link-feedback');
          expect(allFeedback.length).toBe(1);
        } finally {
          document.body.removeChild(menuItem);
        }
      }),
      { numRuns: 100 }
    );
  });

  test('should handle null menu item gracefully', () => {
    expect(() => showErrorFeedback(null, 'Error', 'twitter')).not.toThrow();
    expect(() => showErrorFeedback(null, 'Error', 'instagram')).not.toThrow();
  });

  test('should handle undefined menu item gracefully', () => {
    expect(() => showErrorFeedback(undefined, 'Error', 'twitter')).not.toThrow();
    expect(() => showErrorFeedback(undefined, 'Error', 'instagram')).not.toThrow();
  });
});

/**
 * Unit Tests for Feedback Manager Module
 * Tests specific examples and edge cases for visual feedback
 */

describe('Unit Tests: Feedback Manager', () => {
  beforeEach(() => {
    // Clear any existing feedback styles
    const existingStyles = document.getElementById('embed-link-feedback-styles');
    if (existingStyles) {
      existingStyles.remove();
    }
  });

  describe('showSuccessFeedback', () => {
    test('should display success feedback with checkmark and "Copied!" text', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).not.toBeNull();
        expect(feedbackElement.textContent).toBe('✓ Copied!');
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should apply green color for Twitter success feedback', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.style.color).toMatch(/00ba7c|rgb\(0,\s*186,\s*124\)/i);
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should apply blue color for Instagram success feedback', () => {
      const menuItem = createMockMenuItem('instagram', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'instagram');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.style.color).toMatch(/0095f6|rgb\(0,\s*149,\s*246\)/i);
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should not throw error when menu item is null', () => {
      expect(() => showSuccessFeedback(null, 'twitter')).not.toThrow();
    });

    test('should not throw error when menu item is undefined', () => {
      expect(() => showSuccessFeedback(undefined, 'twitter')).not.toThrow();
    });

    test('should inject animation styles only once', () => {
      const menuItem1 = createMockMenuItem('twitter', false);
      const menuItem2 = createMockMenuItem('instagram', false);
      document.body.appendChild(menuItem1);
      document.body.appendChild(menuItem2);
      
      try {
        showSuccessFeedback(menuItem1, 'twitter');
        showSuccessFeedback(menuItem2, 'instagram');
        
        const styleElements = document.querySelectorAll('#embed-link-feedback-styles');
        expect(styleElements.length).toBe(1);
      } finally {
        document.body.removeChild(menuItem1);
        document.body.removeChild(menuItem2);
      }
    });

    test('should reuse existing feedback element', () => {
      const menuItem = createMockMenuItem('twitter', true);
      document.body.appendChild(menuItem);
      
      try {
        const initialFeedback = menuItem.querySelector('.embed-link-feedback');
        
        showSuccessFeedback(menuItem, 'twitter');
        
        const updatedFeedback = menuItem.querySelector('.embed-link-feedback');
        expect(updatedFeedback).toBe(initialFeedback);
        
        const allFeedback = menuItem.querySelectorAll('.embed-link-feedback');
        expect(allFeedback.length).toBe(1);
      } finally {
        document.body.removeChild(menuItem);
      }
    });
  });

  describe('showErrorFeedback', () => {
    test('should display error feedback with X mark and error message', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showErrorFeedback(menuItem, 'Copy failed', 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).not.toBeNull();
        expect(feedbackElement.textContent).toBe('✗ Copy failed');
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should use default "Failed" message when message is empty', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showErrorFeedback(menuItem, '', 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.textContent).toBe('✗ Failed');
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should use default "Failed" message when message is null', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showErrorFeedback(menuItem, null, 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.textContent).toBe('✗ Failed');
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should apply pink/red color for Twitter error feedback', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showErrorFeedback(menuItem, 'Error', 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.style.color).toMatch(/f91880|rgb\(249,\s*24,\s*128\)/i);
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should apply red color for Instagram error feedback', () => {
      const menuItem = createMockMenuItem('instagram', false);
      document.body.appendChild(menuItem);
      
      try {
        showErrorFeedback(menuItem, 'Error', 'instagram');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement.style.color).toMatch(/ed4956|rgb\(237,\s*73,\s*86\)/i);
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should not throw error when menu item is null', () => {
      expect(() => showErrorFeedback(null, 'Error', 'twitter')).not.toThrow();
    });

    test('should not throw error when menu item is undefined', () => {
      expect(() => showErrorFeedback(undefined, 'Error', 'twitter')).not.toThrow();
    });
  });

  describe('hideFeedbackAfterDelay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should hide feedback after 2000ms by default', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        let feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).not.toBeNull();
        
        hideFeedbackAfterDelay(menuItem);
        
        // Fast-forward time
        jest.advanceTimersByTime(2250);
        
        feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).toBeNull();
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should hide feedback after custom delay', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        hideFeedbackAfterDelay(menuItem, 1000);
        
        // Fast-forward to just before delay
        jest.advanceTimersByTime(999);
        let feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).not.toBeNull();
        
        // Fast-forward past delay + animation
        jest.advanceTimersByTime(250);
        feedbackElement = menuItem.querySelector('.embed-link-feedback');
        expect(feedbackElement).toBeNull();
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should return timeout ID', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        const timeoutId = hideFeedbackAfterDelay(menuItem, 2000);
        
        expect(typeof timeoutId).toBe('number');
        expect(timeoutId).toBeGreaterThan(0);
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should return null when menu item is null', () => {
      const result = hideFeedbackAfterDelay(null, 2000);
      expect(result).toBeNull();
    });

    test('should return null when menu item is undefined', () => {
      const result = hideFeedbackAfterDelay(undefined, 2000);
      expect(result).toBeNull();
    });

    test('should apply fade-out animation before removing element', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        hideFeedbackAfterDelay(menuItem, 1000);
        
        // Fast-forward to trigger fade-out
        jest.advanceTimersByTime(1000);
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        if (feedbackElement) {
          expect(feedbackElement.style.animation).toContain('fadeOut');
        }
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should not throw error if feedback element is already removed', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        // Manually remove feedback element
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        feedbackElement.remove();
        
        // Should not throw when trying to hide
        hideFeedbackAfterDelay(menuItem, 100);
        
        expect(() => {
          jest.advanceTimersByTime(350);
        }).not.toThrow();
      } finally {
        document.body.removeChild(menuItem);
      }
    });
  });

  describe('Feedback positioning', () => {
    test('should not obstruct menu items - feedback is inline with margin', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        
        // Verify feedback is inline-block (doesn't take full width)
        expect(feedbackElement.style.display).toBe('inline-block');
        
        // Verify feedback has margin to separate from menu item text
        expect(feedbackElement.style.marginLeft).toBe('8px');
      } finally {
        document.body.removeChild(menuItem);
      }
    });

    test('should position feedback as child of menu item', () => {
      const menuItem = createMockMenuItem('twitter', false);
      document.body.appendChild(menuItem);
      
      try {
        showSuccessFeedback(menuItem, 'twitter');
        
        const feedbackElement = menuItem.querySelector('.embed-link-feedback');
        
        // Verify feedback is direct child of menu item
        expect(feedbackElement.parentNode).toBe(menuItem);
      } finally {
        document.body.removeChild(menuItem);
      }
    });
  });
});
