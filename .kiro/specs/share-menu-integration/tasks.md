# Implementation Plan

- [x] 1. Create share menu detection utility





- [x] 1.1 Implement share-menu-detector.js with platform-specific selectors


  - Create module with SHARE_MENU_SELECTORS configuration for Twitter and Instagram
  - Implement observeShareMenus() function with MutationObserver
  - Implement findAssociatedPost() to link menus to posts
  - Implement isShareMenu() validation function
  - _Requirements: 1.1, 2.1, 3.2, 6.1, 6.2_

- [x] 1.2 Write property test for share menu detection


  - **Property 1: Menu item injection**
  - **Validates: Requirements 1.1, 2.1**

- [x] 1.3 Write unit tests for share menu detector


  - Test detection with valid share menu elements
  - Test detection with invalid/missing elements
  - Test findAssociatedPost() with various DOM structures
  - _Requirements: 1.1, 2.1, 3.4_

- [x] 2. Create share menu injection utility







- [x] 2.1 Implement share-menu-injector.js for menu item creation

  - Create createEmbedLinkMenuItem() function
  - Implement injectMenuItem() with platform-specific logic
  - Implement findMenuInjectionPoint() for both platforms
  - Implement applyPlatformStyling() for native appearance
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 6.1_



- [x] 2.2 Write property test for URL transformation

  - **Property 2: URL transformation on click**
  - **Validates: Requirements 1.3, 2.3**


- [x] 2.3 Write property test for clipboard copy

  - **Property 3: Clipboard copy on click**
  - **Validates: Requirements 1.4, 2.4**


- [x] 2.4 Write unit tests for menu injector

  - Test menu item creation with valid parameters
  - Test menu item creation with invalid URLs
  - Test injection point finding for both platforms
  - Test platform-specific styling application
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 3. Create feedback manager utility






- [x] 3.1 Implement feedback-manager.js for visual feedback

  - Create showSuccessFeedback() function
  - Create showErrorFeedback() function
  - Implement hideFeedbackAfterDelay() with 2-second timeout
  - Ensure feedback doesn't obstruct menu items
  - _Requirements: 1.5, 2.5, 5.1, 5.2, 5.3, 5.4_


- [x] 3.2 Write property test for visual feedback

  - **Property 4: Visual feedback on success**
  - **Validates: Requirements 1.5, 2.5, 5.1**

- [x] 3.3 Write property test for feedback auto-hide

  - **Property 13: Feedback auto-hide**
  - **Validates: Requirements 5.3**


- [x] 3.4 Write property test for error feedback

  - **Property 12: Error feedback**
  - **Validates: Requirements 5.2**

- [x] 3.5 Write unit tests for feedback manager


  - Test success feedback display
  - Test error feedback display
  - Test feedback auto-hide timing
  - Test feedback positioning
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4. Implement Twitter share menu content script





- [x] 4.1 Create twitter-share-menu.js content script

  - Initialize share menu observer using share-menu-detector
  - Implement handleShareMenuDetected() to process detected menus
  - Implement handleMenuItemClick() for copy operations
  - Implement handleConfigUpdate() for live config changes
  - Add clipboard write with error handling
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 4.1, 4.3, 4.4_

- [x] 4.2 Write property test for menu consistency on reopen


  - **Property 5: Menu item consistency on reopen**
  - **Validates: Requirements 1.6, 2.6**

- [x] 4.3 Write property test for configuration respect

  - **Property 10: Configuration respect**
  - **Validates: Requirements 4.1, 4.2**

- [x] 4.4 Write property test for live configuration updates


  - **Property 11: Live configuration updates**
  - **Validates: Requirements 4.3, 4.4**

- [x] 5. Implement Instagram share menu content script





- [x] 5.1 Create instagram-share-menu.js content script


  - Initialize share menu observer using share-menu-detector
  - Implement handleShareMenuDetected() to process detected menus
  - Implement handleMenuItemClick() for copy operations
  - Implement handleConfigUpdate() for live config changes
  - Add clipboard write with error handling
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 4.2, 4.3, 4.4_

- [x] 5.2 Write property test for dynamic content support


  - **Property 6: Dynamic content support**
  - **Validates: Requirements 3.1**

- [x] 5.3 Write property test for detection performance


  - **Property 7: Detection performance**
  - **Validates: Requirements 3.2**

- [x] 5.4 Write property test for multiple menu handling

  - **Property 8: Multiple menu handling**
  - **Validates: Requirements 3.3**

- [x] 5.5 Write property test for graceful error handling

  - **Property 9: Graceful error handling**
  - **Validates: Requirements 3.4**

- [x] 6. Update manifest and remove legacy code





- [x] 6.1 Update manifest.json to use new content scripts


  - Remove references to twitter-content.js and instagram-content.js
  - Add references to twitter-share-menu.js and instagram-share-menu.js
  - Remove references to button-styles.css
  - Update content script file lists to include new utilities
  - Verify all permissions are still present (storage, activeTab, clipboardWrite)
  - _Requirements: 7.4_

- [x] 6.2 Delete legacy per-post button files


  - Delete content/twitter-content.js
  - Delete content/instagram-content.js
  - Delete utils/per-post-button.js
  - Delete utils/button-injector.js
  - Delete utils/post-registry.js
  - Delete utils/post-processor.js (if exists)
  - Delete utils/button-styles.css
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 6.3 Clean up unused test files


  - Delete content/twitter-content.test.js
  - Delete content/instagram-content.test.js
  - Delete utils/per-post-button.test.js
  - Delete utils/button-injector.test.js
  - Delete utils/post-registry.test.js
  - Delete utils/post-processor.test.js (if exists)
  - _Requirements: 7.5_

- [x] 6.4 Update package.json and documentation


  - Update README.md to reflect share menu integration approach
  - Remove references to per-post buttons from documentation
  - Update feature descriptions and screenshots if needed
  - _Requirements: 7.5_

- [x] 7. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Integration testing





- [x] 8.1 Write end-to-end integration tests

  - Test complete share menu flow for Twitter
  - Test complete share menu flow for Instagram
  - Test configuration integration
  - Test dynamic content integration
  - _Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.4, 4.1-4.4_

- [x] 9. Final verification and cleanup




- [x] 9.1 Verify no orphaned code remains


  - Search for references to deleted files
  - Verify no unused imports or dependencies
  - Check for any remaining button-related CSS
  - _Requirements: 7.5_

- [x] 9.2 Test extension in both browsers


  - Load extension in Chrome and verify functionality
  - Load extension in Firefox and verify functionality
  - Test on both Twitter/X and Instagram
  - Verify configuration changes work correctly
  - _Requirements: All_

- [x] 10. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
