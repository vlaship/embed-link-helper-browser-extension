# Design Document

## Overview

This design document describes the enhancement to the Social Media Redirector extension to add per-post redirect buttons to individual tweets and Instagram posts in timeline views. The implementation will use MutationObserver to detect dynamically loaded content, extract post-specific URLs, and inject styled buttons that integrate naturally with the existing UI.

## Architecture

The enhancement builds upon the existing extension architecture by modifying the content scripts to:

1. **Detect Post Containers**: Identify individual tweet/post DOM elements in the timeline
2. **Extract Post URLs**: Parse each post to find its unique URL
3. **Inject Per-Post Buttons**: Create and insert redirect buttons into each post
4. **Handle Dynamic Content**: Monitor for new posts loaded via infinite scroll
5. **Maintain Button Registry**: Track which posts have buttons to prevent duplicates

### Component Interaction Flow

```
Page loads with timeline
    ↓
Content script initializes
    ↓
Scan for existing post containers
    ↓
For each post:
    - Extract post URL
    - Create redirect button
    - Inject into post DOM
    ↓
MutationObserver watches for new posts
    ↓
New posts detected → Process new posts
    ↓
User clicks per-post button
    ↓
Navigate to transformed URL
```

## Components and Interfaces

### 1. Post Detection Module

**Responsibilities:**
- Identify post containers in the DOM
- Use platform-specific selectors for Twitter/X and Instagram
- Provide fallback selectors for robustness

**Twitter/X Selectors:**
```javascript
// Primary selector for tweet articles
const TWEET_SELECTORS = [
  'article[data-testid="tweet"]',
  'div[data-testid="cellInnerDiv"] article',
  'article[role="article"]'
];
```

**Instagram Selectors:**
```javascript
// Primary selector for post articles
const POST_SELECTORS = [
  'article[role="presentation"]',
  'div[class*="x1iyjqo2"] article',
  'article'
];
```

**Interface:**
```javascript
// Find all post containers on the page
findPostContainers() -> Array<HTMLElement>

// Check if element is a valid post container
isPostContainer(element: HTMLElement) -> boolean
```

### 2. URL Extraction Module

**Responsibilities:**
- Extract the unique URL for each post
- Handle different post types (regular tweets, retweets, Instagram posts, reels)
- Validate extracted URLs

**Twitter/X URL Extraction:**
```javascript
// Look for timestamp link or status link
// Pattern: /username/status/1234567890
extractTweetUrl(tweetElement: HTMLElement) -> string|null
```

**Instagram URL Extraction:**
```javascript
// Look for post link
// Pattern: /p/ABC123/ or /reel/ABC123/
extractPostUrl(postElement: HTMLElement) -> string|null
```

**Interface:**
```javascript
// Extract URL from post container
extractPostUrl(postElement: HTMLElement, platform: string) -> string|null

// Validate extracted URL format
validatePostUrl(url: string, platform: string) -> boolean

// Transform post URL to target hostname
transformPostUrl(postUrl: string, targetHostname: string) -> string|null
```

### 3. Button Injection Module

**Responsibilities:**
- Create styled redirect buttons
- Find appropriate injection points in post DOM
- Handle different post layouts

**Button Creation:**
```javascript
// Create button element with styling
createPerPostButton(postUrl: string, targetHostname: string, platform: string) -> HTMLElement

// Style button to match platform design
applyPlatformStyles(button: HTMLElement, platform: string) -> void
```

**Injection Points:**

**Twitter/X:**
- Option A: Add to action bar (below tweet, next to like/retweet buttons)
- Option B: Add to "..." menu dropdown
- Option C: Add as overlay on hover

**Instagram:**
- Option A: Add to action bar (below post, next to like/comment buttons)
- Option B: Add to "..." menu
- Option C: Add as overlay on post image

