# Requirements Document

## Introduction

This feature addresses a bug in the Social Media Link Transformer Browser Extension where the "Copy embed link" button appears multiple times in share menus on Twitter/X and Instagram. The duplicate buttons occur when the share menu detection system processes the same menu multiple times, bypassing the existing deduplication mechanism. This fix will strengthen the deduplication logic to ensure only one "Copy embed link" button appears per share menu.

## Glossary

- **Extension**: The Social Media Link Transformer Browser Extension
- **Share Menu**: The native sharing interface provided by Twitter/X or Instagram when users click the share button on a post
- **Menu Item**: The "Copy embed link" button injected into the share menu
- **Deduplication**: The process of preventing multiple instances of the same menu item from being injected
- **WeakSet**: A JavaScript collection that holds weak references to objects, used for tracking processed menus
- **MutationObserver**: A browser API that watches for changes in the DOM tree
- **Share Menu Detector**: The utility module responsible for detecting when share menus appear
- **Share Menu Injector**: The utility module responsible for creating and injecting menu items

## Requirements

### Requirement 1

**User Story:** As a user, I want to see only one "Copy embed link" button in each share menu, so that the interface is clean and not confusing.

#### Acceptance Criteria

1. WHEN a share menu is opened THEN the Extension SHALL inject exactly one "Copy embed link" menu item
2. WHEN a share menu is detected multiple times by the observer THEN the Extension SHALL prevent duplicate injections
3. WHEN checking for existing menu items THEN the Extension SHALL verify both by WeakSet tracking and DOM presence
4. WHEN a menu item already exists in the DOM THEN the Extension SHALL skip injection regardless of WeakSet state
5. WHEN the same menu element is processed multiple times THEN the Extension SHALL recognize it as already processed

### Requirement 2

**User Story:** As a developer, I want robust deduplication logic, so that the extension handles edge cases in share menu detection.

#### Acceptance Criteria

1. WHEN the share menu detector fires multiple callbacks for the same menu THEN the system SHALL use the WeakSet to prevent reprocessing
2. WHEN the DOM structure changes after initial injection THEN the system SHALL verify menu item presence before attempting injection
3. WHEN the share menu injector is called THEN the system SHALL check for existing menu items using a unique class selector
4. WHEN multiple mutation events trigger for the same menu THEN the system SHALL debounce or deduplicate the processing
5. WHEN the menu element reference changes but represents the same logical menu THEN the system SHALL detect and prevent duplicate injection

### Requirement 3

**User Story:** As a developer, I want comprehensive logging for deduplication events, so that I can debug issues when they occur.

#### Acceptance Criteria

1. WHEN a menu is skipped due to WeakSet tracking THEN the system SHALL log the skip reason
2. WHEN a menu is skipped due to existing DOM element THEN the system SHALL log the skip reason
3. WHEN a menu item is successfully injected THEN the system SHALL log the injection
4. WHEN deduplication logic prevents an injection THEN the system SHALL include the menu element identifier in the log
5. WHEN debugging duplicate issues THEN the system SHALL provide sufficient log information to trace the execution flow

### Requirement 4

**User Story:** As a user, I want the fix to work on both Twitter/X and Instagram, so that I have a consistent experience across platforms.

#### Acceptance Criteria

1. WHEN using Twitter/X THEN the Extension SHALL apply deduplication logic to Twitter share menus
2. WHEN using Instagram THEN the Extension SHALL apply deduplication logic to Instagram share menus
3. WHEN the deduplication logic is updated THEN the system SHALL apply changes to both platform-specific content scripts
4. WHEN testing the fix THEN the system SHALL verify correct behavior on both platforms
5. WHEN share menu structures differ between platforms THEN the system SHALL handle platform-specific detection correctly

### Requirement 5

**User Story:** As a developer, I want the deduplication fix to be maintainable, so that future platform changes don't break the functionality.

#### Acceptance Criteria

1. WHEN implementing deduplication THEN the system SHALL use a combination of WeakSet tracking and DOM queries
2. WHEN checking for existing menu items THEN the system SHALL use a consistent class name across platforms
3. WHEN the share menu structure changes THEN the system SHALL gracefully handle missing or moved elements
4. WHEN adding new deduplication checks THEN the system SHALL document the reasoning in code comments
5. WHEN the fix is implemented THEN the system SHALL maintain backward compatibility with existing functionality
