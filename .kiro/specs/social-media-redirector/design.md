# Design Document

## Overview

The Social Media Redirector is a cross-browser extension (Chrome and Firefox) that enhances user experience on Twitter/X and Instagram by providing quick access to alternative hostnames. The extension injects redirect buttons into web pages and provides a popup interface for hostname configuration. The architecture follows the WebExtensions API standard to ensure compatibility across browsers.

## Architecture

The extension follows a standard browser extension architecture with three main components:

1. **Background Script**: Manages extension lifecycle, storage operations, and message passing
2. **Content Scripts**: Injected into Twitter/X and Instagram pages to manipulate the DOM and add redirect buttons
3. **Popup Interface**: Provides a user interface for configuring target hostnames

### Component Interaction Flow

```
User clicks extension icon
    ↓
Popup loads and requests current config from Background Script
    ↓
Background Script retrieves config from storage
    ↓
Popup displays editable hostname fields
    ↓
User modifies and saves
    ↓
Popup sends new config to Background Script
    ↓
Background Script persists to storage
    ↓
Content Scripts receive updated config and update buttons
```

## Components and Interfaces

### 1. Manifest File (manifest.json)

The manifest defines extension metadata, permissions, and component registration. Uses Manifest V3 format.

**Key Elements:**
- `manifest_version`: 3
- `permissions`: ["storage", "activeTab"]
- `host_permissions`: ["*://x.com/*", "*://www.instagram.com/*"]
- `content_scripts`: Defines injection rules for Twitter/X and Instagram
- `action`: Defines popup HTML file
- `background`: Registers service worker (Chrome) or background script (Firefox)

### 2. Background Script (background.js)

**Responsibilities:**
- Initialize default configuration on installation
- Handle storage operations (read/write)
- Respond to messages from content scripts and popup
- Manage cross-component communication

**Interface:**
```javascript
// Message handlers
onMessage({
  action: "getConfig" | "saveConfig",
  data?: ConfigData
}) -> Promise<Response>

// Storage operations
getStoredConfig() -> Promise<Config>
saveConfig(config: Config) -> Promise<void>
```

### 3. Content Scripts

Separate content scripts for Twitter/X and Instagram that inject redirect buttons.

**twitter-content.js / instagram-content.js**

**Responsibilities:**
- Detect current page URL
- Inject redirect button into DOM
- Handle button click events
- Listen for configuration updates
- Handle dynamic page navigation (SPA behavior)

**Interface:**
```javascript
// Main functions
injectButton() -> void
createRedirectUrl(currentUrl: string, targetHostname: string) -> string
handleButtonClick() -> void
observePageChanges() -> void
```

### 4. Popup Interface (popup.html, popup.js, popup.css)

**Responsibilities:**
- Display current hostname configurations
- Provide input fields for editing
- Validate user input
- Save configuration changes
- Display error messages

**Interface:**
```javascript
// Popup functions
loadCurrentConfig() -> Promise<void>
saveConfiguration() -> Promise<void>
validateHostname(hostname: string) -> boolean
displayError(message: string) -> void
```

## Data Models

### Configuration Object

```javascript
{
  twitter: {
    enabled: boolean,
    targetHostname: string  // e.g., "fixvx.com"
  },
  instagram: {
    enabled: boolean,
    targetHostname: string  // e.g., "kkinstagram.com"
  }
}
```

**Default Configuration:**
```javascript
{
  twitter: {
    enabled: true,
    targetHostname: "fixvx.com"
  },
  instagram: {
    enabled: true,
    targetHostname: "kkinstagram.com"
  }
}
```

### URL Transformation Model

