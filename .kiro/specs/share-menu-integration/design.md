# Design Document: Share Menu Integration

## Overview

This feature replaces the existing per-post button functionality in the Social Media Link Transformer Browser Extension with native share menu integration on Twitter/X and Instagram. The implementation will inject a "Copy embed link" menu item into the platforms' existing share interfaces, providing users with a more seamless and native experience.

The design leverages existing utilities for URL extraction and transformation while introducing new components for share menu detection, menu item injection, and visual feedback management. As part of this migration, the legacy per-post button code, related utilities, and CSS will be removed to simplify the codebase.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Content Scripts                           │
│  ┌──────────────────────┐  ┌──────────────────────────────┐│
│  │ twitter-share-menu.js│  │ instagram-share-menu.js      ││
│  │                      │  │                              ││
│  │ - Detect share menus │  │ - Detect share menus         ││
│  │ - Inject menu items  │  │ - Inject menu items          ││
│  │ - Handle clicks      │  │ - Handle clicks              ││
│  └──────────┬───────────┘  └──────────┬───────────────────┘│
│             │                         │                     │
│             └────────────┬────────────┘                     │
│                          │                                  │
└──────────────────────────┼──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Utility Modules                           │
│  ┌──────────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ share-menu-      │  │ share-menu-  │  │ feedback-     │ │
│  │ detector.js      │  │ injector.js  │  │ manager.js    │ │
│  │                  │  │              │  │               │ │
│  │ - Menu detection │  │ - Item       │  │ - Success     │ │
│  │ - MutationObs.   │  │   creation   │  │   indicators  │ │
│  │ - Post context   │  │ - Styling    │  │ - Error msgs  │ │
│  └──────────────────┘  └──────────────┘  └───────────────┘ │
│                                                              │
│  ┌──────────────────┐  ┌──────────────┐                    │
│  │ post-url-        │  │ url-         │                    │
│  │ extractor.js     │  │ transformer  │                    │
│  │ (existing)       │  │ .js          │                    │
│  │                  │  │ (existing)   │                    │
│  └──────────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Share Menu Detection**: MutationObserver watches for share menu appearance
2. **Context Extraction**: Identify the post associated with the share menu
3. **URL Extraction**: Extract post URL using existing utilities
4. **Menu Item Injection**: Create and inject "Copy embed link" menu item
5. **Click Handling**: Transform URL and copy to clipboard
6. **Visual Feedback**: Display success/error indicators

## Components and Interfaces

### 1. Share Menu Detector (`utils/share-menu-detector.js`)

Detects when share menus appear on the page and identifies the associated post.

```javascript
/**
 * Share Menu Detector Module
 * Detects share menu appearance and identifies associated posts
 */

// Platform-specific selectors for share menus
const SHARE_MENU_SELECTORS = {
  twitter: {
    // Share menu container
    menu: [
      'div[data-testid="Dropdown"]',
      'div[role="menu"]',
      'div[data-testid="sheetDialog"]'
    ],
    // Share button that triggers the menu
    trigger: [
      'button[data-testid="share"]',
      'div[data-testid="share"]'
    ],
    // Menu items within the share menu
    menuItems: [
      'div[role="menuitem"]',
      'a[role="menuitem"]'
    ]
  },
  instagram: {
    // Share menu container
    menu: [
      'div[role="dialog"]',
      'div[class*="Sheet"]'
    ],
    // Share button that triggers the menu
    trigger: [
      'button[aria-label*="Share"]',
      'svg[aria-label*="Share"]'
    ],
    // Menu items within the share menu
    menuItems: [
      'button',
      'a'
    ]
  }
};

/**
 * Detect share menu appearance
 * @param {string} platform - 'twitter' or 'instagram'
 * @param {Function} callback - Called when share menu is detected
 * @returns {MutationObserver} The observer instance
 */
function observeShareMenus(platform, callback);

/**
 * Find the post container associated with a share menu
 * @param {HTMLElement} menuElement - The share menu element
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The associated post container
 */
function findAssociatedPost(menuElement, platform);

/**
 * Check if an element is a share menu
 * @param {HTMLElement} element - Element to check
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if element is a share menu
 */
function isShareMenu(element, platform);
```

