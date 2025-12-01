# Implementation Plan

- [x] 1. Create shared post detection utilities





  - Create `utils/post-detector.js` module with platform-specific selectors
  - Implement `findPostContainers()` function with primary and fallback selectors
  - Implement `isPostContainer()` validation function
  - Add selector configuration for Twitter/X and Instagram
  - _Requirements: 8.3_

- [x] 1.1 Write property test for post detection


  - **Property 1: Button Injection Completeness (Twitter)**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for Instagram post detection


  - **Property 2: Button Injection Completeness (Instagram)**
  - **Validates: Requirements 2.1**

- [x] 1.3 Write property test for fallback selectors


  - **Property 17: Fallback Selector Robustness**
  - **Validates: Requirements 7.4**

- [x] 2. Implement URL extraction module





  - Create `utils/post-url-extractor.js` module
  - Implement `extractTweetUrl()` for Twitter/X posts
  - Implement `extractInstagramPostUrl()` for Instagram posts
  - Implement `validatePostUrl()` for URL validation
  - Handle retweets and shared posts
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 2.1 Write property test for Twitter URL extraction


  - **Property 4: URL Extraction Correctness (Twitter)**
  - **Validates: Requirements 4.1**

- [x] 2.2 Write property test for Instagram URL extraction

  - **Property 5: URL Extraction Correctness (Instagram)**
  - **Validates: Requirements 4.2**

- [x] 2.3 Write property test for retweet URL extraction

  - **Property 7: Retweet URL Extraction**
  - **Validates: Requirements 4.5**

- [x] 2.4 Write property test for invalid URL handling

  - **Property 6: No Button on Invalid URL**
  - **Validates: Requirements 4.3**

- [x] 2.5 Write property test for malformed URL error handling

  - **Property 15: Invalid URL Handling**
  - **Validates: Requirements 7.2**

- [-] 3. Create per-post button component



  - Create `utils/per-post-button.js` module
  - Implement `createPerPostButton()` function
  - Add platform-specific styling (Twitter/X and Instagram)
  - Implement button click handler for per-post redirects
  - Add icon/text content to indicate redirect purpose
  - _Requirements: 3.5, 1.2, 2.2_

- [x] 3.1 Write property test for button content requirement


  - **Property 9: Button Content Requirement**
  - **Validates: Requirements 3.5**

- [x] 4. Implement button injection logic





  - Create `utils/button-injector.js` module
  - Implement `findInjectionPoint()` for action bar detection
  - Implement `injectButton()` with position consistency
  - Implement `removeButton()` for cleanup
  - Handle missing injection points gracefully
  - _Requirements: 3.4, 7.3_

- [x] 4.1 Write property test for button position consistency


  - **Property 8: Button Position Consistency**
  - **Validates: Requirements 3.4**

- [x] 4.2 Write property test for missing injection point handling

  - **Property 16: Missing Injection Point Handling**
  - **Validates: Requirements 7.3**

- [x] 5. Create button registry system





  - Create `utils/post-registry.js` module
  - Implement `markPostProcessed()` function
  - Implement `isPostProcessed()` check function
  - Implement `clearRegistry()` for config updates
  - Implement `cleanupRegistry()` for removed posts
  - _Requirements: 8.4, 1.5, 2.5_

- [x] 5.1 Write property test for button idempotence


  - **Property 3: Per-Post Button Idempotence**
  - **Validates: Requirements 1.5, 2.5, 5.5**

- [x] 6. Implement post processing pipeline







  - Create main processing function that orchestrates all modules
  - Implement batch processing for multiple posts
  - Add error handling for malformed posts
  - Add error logging for debugging
  - Integrate URL extraction, button creation, and injection
  - _Requirements: 5.4, 7.1, 8.5_

- [x] 6.1 Write property test for graceful error handling



  - **Property 14: Graceful Error Handling for Malformed Posts**
  - **Validates: Requirements 7.1**

- [x] 6.2 Write property test for error logging


  - **Property 18: Error Logging**
  - **Validates: Requirements 8.5**

- [x] 7. Update Twitter/X content script





  - Modify `content/twitter-content.js` to use new per-post system
  - Remove old page-level button code
  - Integrate post detection module
  - Integrate URL extraction for tweets
  - Integrate button injection for each tweet
  - Set up MutationObserver for dynamic tweets
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 8. Update Instagram content script





  - Modify `content/instagram-content.js` to use new per-post system
  - Remove old page-level button code
  - Integrate post detection module
  - Integrate URL extraction for posts
  - Integrate button injection for each post
  - Set up MutationObserver for dynamic posts
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9. Implement configuration update handling





  - Add message listener for config updates in content scripts
  - Implement button update logic when config changes
  - Clear registry and re-process posts on config change
  - Ensure updates work without page reload
  - Use default configuration as fallback
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 9.1 Write property test for Twitter config update propagation


  - **Property 10: Configuration Update Propagation (Twitter)**
  - **Validates: Requirements 6.1**

- [x] 9.2 Write property test for Instagram config update propagation


  - **Property 11: Configuration Update Propagation (Instagram)**
  - **Validates: Requirements 6.2**

- [x] 9.3 Write property test for config update without reload


  - **Property 12: Configuration Update Without Reload**
  - **Validates: Requirements 6.3**

- [x] 9.4 Write property test for default config fallback


  - **Property 13: Default Configuration Fallback**
  - **Validates: Requirements 6.5**

- [x] 10. Optimize performance





  - Implement throttling for MutationObserver callbacks
  - Add viewport detection to only process visible posts
  - Optimize selector queries for efficiency
  - Implement periodic registry cleanup
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 11. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Integration testing




  - Test complete flow: page load → detect posts → inject buttons → click → redirect
  - Test dynamic content loading (scroll simulation)
  - Test configuration updates affecting existing buttons
  - Test on various post types (tweets, retweets, Instagram posts, reels)
  - _Requirements: All_

- [x] 13. Manual testing on live sites





  - Test on actual Twitter/X timeline with various tweet types
  - Test on actual Instagram feed with various post types
  - Test scrolling behavior and button appearance timing
  - Test configuration changes through popup
  - Verify visual integration with platform UI
  - Test performance with many posts loaded
  - _Requirements: All_

