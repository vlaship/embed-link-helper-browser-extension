# Implementation Plan

- [x] 1. Add helper function for menu identification
  - Create `getMenuIdentifier()` function in both Twitter and Instagram content scripts
  - Function should check for existing data-menu-id attribute or generate new unique ID
  - Use format: `menu-${timestamp}-${random}`
  - Add data-menu-id attribute to menu element for tracking
  - _Requirements: 3.4, 5.2_

- [x] 2. Enhance handleShareMenuDetected with dual verification
  - Add DOM query check for existing `.embed-link-menu-item` as second layer BEFORE WeakSet add
  - Move WeakSet add to BEFORE injection attempt (currently after) to prevent race conditions
  - Include menu identifier in all log messages using getMenuIdentifier()
  - Apply changes to both `content/twitter-share-menu.js` and `content/instagram-share-menu.js`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_

- [x] 2.1 Write property test for multiple detection prevention
  - **Property 2: Multiple detection prevention**
  - **Validates: Requirements 1.2, 2.1, 2.4**

- [x] 3. Enhance createEmbedLinkMenuItem with unique identifiers





  - Generate unique item ID using format: `embed-link-${timestamp}-${random}`
  - Add data-item-id attribute to menu item element
  - Ensure `.embed-link-menu-item` class is consistently applied (already done)
  - Add logging with item ID when menu item is created
  - Modify `utils/share-menu-injector.js`
  - _Requirements: 5.2, 5.1_

- [x] 4. Enhance injectMenuItem with post-injection verification





  - The existing DOM check for `.embed-link-menu-item` is already present
  - Update logging to include both existing and new item IDs when skipping
  - Add post-injection verification to confirm item was injected successfully
  - Log success with item ID and platform after verification
  - Modify `utils/share-menu-injector.js`
  - _Requirements: 1.4, 2.2, 2.3, 3.2, 3.3, 5.1_



- [x] 5. Final verification and testing



  - Run all existing tests to ensure no regressions
  - Manually test on both Twitter and Instagram to verify duplicate buttons are fixed
  - Verify logging output includes menu IDs and item IDs
  - _Requirements: All_