### 2. Share Menu Injector (`utils/share-menu-injector.js`)

Creates and injects menu items into share menus.

```javascript
/**
 * Share Menu Injector Module
 * Creates and injects custom menu items into share menus
 */

/**
 * Create a "Copy embed link" menu item
 * @param {string} postUrl - The post URL to transform
 * @param {string} targetHostname - Target hostname for transformation
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement} The created menu item element
 */
function createEmbedLinkMenuItem(postUrl, targetHostname, platform);

/**
 * Inject menu item into share menu
 * @param {HTMLElement} menuItem - The menu item to inject
 * @param {HTMLElement} menuContainer - The share menu container
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {boolean} True if injection was successful
 */
function injectMenuItem(menuItem, menuContainer, platform);

/**
 * Find the appropriate injection point within a share menu
 * @param {HTMLElement} menuContainer - The share menu container
 * @param {string} platform - 'twitter' or 'instagram'
 * @returns {HTMLElement|null} The injection point element
 */
function findMenuInjectionPoint(menuContainer, platform);

/**
 * Style menu item to match platform's native styling
 * @param {HTMLElement} menuItem - The menu item element
 * @param {string} platform - 'twitter' or 'instagram'
 */
function applyPlatformStyling(menuItem, platform);
```

### 3. Feedback Manager (`utils/feedback-manager.js`)

Manages visual feedback for copy operations.

```javascript
/**
 * Feedback Manager Module
 * Manages visual feedback for user actions
 */

/**
 * Show success feedback
 * @param {HTMLElement} menuItem - The menu item that was clicked
 * @param {string} platform - 'twitter' or 'instagram'
 */
function showSuccessFeedback(menuItem, platform);

/**
 * Show error feedback
 * @param {HTMLElement} menuItem - The menu item that was clicked
 * @param {string} message - Error message to display
 * @param {string} platform - 'twitter' or 'instagram'
 */
function showErrorFeedback(menuItem, message, platform);

/**
 * Hide feedback after delay
 * @param {HTMLElement} menuItem - The menu item element
 * @param {number} delay - Delay in milliseconds (default: 2000)
 */
function hideFeedbackAfterDelay(menuItem, delay);
```

### 4. Content Scripts

#### Twitter Share Menu Content Script (`content/twitter-share-menu.js`)

```javascript
/**
 * Twitter/X Share Menu Integration
 * Injects "Copy embed link" into native share menus
 */

// Initialize share menu observer
function init();

// Handle share menu detection
function handleShareMenuDetected(menuElement);

// Handle menu item click
function handleMenuItemClick(event, postUrl, targetHostname);

// Handle configuration updates
function handleConfigUpdate(newConfig);
```

#### Instagram Share Menu Content Script (`content/instagram-share-menu.js`)

```javascript
/**
 * Instagram Share Menu Integration
 * Injects "Copy embed link" into native share menus
 */

// Initialize share menu observer
function init();

// Handle share menu detection
function handleShareMenuDetected(menuElement);

// Handle menu item click
function handleMenuItemClick(event, postUrl, targetHostname);

// Handle configuration updates
function handleConfigUpdate(newConfig);
```

## Data Models

### Share Menu Context

```javascript
{
  menuElement: HTMLElement,      // The share menu container
  postElement: HTMLElement,      // Associated post container
  postUrl: string,               // Extracted post URL
  platform: string,              // 'twitter' or 'instagram'
  injectionPoint: HTMLElement    // Where to inject menu item
}
```

### Menu Item State

