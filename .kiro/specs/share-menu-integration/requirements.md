# Requirements Document

## Introduction

This feature replaces the existing per-post button functionality in the Social Media Link Transformer Browser Extension with native share menu integration on Twitter/X and Instagram. Instead of injecting standalone buttons on each post, users will access the "Copy embed link" functionality through the platforms' existing share interfaces, providing a more seamless and native user experience. The existing per-post button code and related utilities will be removed as part of this migration.

## Glossary

- **Extension**: The Social Media Link Transformer Browser Extension
- **Share Menu**: The native sharing interface provided by Twitter/X or Instagram when users click the share button on a post
- **Embed Link**: A transformed URL that uses an alternative hostname (e.g., fixvx.com for Twitter, kkinstagram.com for Instagram) to enable proper link previews in messaging platforms
- **Menu Item**: A clickable option within the share menu interface
- **Native Share Interface**: The platform's built-in sharing UI that appears when users click the share icon on posts
- **Post Container**: The DOM element that contains a single post/tweet
- **Target Hostname**: The alternative hostname configured for link transformation (default: fixvx.com for Twitter, kkinstagram.com for Instagram)

## Requirements

### Requirement 1

**User Story:** As a user browsing Twitter/X, I want to copy an embed link directly from the native share menu, so that I can quickly share posts with proper previews without using a separate button.

#### Acceptance Criteria

1. WHEN a user opens the share menu on a Twitter/X post THEN the Extension SHALL inject a "Copy embed link" menu item into the share menu
2. WHEN the share menu contains the injected menu item THEN the Extension SHALL style it to match the visual appearance of native menu items
3. WHEN a user clicks the "Copy embed link" menu item THEN the Extension SHALL transform the post URL to use the configured target hostname
4. WHEN a user clicks the "Copy embed link" menu item THEN the Extension SHALL copy the transformed URL to the clipboard
5. WHEN the transformed URL is copied to clipboard THEN the Extension SHALL provide visual feedback indicating successful copy operation
6. WHEN the share menu is closed and reopened THEN the Extension SHALL ensure the "Copy embed link" menu item appears consistently

### Requirement 2

**User Story:** As a user browsing Instagram, I want to copy an embed link directly from the native share menu, so that I can quickly share posts with proper previews without using a separate button.

#### Acceptance Criteria

1. WHEN a user opens the share menu on an Instagram post THEN the Extension SHALL inject a "Copy embed link" menu item into the share menu
2. WHEN the share menu contains the injected menu item THEN the Extension SHALL style it to match the visual appearance of native menu items
3. WHEN a user clicks the "Copy embed link" menu item THEN the Extension SHALL transform the post URL to use the configured target hostname
4. WHEN a user clicks the "Copy embed link" menu item THEN the Extension SHALL copy the transformed URL to the clipboard
5. WHEN the transformed URL is copied to clipboard THEN the Extension SHALL provide visual feedback indicating successful copy operation
6. WHEN the share menu is closed and reopened THEN the Extension SHALL ensure the "Copy embed link" menu item appears consistently

### Requirement 3

**User Story:** As a user, I want the share menu integration to work seamlessly with dynamic content, so that I can use the feature on any post regardless of when it was loaded.

#### Acceptance Criteria

1. WHEN new posts are loaded via infinite scroll THEN the Extension SHALL ensure share menu integration works for all newly loaded posts
2. WHEN a share menu is opened THEN the Extension SHALL detect the menu within 200ms and inject the menu item
3. WHEN multiple share menus are opened in quick succession THEN the Extension SHALL handle each menu independently without conflicts
4. WHEN the DOM structure changes due to platform updates THEN the Extension SHALL gracefully handle missing elements without breaking functionality

### Requirement 4

**User Story:** As a user, I want the share menu integration to respect my configuration settings, so that the feature behaves according to my preferences.

#### Acceptance Criteria

1. WHEN the user has disabled Twitter/X redirect in settings THEN the Extension SHALL NOT inject menu items into Twitter/X share menus
2. WHEN the user has disabled Instagram redirect in settings THEN the Extension SHALL NOT inject menu items into Instagram share menus
3. WHEN the user changes the target hostname configuration THEN the Extension SHALL use the updated hostname for all subsequent copy operations
4. WHEN the user changes configuration settings THEN the Extension SHALL apply changes without requiring a page reload

### Requirement 5

**User Story:** As a user, I want clear visual feedback when I copy an embed link from the share menu, so that I know the operation was successful.

#### Acceptance Criteria

1. WHEN a user clicks the "Copy embed link" menu item THEN the Extension SHALL display a temporary success indicator
2. WHEN the copy operation fails THEN the Extension SHALL display an error message to the user
3. WHEN the success indicator is displayed THEN the Extension SHALL automatically hide it after 2 seconds
4. WHEN visual feedback is shown THEN the Extension SHALL ensure it does not obstruct other menu items or content

### Requirement 6

**User Story:** As a developer, I want the share menu integration to be maintainable and testable, so that the feature remains reliable as platforms evolve.

#### Acceptance Criteria

1. WHEN the Extension injects menu items THEN the system SHALL use platform-specific selectors that are documented and maintainable
2. WHEN detecting share menus THEN the system SHALL use MutationObserver to monitor for menu appearance
3. WHEN processing share menus THEN the system SHALL extract the post URL using existing URL extraction utilities
4. WHEN transforming URLs THEN the system SHALL use existing URL transformation utilities for consistency
5. WHEN the share menu integration is active THEN the system SHALL log relevant events for debugging purposes

### Requirement 7

**User Story:** As a developer, I want to remove the legacy per-post button functionality, so that the codebase is simplified and maintains only the share menu integration approach.

#### Acceptance Criteria

1. WHEN the share menu integration is implemented THEN the system SHALL remove all per-post button injection code from Twitter and Instagram content scripts
2. WHEN the legacy code is removed THEN the system SHALL remove unused utility modules related to per-post button functionality
3. WHEN the legacy code is removed THEN the system SHALL remove button-specific CSS styles that are no longer needed
4. WHEN the legacy code is removed THEN the system SHALL update the manifest to remove references to removed files
5. WHEN the legacy code is removed THEN the system SHALL ensure no orphaned code or unused dependencies remain