```javascript
{
  originalUrl: string,      // Full original URL
  protocol: string,         // "https:"
  hostname: string,         // "x.com" or "www.instagram.com"
  pathname: string,         // "/account/status/123"
  search: string,           // "?ref=source"
  hash: string,             // "#reply"
  targetHostname: string,   // "fixvx.com"
  transformedUrl: string    // Complete transformed URL
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: URL Transformation Preservation

*For any* valid Twitter/X or Instagram URL with path, query parameters, and hash fragments, transforming the URL by replacing only the hostname should preserve all other URL components exactly.

**Validates: Requirements 7.1, 7.2, 7.4**

### Property 2: Configuration Round-Trip Consistency

*For any* valid configuration object, saving it to storage and then retrieving it should return an equivalent configuration object.

**Validates: Requirements 6.1, 6.2**

### Property 3: Hostname Validation Rejection

*For any* string that is not a valid hostname format (contains invalid characters, protocols, or paths), the validation function should reject it and prevent it from being saved.

**Validates: Requirements 7.3**

### Property 4: Button Injection Idempotence

*For any* page where a redirect button has been injected, attempting to inject the button again should not create duplicate buttons.

**Validates: Requirements 1.1, 2.1**

### Property 5: URL Pattern Matching Specificity

*For any* URL that does not match the Twitter/X or Instagram patterns, the extension should not inject a redirect button.

**Validates: Requirements 7.5**

### Property 6: Storage Default Fallback

*For any* storage retrieval operation that returns null or undefined, the extension should use the default configuration values.

**Validates: Requirements 6.4**

## Error Handling

### Storage Errors

- **Scenario**: Storage API fails to read or write
- **Handling**: Log error, display user-friendly message in popup, fall back to default configuration
- **User Impact**: Temporary loss of custom settings, but extension remains functional

### Invalid Hostname Input

- **Scenario**: User enters invalid hostname (e.g., includes protocol, special characters)
- **Handling**: Validate input before saving, display inline error message, prevent save operation
- **User Impact**: Clear feedback on what needs to be corrected

### DOM Injection Failures

- **Scenario**: Content script cannot find suitable injection point
- **Handling**: Retry with fallback selectors, log warning, gracefully skip injection
- **User Impact**: Button may not appear, but page functionality unaffected

### URL Transformation Errors

- **Scenario**: Current URL cannot be parsed or transformed
- **Handling**: Log error, disable button click, show tooltip with error
- **User Impact**: Button visible but non-functional with explanation

### Cross-Browser API Differences

- **Scenario**: API differences between Chrome and Firefox
- **Handling**: Use polyfill or conditional logic to normalize API calls
- **User Impact**: Seamless experience across browsers

## Testing Strategy

### Unit Testing

The extension will use **Jest** as the testing framework for unit tests.

**Unit Test Coverage:**

1. **URL Transformation Logic**
   - Test specific examples: `https://x.com/user/status/123` → `https://fixvx.com/user/status/123`
   - Test preservation of query parameters and hash fragments
   - Test edge cases: empty paths, special characters, encoded URLs

2. **Hostname Validation**
   - Test valid hostnames: `example.com`, `sub.example.com`
   - Test invalid inputs: `http://example.com`, `example.com/path`, `invalid..com`
   - Test empty and whitespace-only inputs

3. **Configuration Management**
   - Test default configuration initialization
   - Test configuration merge with partial updates
   - Test storage error handling

4. **Button Injection Logic**
   - Test button creation with correct attributes
   - Test duplicate prevention
   - Test button positioning

### Property-Based Testing

The extension will use **fast-check** (JavaScript property-based testing library) for property tests.

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with format: `**Feature: social-media-redirector, Property {number}: {property_text}**`

**Property Test Coverage:**

1. **Property 1: URL Transformation Preservation**
   - Generate random valid URLs with various path/query/hash combinations
   - Verify all components except hostname are preserved after transformation

2. **Property 2: Configuration Round-Trip Consistency**
   - Generate random valid configuration objects
   - Verify save-then-load returns equivalent configuration

3. **Property 3: Hostname Validation Rejection**
   - Generate random invalid hostname strings
   - Verify all are rejected by validation function

4. **Property 4: Button Injection Idempotence**
   - Simulate multiple injection attempts
   - Verify only one button exists in DOM

5. **Property 5: URL Pattern Matching Specificity**
   - Generate random URLs from various domains
   - Verify only Twitter/X and Instagram URLs trigger injection

6. **Property 6: Storage Default Fallback**
   - Simulate various storage failure scenarios
   - Verify defaults are always applied

### Integration Testing

- Test complete user flow: install → configure → visit page → click button
- Test popup-to-background-to-content script communication
- Test extension behavior across browser restarts
- Test behavior on actual Twitter/X and Instagram pages

### Cross-Browser Testing

- Manual testing on Chrome (latest version)
- Manual testing on Firefox (latest version)
- Verify manifest compatibility
- Verify API compatibility (especially storage and messaging)

## Implementation Notes

### Cross-Browser Compatibility

Use the `browser` namespace with a polyfill for Chrome:
```javascript
const browser = chrome || browser;
```

### Content Script Injection Timing

Use `document_idle` run_at timing to ensure DOM is ready before injection.

### Dynamic Page Handling

Both Twitter/X and Instagram are Single Page Applications (SPAs). Use MutationObserver to detect URL changes and re-inject buttons as needed.

### Button Styling

Use Shadow DOM or highly specific CSS selectors to prevent style conflicts with host pages.

### Security Considerations

- Validate and sanitize all user inputs (hostnames)
- Use Content Security Policy in manifest
- Avoid eval() and inline scripts
- Ensure HTTPS for all redirects

## Future Enhancements

- Support for additional social media platforms
- Custom button positioning preferences
- Keyboard shortcuts for quick redirection
- Analytics/usage tracking (opt-in)
- Import/export configuration
- Multiple hostname profiles
