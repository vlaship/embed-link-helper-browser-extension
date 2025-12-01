# Implementation Plan

- [x] 1. Set up project structure and manifest





  - Create directory structure for extension files
  - Create manifest.json with Manifest V3 configuration
  - Define permissions, host_permissions, and content_scripts
  - Configure popup and background script registration
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 2. Implement configuration management and storage





  - Create config.js module with default configuration
  - Implement storage wrapper functions for browser.storage API
  - Add configuration validation logic
  - _Requirements: 3.5, 6.1, 6.5_

- [x] 2.1 Write property test for configuration round-trip






  - **Property 2: Configuration Round-Trip Consistency**
  - **Validates: Requirements 3.3, 3.4, 6.1, 6.2**

- [x] 2.2 Write property test for storage default fallback






  - **Property 6: Storage Default Fallback**
  - **Validates: Requirements 6.4**

- [x] 2.3 Write property test for configuration validation





  - **Validates: Requirements 6.5**

- [x] 3. Implement URL transformation logic





  - Create url-transformer.js module
  - Implement hostname replacement function preserving path, query, and hash
  - Add URL parsing and reconstruction logic
  - Implement hostname validation function
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3.1 Write property test for URL transformation preservation






  - **Property 1: URL Transformation Preservation**
  - **Validates: Requirements 7.1, 7.2, 7.4**

- [x] 3.2 Write property test for hostname validation rejection






  - **Property 3: Hostname Validation Rejection**
  - **Validates: Requirements 7.3**

- [x] 3.3 Write unit tests for URL transformation examples






  - Test Twitter/X example: x.com → fixvx.com
  - Test Instagram example: instagram.com → kkinstagram.com
  - Test URLs with query parameters and hash fragments
  - _Requirements: 1.3, 2.3, 7.4_

- [x] 4. Implement background script





  - Create background.js service worker
  - Implement message handlers for getConfig and saveConfig
  - Add initialization logic for default configuration
  - Implement storage error handling
  - _Requirements: 6.2, 6.3_

- [x] 4.1 Write property test for storage error handling






  - **Validates: Requirements 6.3**

- [x] 5. Implement content script for Twitter/X





  - Create twitter-content.js
  - Implement URL pattern detection for x.com
  - Create button injection logic with DOM manipulation
  - Add button click handler for redirection
  - Implement MutationObserver for SPA navigation
  - Style button with CSS to be visually distinct
  - _Requirements: 1.1, 1.2, 1.5, 5.4_

- [x] 5.1 Write property test for button injection idempotence






  - **Property 4: Button Injection Idempotence**
  - **Validates: Requirements 1.1, 1.5**

- [x] 5.2 Write property test for URL pattern matching






  - **Property 5: URL Pattern Matching Specificity**
  - **Validates: Requirements 1.1, 7.5**

- [x] 5.3 Write property test for button content requirement






  - **Validates: Requirements 5.4**

- [x] 6. Implement content script for Instagram





  - Create instagram-content.js
  - Implement URL pattern detection for instagram.com
  - Create button injection logic with DOM manipulation
  - Add button click handler for redirection
  - Implement MutationObserver for SPA navigation
  - Style button with CSS to be visually distinct
  - _Requirements: 2.1, 2.2, 2.5, 5.4_

- [x] 6.1 Write property test for Instagram button injection






  - **Validates: Requirements 2.1, 2.5**

- [x] 7. Implement popup interface





  - Create popup.html with input fields for Twitter/X and Instagram hostnames
  - Create popup.css for styling
  - Create popup.js for logic
  - Implement loadCurrentConfig function to fetch and display configuration
  - Implement saveConfiguration function with validation
  - Add error message display functionality
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 7.1 Write unit tests for popup validation





  - Test valid hostname inputs
  - Test invalid hostname inputs (with protocol, paths, special chars)
  - Test empty input handling
  - _Requirements: 7.3_

- [x] 8. Add cross-browser compatibility layer





  - Create browser-polyfill.js or use webextension-polyfill
  - Ensure consistent API usage across Chrome and Firefox
  - Test manifest compatibility for both browsers
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Implement shared utilities and styling





  - Create shared CSS for button styling
  - Add utility functions for DOM manipulation
  - Implement error logging utilities
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration testing






  - Test complete flow: install → configure → visit page → click button
  - Test popup-to-background-to-content communication
  - Test behavior across browser restarts
  - Test on actual Twitter/X and Instagram pages
  - _Requirements: All_

- [x] 12. Cross-browser manual testing






  - Test extension on Chrome (latest version)
  - Test extension on Firefox (latest version)
  - Verify all features work on both browsers
  - _Requirements: 4.1, 4.2_