**Interface:**
```javascript
// Find injection point in post
findInjectionPoint(postElement: HTMLElement, platform: string) -> HTMLElement|null

// Inject button into post
injectButton(button: HTMLElement, injectionPoint: HTMLElement) -> boolean

// Remove button from post
removeButton(postElement: HTMLElement) -> void
```

### 4. Button Registry Module

**Responsibilities:**
- Track which posts have been processed
- Prevent duplicate button injection
- Clean up registry for removed posts

**Interface:**
```javascript
// Mark post as processed
markPostProcessed(postElement: HTMLElement) -> void

// Check if post has been processed
isPostProcessed(postElement: HTMLElement) -> boolean

// Clear registry (for config updates)
clearRegistry() -> void

// Clean up removed posts from registry
cleanupRegistry() -> void
```

### 5. Dynamic Content Observer

**Responsibilities:**
- Monitor DOM for new posts
- Batch process multiple new posts
- Throttle processing to avoid performance issues

**Interface:**
```javascript
// Start observing for new posts
startObserving() -> void

// Stop observing
stopObserving() -> void

// Process batch of new posts
processBatch(newPosts: Array<HTMLElement>) -> void
```

## Data Models

### Post Metadata

```javascript
{
  element: HTMLElement,        // The post container element
  url: string,                 // The post's unique URL
  platform: string,            // 'twitter' or 'instagram'
  hasButton: boolean,          // Whether button is injected
  buttonElement: HTMLElement,  // Reference to button element
  timestamp: number            // When post was processed
}
```

### Button Configuration

```javascript
{
  platform: string,            // 'twitter' or 'instagram'
  targetHostname: string,      // Target hostname for redirects
  postUrl: string,             // The specific post URL
  buttonText: string,          // Button label
  buttonIcon: string,          // Icon/emoji for button
  styles: Object               // Platform-specific styles
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Button Injection Completeness (Twitter)

*For any* set of visible tweet containers on a Twitter/X timeline, the extension should inject exactly one redirect button into each tweet container.

**Validates: Requirements 1.1**

### Property 2: Button Injection Completeness (Instagram)

*For any* set of visible post containers on an Instagram feed, the extension should inject exactly one redirect button into each post container.

**Validates: Requirements 2.1**

### Property 3: Per-Post Button Idempotence

*For any* post container (tweet or Instagram post), attempting to inject a redirect button multiple times should result in only one button being present in the DOM.

**Validates: Requirements 1.5, 2.5, 5.5**

### Property 4: URL Extraction Correctness (Twitter)

*For any* valid tweet container element, the URL extraction function should return a URL matching the pattern `https://x.com/[username]/status/[id]` or return null if no valid URL is found.

**Validates: Requirements 4.1**

### Property 5: URL Extraction Correctness (Instagram)

*For any* valid Instagram post container element, the URL extraction function should return a URL matching the pattern `https://www.instagram.com/p/[id]/` or `https://www.instagram.com/reel/[id]/` or return null if no valid URL is found.

**Validates: Requirements 4.2**

### Property 6: No Button on Invalid URL

*For any* post container where the URL cannot be extracted or is invalid, the extension should not inject a redirect button.

**Validates: Requirements 4.3**

### Property 7: Retweet URL Extraction

*For any* retweet or shared post container, the URL extraction function should return the URL of the original post, not the sharing user's URL.

**Validates: Requirements 4.5**

### Property 8: Button Position Consistency

*For any* post container where a button is injected, the button should always be inserted at the same relative position in the DOM structure (e.g., always as the last child of the action bar).

**Validates: Requirements 3.4**

### Property 9: Button Content Requirement

*For any* injected redirect button, the button element should contain either text or an icon that indicates its redirect purpose.

**Validates: Requirements 3.5**

### Property 10: Configuration Update Propagation (Twitter)

*For any* configuration change to the Twitter target hostname, all existing per-post buttons on Twitter/X should update to reflect the new target hostname.

**Validates: Requirements 6.1**

### Property 11: Configuration Update Propagation (Instagram)

