# Requirements Document

## Introduction

This document specifies the requirements for enhancing the Social Media Redirector browser extension to add individual redirect buttons to each tweet and Instagram post in the timeline, rather than a single page-level button. This enhancement will enable users to redirect specific posts to alternative hostnames directly from the timeline view.

## Glossary

- **Extension**: The Social Media Redirector browser extension
- **Timeline**: The main feed view showing multiple tweets or Instagram posts
- **Post**: A single tweet on Twitter/X or a single post on Instagram
- **Per-Post Button**: A redirect button attached to an individual post in the timeline
- **Tweet Container**: The DOM element that contains a single tweet
- **Post Container**: The DOM element that contains a single Instagram post
- **Action Menu**: The "..." menu on Twitter/X posts that contains actions like "Copy link", "Share", etc.
- **Post URL**: The unique URL for a specific tweet or Instagram post
- **Target Hostname**: The alternative domain name to which content will be redirected
- **Dynamic Content**: Posts that are loaded as the user scrolls (infinite scroll)

## Requirements

### Requirement 1

**User Story:** As a Twitter/X user, I want to see a redirect button on each individual tweet in my timeline, so that I can redirect specific tweets without leaving the timeline view.

#### Acceptance Criteria

1. WHEN a user views the Twitter/X timeline, THEN the Extension SHALL inject a redirect button into each visible tweet
2. WHEN a user clicks a per-post redirect button on a tweet, THEN the Extension SHALL navigate to that specific tweet's URL on the Target Hostname
3. WHEN a tweet has the URL `https://x.com/user/status/123456`, THEN the Extension SHALL transform it to `https://[target]/user/status/123456`
4. WHEN new tweets are loaded dynamically (infinite scroll), THEN the Extension SHALL inject redirect buttons into the newly loaded tweets within 500 milliseconds
5. WHEN a redirect button is injected into a tweet, THEN the Extension SHALL ensure only one button exists per tweet

### Requirement 2

**User Story:** As an Instagram user, I want to see a redirect button on each individual post in my feed, so that I can redirect specific posts without leaving the feed view.

#### Acceptance Criteria

1. WHEN a user views the Instagram feed, THEN the Extension SHALL inject a redirect button into each visible post
2. WHEN a user clicks a per-post redirect button on a post, THEN the Extension SHALL navigate to that specific post's URL on the Target Hostname
3. WHEN a post has the URL `https://www.instagram.com/p/ABC123/`, THEN the Extension SHALL transform it to `https://[target]/p/ABC123/`
4. WHEN new posts are loaded dynamically (infinite scroll), THEN the Extension SHALL inject redirect buttons into the newly loaded posts within 500 milliseconds
5. WHEN a redirect button is injected into a post, THEN the Extension SHALL ensure only one button exists per post

### Requirement 3

**User Story:** As a user, I want the per-post redirect buttons to be visually integrated with the existing post UI, so that they feel like a natural part of the interface.

#### Acceptance Criteria

1. WHEN a redirect button is displayed on a Twitter/X post, THEN the Extension SHALL style it to match Twitter/X's design language
2. WHEN a redirect button is displayed on an Instagram post, THEN the Extension SHALL style it to match Instagram's design language
3. WHEN a user hovers over a per-post redirect button, THEN the Extension SHALL provide visual feedback indicating interactivity
4. WHEN a redirect button is positioned, THEN the Extension SHALL place it in a consistent location relative to other post actions
5. WHEN the button is rendered, THEN the Extension SHALL include an icon or text that clearly indicates its redirect purpose

### Requirement 4

**User Story:** As a user, I want the per-post buttons to extract the correct URL for each specific post, so that I am redirected to the exact content I clicked on.

#### Acceptance Criteria

1. WHEN the Extension identifies a tweet container, THEN the Extension SHALL extract the tweet's unique status URL
2. WHEN the Extension identifies an Instagram post container, THEN the Extension SHALL extract the post's unique URL
3. WHEN a post URL cannot be determined, THEN the Extension SHALL not inject a redirect button for that post
4. WHEN transforming a post URL, THEN the Extension SHALL preserve the complete path, query parameters, and hash fragments
5. WHEN a post is a retweet or shared post, THEN the Extension SHALL extract the URL of the original post

### Requirement 5

**User Story:** As a user, I want the extension to handle dynamically loaded content efficiently, so that buttons appear on new posts as I scroll without performance degradation.

#### Acceptance Criteria

1. WHEN the user scrolls and new posts are loaded, THEN the Extension SHALL detect the new content within 100 milliseconds
2. WHEN processing new posts, THEN the Extension SHALL inject buttons without blocking the main thread
3. WHEN the Extension observes DOM changes, THEN the Extension SHALL use efficient selectors to minimize performance impact
4. WHEN multiple posts are loaded simultaneously, THEN the Extension SHALL process them in batch to optimize performance
5. WHEN a post already has a redirect button, THEN the Extension SHALL skip processing that post

### Requirement 6

**User Story:** As a user, I want the per-post buttons to work with the existing configuration system, so that I can still customize target hostnames through the popup.

#### Acceptance Criteria

1. WHEN a user changes the Twitter/X target hostname in the popup, THEN the Extension SHALL update all per-post buttons on Twitter/X
2. WHEN a user changes the Instagram target hostname in the popup, THEN the Extension SHALL update all per-post buttons on Instagram
3. WHEN configuration is updated, THEN the Extension SHALL reflect changes without requiring a page reload
4. WHEN the Extension retrieves configuration, THEN the Extension SHALL use the same storage mechanism as the existing extension
5. WHEN configuration is unavailable, THEN the Extension SHALL use default target hostnames

### Requirement 7

**User Story:** As a user, I want the per-post buttons to handle edge cases gracefully, so that the extension remains stable and doesn't break the page functionality.

#### Acceptance Criteria

1. WHEN a post container has an unexpected structure, THEN the Extension SHALL handle the error gracefully without crashing
2. WHEN a post URL is malformed or invalid, THEN the Extension SHALL skip that post and log the error
3. WHEN the Extension cannot find a suitable injection point, THEN the Extension SHALL not inject a button for that post
4. WHEN Twitter/X or Instagram updates their DOM structure, THEN the Extension SHALL continue functioning with fallback selectors
5. WHEN a redirect button fails to inject, THEN the Extension SHALL not affect the functionality of the original post

### Requirement 8

**User Story:** As a developer, I want the per-post button implementation to be maintainable and testable, so that future updates are easier to implement.

#### Acceptance Criteria

1. WHEN extracting post URLs, THEN the Extension SHALL use a dedicated function that can be unit tested
2. WHEN injecting buttons, THEN the Extension SHALL use a modular approach that separates concerns
3. WHEN detecting post containers, THEN the Extension SHALL use configurable selectors that can be easily updated
4. WHEN the Extension processes posts, THEN the Extension SHALL maintain a registry of processed posts to prevent duplicates
5. WHEN errors occur, THEN the Extension SHALL log detailed information for debugging purposes