```javascript
{
  element: HTMLElement,          // The menu item element
  postUrl: string,               // Original post URL
  transformedUrl: string,        // Transformed URL
  isProcessed: boolean,          // Whether menu has been processed
  feedbackTimeout: number|null   // Timeout ID for feedback hiding
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following redundancies and consolidations:

**Redundant Properties:**
- Properties 1.1 and 2.1 (menu item injection for Twitter and Instagram) can be combined into a single property that applies to both platforms
- Properties 1.3 and 2.3 (URL transformation) can be combined - same behavior for both platforms
- Properties 1.4 and 2.4 (clipboard copy) can be combined - same behavior for both platforms
- Properties 1.5 and 2.5 (visual feedback) can be combined - same behavior for both platforms
- Properties 1.6 and 2.6 (consistency on reopen) can be combined - same behavior for both platforms
- Properties 4.1 and 4.2 (respecting disabled settings) can be combined into a single property

**Consolidated Properties:**
After consolidation, we have the following unique properties:
1. Menu item injection (covers 1.1, 2.1)
2. URL transformation on click (covers 1.3, 2.3)
3. Clipboard copy on click (covers 1.4, 2.4)
4. Visual feedback on success (covers 1.5, 2.5, 5.1)
5. Menu item consistency on reopen (covers 1.6, 2.6)
6. Dynamic content support (3.1)
7. Detection performance (3.2)
8. Multiple menu handling (3.3)
9. Graceful error handling (3.4)
10. Configuration respect (covers 4.1, 4.2)
11. Live configuration updates (covers 4.3, 4.4)
12. Error feedback (5.2)
13. Feedback auto-hide (5.3)
14. Feedback positioning (5.4)

### Correctness Properties

Property 1: Menu item injection
*For any* post on Twitter/X or Instagram, when the share menu is opened, the extension should inject a "Copy embed link" menu item into the share menu
**Validates: Requirements 1.1, 2.1**

Property 2: URL transformation on click
*For any* post URL and configured target hostname, when the "Copy embed link" menu item is clicked, the extension should transform the URL to use the target hostname while preserving the path, query parameters, and hash
**Validates: Requirements 1.3, 2.3**

Property 3: Clipboard copy on click
*For any* post, when the "Copy embed link" menu item is clicked, the transformed URL should be copied to the clipboard
**Validates: Requirements 1.4, 2.4**

Property 4: Visual feedback on success
*For any* successful copy operation, the extension should display visual feedback indicating success
**Validates: Requirements 1.5, 2.5, 5.1**

Property 5: Menu item consistency on reopen
*For any* post, closing and reopening the share menu should result in the "Copy embed link" menu item appearing again
**Validates: Requirements 1.6, 2.6**

Property 6: Dynamic content support
*For any* post loaded via infinite scroll or dynamic content loading, the share menu integration should work correctly
**Validates: Requirements 3.1**

Property 7: Detection performance
*For any* share menu that is opened, the extension should detect it and inject the menu item within 200ms
**Validates: Requirements 3.2**

Property 8: Multiple menu handling
*For any* sequence of share menu openings, each menu should be handled independently with its own correctly injected menu item
**Validates: Requirements 3.3**

Property 9: Graceful error handling
*For any* DOM structure changes or missing elements, the extension should handle errors gracefully without breaking functionality
**Validates: Requirements 3.4**

Property 10: Configuration respect
*For any* platform where redirect is disabled in configuration, the extension should not inject menu items into that platform's share menus
**Validates: Requirements 4.1, 4.2**

Property 11: Live configuration updates
*For any* configuration change (target hostname or enabled status), subsequent operations should use the updated configuration without requiring a page reload
**Validates: Requirements 4.3, 4.4**

Property 12: Error feedback
*For any* failed copy operation, the extension should display an error message to the user
**Validates: Requirements 5.2**

Property 13: Feedback auto-hide
*For any* success indicator displayed, it should automatically hide after 2 seconds
**Validates: Requirements 5.3**

Property 14: Feedback positioning
*For any* visual feedback shown, it should not obstruct other menu items or content
**Validates: Requirements 5.4**

## Error Handling

### Share Menu Detection Failures

**Scenario**: Share menu cannot be detected or selectors don't match
- **Handling**: Log warning and continue monitoring; use fallback selectors
- **User Impact**: Feature may not work until platform structure is updated
- **Recovery**: Graceful degradation - feature temporarily unavailable until selectors are updated

### URL Extraction Failures

**Scenario**: Cannot extract post URL from context
- **Handling**: Skip menu item injection for that specific menu
- **User Impact**: "Copy embed link" option not available for that post
- **Recovery**: User can manually copy URL from browser address bar

### Clipboard API Failures

**Scenario**: Clipboard write operation fails (permissions, browser restrictions)
- **Handling**: Display error feedback to user; attempt fallback methods
- **User Impact**: Copy operation fails; user sees error message
- **Recovery**: User can manually copy URL or use alternative methods

### Configuration Loading Failures

**Scenario**: Cannot load configuration from storage
- **Handling**: Use default configuration values
- **User Impact**: Feature uses default hostnames (fixvx.com, kkinstagram.com)
- **Recovery**: Configuration can be reloaded when available

### DOM Manipulation Failures

**Scenario**: Cannot inject menu item due to DOM structure changes
- **Handling**: Log error and skip injection for that menu
- **User Impact**: Feature not available for that specific share menu
- **Recovery**: Works for other menus; can be fixed with selector updates

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

1. **Share Menu Detection**
   - Test detection with valid share menu elements
   - Test detection with invalid/missing elements
   - Test detection with multiple menus simultaneously

2. **Menu Item Creation**
   - Test menu item creation with valid parameters
   - Test menu item creation with invalid URLs
   - Test menu item styling for each platform

3. **URL Transformation**
   - Test transformation with various URL formats
   - Test preservation of query parameters and hash
   - Test handling of invalid URLs

4. **Clipboard Operations**
   - Test successful clipboard write
   - Test clipboard write failures
   - Test clipboard API availability

5. **Visual Feedback**
   - Test success feedback display
   - Test error feedback display
   - Test feedback auto-hide timing
   - Test feedback positioning

6. **Configuration Handling**
   - Test configuration loading
   - Test configuration updates
   - Test disabled platform handling

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property-based testing library). Each test will run a minimum of 100 iterations.

1. **Property 1: Menu item injection**
   - Generate: Random post elements with share menus
   - Test: Menu item is injected for all valid share menus
   - **Feature: share-menu-integration, Property 1: Menu item injection**

2. **Property 2: URL transformation on click**
   - Generate: Random post URLs and target hostnames
   - Test: Transformed URL uses target hostname and preserves path/query/hash
   - **Feature: share-menu-integration, Property 2: URL transformation on click**

3. **Property 3: Clipboard copy on click**
   - Generate: Random posts with various URLs
   - Test: Clipboard contains transformed URL after click
   - **Feature: share-menu-integration, Property 3: Clipboard copy on click**

4. **Property 4: Visual feedback on success**
   - Generate: Random successful copy operations
   - Test: Feedback element is created and displayed
   - **Feature: share-menu-integration, Property 4: Visual feedback on success**

5. **Property 5: Menu item consistency on reopen**
   - Generate: Random posts and menu open/close sequences
   - Test: Menu item appears after close and reopen
   - **Feature: share-menu-integration, Property 5: Menu item consistency on reopen**

6. **Property 6: Dynamic content support**
   - Generate: Random posts loaded dynamically
   - Test: Share menu integration works for dynamically loaded posts
   - **Feature: share-menu-integration, Property 6: Dynamic content support**

7. **Property 7: Detection performance**
   - Generate: Random share menu openings
   - Test: Detection and injection completes within 200ms
   - **Feature: share-menu-integration, Property 7: Detection performance**

8. **Property 8: Multiple menu handling**
   - Generate: Random sequences of multiple menu openings
   - Test: Each menu has its own correctly injected item
   - **Feature: share-menu-integration, Property 8: Multiple menu handling**

9. **Property 9: Graceful error handling**
   - Generate: Random DOM structures with missing elements
   - Test: Extension doesn't crash and handles errors gracefully
   - **Feature: share-menu-integration, Property 9: Graceful error handling**

10. **Property 10: Configuration respect**
    - Generate: Random configurations with platforms disabled
    - Test: No menu items injected for disabled platforms
    - **Feature: share-menu-integration, Property 10: Configuration respect**

11. **Property 11: Live configuration updates**
    - Generate: Random configuration changes
    - Test: Subsequent operations use updated configuration
    - **Feature: share-menu-integration, Property 11: Live configuration updates**

12. **Property 12: Error feedback**
    - Generate: Random failed copy operations
    - Test: Error message is displayed
    - **Feature: share-menu-integration, Property 12: Error feedback**

13. **Property 13: Feedback auto-hide**
    - Generate: Random success indicators
    - Test: Feedback disappears after 2 seconds
    - **Feature: share-menu-integration, Property 13: Feedback auto-hide**

14. **Property 14: Feedback positioning**
    - Generate: Random feedback displays
    - Test: Feedback doesn't overlap with menu items
    - **Feature: share-menu-integration, Property 14: Feedback positioning**

### Integration Testing

Integration tests will verify the complete flow:

1. **End-to-End Share Menu Flow**
   - Open share menu on a post
   - Verify menu item appears
   - Click menu item
   - Verify URL is transformed and copied
   - Verify feedback is shown

2. **Configuration Integration**
   - Change configuration
   - Verify changes apply to new share menus
   - Verify disabled platforms don't get menu items

3. **Dynamic Content Integration**
   - Load new posts via scroll
   - Open share menus on new posts
   - Verify feature works correctly

### Testing Framework Configuration

- **Unit Testing**: Jest
- **Property-Based Testing**: fast-check (minimum 100 iterations per property)
- **Test Location**: Co-located with source files using `.test.js` suffix
- **Coverage Target**: 80% code coverage for new modules

## Implementation Notes

### Platform-Specific Considerations

#### Twitter/X
- Share menus appear as dropdown overlays
- Menu items are typically `div[role="menuitem"]` elements
- Menus can appear in different contexts (timeline, profile, detail view)
- Virtual scrolling may cause menus to be recreated

#### Instagram
- Share menus appear as bottom sheets on mobile-style layout
- Menu items are typically button elements
- Menus have different structures for posts vs. stories
- May need to handle both desktop and mobile layouts

### Performance Considerations

1. **MutationObserver Throttling**: Throttle observer callbacks to avoid excessive processing
2. **Selector Caching**: Cache selector results to reduce DOM queries
3. **Event Delegation**: Use event delegation for click handlers when possible
4. **Lazy Initialization**: Only initialize observers when on relevant pages

### Browser Compatibility

- **Clipboard API**: Use modern Clipboard API with fallback to `document.execCommand`
- **MutationObserver**: Supported in all modern browsers
- **CSS**: Use platform-specific styling that matches native elements
- **Manifest V3**: Ensure compatibility with Chrome's Manifest V3 requirements

### Maintenance Considerations

1. **Selector Documentation**: Document all selectors with screenshots and update dates
2. **Fallback Selectors**: Maintain multiple selector strategies for resilience
3. **Logging**: Comprehensive logging for debugging platform changes
4. **Version Detection**: Consider detecting platform version changes
5. **Graceful Degradation**: Fail gracefully when selectors don't match

### Migration from Per-Post Buttons

#### Files to Remove
- `content/twitter-content.js` - Legacy Twitter per-post button injection
- `content/instagram-content.js` - Legacy Instagram per-post button injection
- `utils/per-post-button.js` - Per-post button creation utility
- `utils/button-injector.js` - Button injection logic
- `utils/post-registry.js` - Post tracking and deduplication
- `utils/post-processor.js` - Post processing utility
- `utils/button-styles.css` - Button-specific styling

#### Files to Keep and Reuse
- `utils/post-detector.js` - Still needed for finding posts associated with share menus
- `utils/post-url-extractor.js` - Still needed for extracting URLs from posts
- `utils/url-transformer.js` - Still needed for URL transformation
- `utils/dom-utils.js` - General DOM utilities still useful
- `config/config.js` - Configuration management
- `background/background.js` - Background script for config management

#### Manifest Updates
- Remove references to deleted content scripts
- Remove references to deleted CSS files
- Update content script declarations to use new share menu scripts
- Ensure all necessary permissions remain (storage, activeTab, clipboardWrite)