*For any* configuration change to the Instagram target hostname, all existing per-post buttons on Instagram should update to reflect the new target hostname.

**Validates: Requirements 6.2**

### Property 12: Configuration Update Without Reload

*For any* configuration update, the per-post buttons should reflect the changes without requiring a page reload.

**Validates: Requirements 6.3**

### Property 13: Default Configuration Fallback

*For any* scenario where configuration is unavailable or fails to load, the extension should use default target hostnames (fixvx.com for Twitter, kkinstagram.com for Instagram).

**Validates: Requirements 6.5**

### Property 14: Graceful Error Handling for Malformed Posts

*For any* post container with unexpected or malformed DOM structure, the extension should handle the error gracefully without throwing exceptions that crash the script.

**Validates: Requirements 7.1**

### Property 15: Invalid URL Handling

*For any* post with a malformed or invalid URL, the extension should skip that post and log an error without affecting other posts.

**Validates: Requirements 7.2**

### Property 16: Missing Injection Point Handling

*For any* post where a suitable injection point cannot be found, the extension should not inject a button and should not throw an error.

**Validates: Requirements 7.3**

### Property 17: Fallback Selector Robustness

*For any* post container that doesn't match the primary selector but matches a fallback selector, the extension should still successfully detect and process the post.

**Validates: Requirements 7.4**

### Property 18: Error Logging

*For any* error that occurs during post processing, URL extraction, or button injection, the extension should log detailed error information to the console.

**Validates: Requirements 8.5**

## Error Handling

### URL Extraction Failures

- **Scenario**: Post container doesn't contain a valid URL link
- **Handling**: Skip the post, log a warning, continue processing other posts
- **User Impact**: That specific post won't have a redirect button, but other posts are unaffected

### Button Injection Failures

- **Scenario**: Cannot find suitable injection point in post DOM
- **Handling**: Skip the post, log a warning, mark post as processed to avoid retries
- **User Impact**: That specific post won't have a redirect button

### DOM Structure Changes

- **Scenario**: Twitter/X or Instagram updates their HTML structure
- **Handling**: Use fallback selectors, log warnings about selector failures
- **User Impact**: May temporarily lose functionality until selectors are updated

### Configuration Errors

- **Scenario**: Cannot retrieve configuration from storage
- **Handling**: Use default configuration values, log error
- **User Impact**: Buttons use default hostnames instead of custom ones

### Performance Issues

- **Scenario**: Too many posts loaded simultaneously
- **Handling**: Batch processing with throttling, process in chunks
- **User Impact**: Slight delay in button appearance, but no page freezing

## Testing Strategy

### Unit Testing

The extension will use **Jest** as the testing framework for unit tests.

**Unit Test Coverage:**

1. **URL Extraction Logic**
   - Test extraction from various tweet DOM structures
   - Test extraction from Instagram post structures
   - Test handling of retweets and shared posts
   - Test invalid/malformed post structures

2. **Button Creation**
   - Test button element creation with correct attributes
   - Test button styling for different platforms
   - Test button click handler attachment

3. **Post Detection**
   - Test selector matching for various post structures
   - Test fallback selector behavior
   - Test post container validation

4. **Registry Management**
   - Test marking posts as processed
   - Test duplicate detection
   - Test registry cleanup

### Property-Based Testing

The extension will use **fast-check** (JavaScript property-based testing library) for property tests.

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: per-post-redirect-buttons, Property {number}: {property_text}**`

**Property Test Coverage:**

1. **Property 1 & 2: Button Injection Completeness**
   - Generate random arrays of post container elements
   - Verify each container gets exactly one button

2. **Property 3: Per-Post Button Idempotence**
   - Generate random post containers
   - Attempt injection multiple times
   - Verify only one button exists

3. **Property 4 & 5: URL Extraction Correctness**
   - Generate random post DOM structures with valid URLs
   - Verify extracted URLs match expected patterns

4. **Property 6: No Button on Invalid URL**
   - Generate post containers with invalid/missing URLs
   - Verify no buttons are injected

5. **Property 7: Retweet URL Extraction**
   - Generate retweet DOM structures
   - Verify original post URL is extracted

6. **Property 8: Button Position Consistency**
   - Generate various post structures
   - Verify button always inserted at same relative position

7. **Property 9: Button Content Requirement**
   - Generate random button configurations
   - Verify all buttons contain text or icon

8. **Property 10 & 11: Configuration Update Propagation**
   - Generate random configuration changes
   - Verify all buttons update accordingly

9. **Property 12: Configuration Update Without Reload**
   - Simulate config updates
   - Verify buttons update without page reload

10. **Property 13: Default Configuration Fallback**
    - Simulate missing/failed configuration
    - Verify default values are used

11. **Property 14-16: Error Handling**
    - Generate various malformed inputs
    - Verify graceful error handling

12. **Property 17: Fallback Selector Robustness**
    - Generate posts matching only fallback selectors
    - Verify successful detection

13. **Property 18: Error Logging**
    - Generate error conditions
    - Verify appropriate logging occurs

### Integration Testing

- Test complete flow: page load → detect posts → inject buttons → click button → redirect
- Test dynamic content loading (infinite scroll simulation)
- Test configuration updates affecting existing buttons
- Test on actual Twitter/X and Instagram pages (manual)

### Manual Testing

- Visual verification of button appearance and positioning
- Test on various post types (regular tweets, retweets, threads, Instagram posts, reels)
- Test scrolling behavior and performance
- Test on different screen sizes and zoom levels

## Implementation Notes

### Platform-Specific Considerations

**Twitter/X:**
- DOM structure changes frequently with A/B tests
- Multiple tweet types: regular, retweets, quoted tweets, threads
- Action bar location varies by tweet type
- Need to handle both timeline and individual tweet views

**Instagram:**
- Feed posts vs. Reels have different structures
- Stories are not supported (ephemeral content)
- Action bar is consistent across post types
- Need to handle both feed and profile views

### Performance Optimization

1. **Throttled Observer**: Limit MutationObserver callbacks to avoid excessive processing
2. **Batch Processing**: Process multiple new posts in a single batch
3. **Efficient Selectors**: Use specific selectors to minimize DOM queries
4. **Registry Cleanup**: Periodically clean up registry for removed posts
5. **Lazy Button Creation**: Only create buttons for visible posts (viewport detection)

### Button Placement Options

**Recommended Approach: Action Bar Integration**

Add button to the existing action bar (like/retweet/share row) for seamless integration:

**Twitter/X:**
```
[Like] [Retweet] [Reply] [Share] [🔄 Redirect]
```

**Instagram:**
```
[Like] [Comment] [Share] [Save] [🔄 Redirect]
```

**Alternative Approaches:**
- Add to "..." dropdown menu (more hidden but cleaner)
- Overlay button on hover (more prominent but potentially intrusive)

### Selector Strategy

Use a tiered selector approach for robustness:

1. **Primary Selectors**: Most specific, current structure
2. **Fallback Selectors**: More general, catch structure changes
3. **Validation**: Verify selected elements are actually posts

### URL Extraction Strategy

**Twitter/X:**
1. Look for `<a>` tag with `href` matching `/[username]/status/[id]`
2. Check `<time>` element's parent link
3. Fallback: Parse from tweet metadata attributes

**Instagram:**
1. Look for `<a>` tag with `href` matching `/p/[id]/` or `/reel/[id]/`
2. Check post header link
3. Fallback: Parse from post metadata attributes

## Future Enhancements

- Keyboard shortcuts for quick redirect
- Context menu integration (right-click → redirect)
- Batch redirect multiple selected posts
- Copy transformed URL to clipboard option
- Customizable button position and style
- Support for additional platforms (TikTok, Facebook, etc.)

