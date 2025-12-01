# Chrome Developer Program Policies Compliance

This document demonstrates how the Embed Link Helper extension complies with Chrome's Developer Program Policies. Each policy area includes specific evidence and code references from the extension's implementation.

## Single Purpose Policy

**Policy Requirement**: Extensions must have a single purpose that is narrow and easy to understand.

**Compliance Statement**: The Embed Link Helper extension has a single, clearly defined purpose: to transform social media links (Twitter/X and Instagram) to alternative hostnames that provide better embeds in messaging platforms, and to add convenient per-post buttons for copying these transformed links.

**Evidence**:
- **Manifest Description**: The extension's manifest.json clearly states: "Adds redirect buttons to Twitter/X and Instagram pages for quick access to alternative hostnames"
- **Focused Functionality**: All code serves this single purpose:
  - `content/twitter-content.js` and `content/instagram-content.js` - Inject copy buttons on posts
  - `utils/url-transformer.js` - Transform URLs by replacing hostnames
  - `popup/popup.js` - Configure target hostnames
  - `config/config.js` - Store user preferences for hostname mappings
- **No Unrelated Features**: The extension does not include analytics, ads, tracking, social features, or any other functionality beyond link transformation
- **User Benefit**: Users can easily share social media content in messaging platforms (Discord, Telegram, Slack) with proper previews by using alternative hostnames

**Code References**:
- Manifest: `manifest.json` lines 3-4
- URL transformation: `utils/url-transformer.js` lines 56-88
- Button injection: `content/twitter-content.js` lines 73-120

---

## Permission Usage Policy

**Policy Requirement**: Extensions must request only the minimum permissions necessary for their functionality and provide clear justifications for each permission.

**Compliance Statement**: The Embed Link Helper extension requests only four permissions, each essential for its core functionality. No permissions are used for purposes beyond what is disclosed.

### Permission: `storage`

**Purpose**: Store user configuration preferences for hostname mappings

**Justification**: Users can customize which alternative hostnames to use for Twitter/X and Instagram. These preferences must persist across browser sessions.

**Usage in Code**:
- Configuration is stored in `browser.storage.sync` (syncs across user's devices)
- Only stores two hostname strings: `twitter.targetHostname` and `instagram.targetHostname`
- No personal data, browsing history, or user content is stored

**Code References**:
- Storage write: `background/background.js` lines 95-106
- Storage read: `background/background.js` lines 68-93
- Data structure: `config/config.js` lines 10-19

### Permission: `activeTab`

**Purpose**: Interact with the currently active tab when user clicks the extension icon

**Justification**: The extension popup needs to display current configuration and allow users to modify settings. The activeTab permission provides temporary access only when the user explicitly clicks the extension icon.

**Usage in Code**:
- Used only for popup interaction
- No background tab access or monitoring
- Access is temporary and user-initiated

**Code References**:
- Popup interface: `popup/popup.html` and `popup/popup.js`

### Host Permission: `*://x.com/*`

**Purpose**: Detect posts and inject copy buttons on Twitter/X pages

**Justification**: The extension must access Twitter/X pages to:
1. Detect individual posts in the timeline
2. Extract post URLs
3. Inject "Copy Link" buttons into each post's action bar

**Usage in Code**:
- Content script runs only on x.com domain
- Detects post containers using DOM queries
- Injects buttons with click handlers that transform URLs
- Does not modify post content, only adds UI elements
- Does not transmit any data externally

**Code References**:
- Content script: `content/twitter-content.js`
- Post detection: `utils/post-detector.js` lines 15-42
- URL extraction: `utils/post-url-extractor.js` lines 15-58
- Button injection: `utils/button-injector.js` lines 15-89

### Host Permission: `*://www.instagram.com/*`

**Purpose**: Detect posts and inject copy buttons on Instagram pages

**Justification**: The extension must access Instagram pages to:
1. Detect individual posts in the feed
2. Extract post URLs
3. Inject "Copy Link" buttons into each post's action bar

**Usage in Code**:
- Content script runs only on www.instagram.com domain
- Detects post containers using DOM queries
- Injects buttons with click handlers that transform URLs
- Does not modify post content, only adds UI elements
- Does not transmit any data externally

**Code References**:
- Content script: `content/instagram-content.js`
- Post detection: `utils/post-detector.js` lines 44-71
- URL extraction: `utils/post-url-extractor.js` lines 60-103
- Button injection: `utils/button-injector.js` lines 91-165

### Remote Code

**Statement**: The extension does not execute any remote code.

**Evidence**:
- All JavaScript files are bundled with the extension package
- No `eval()` or `Function()` constructor usage
- No external script loading via `<script>` tags
- No XMLHttpRequest or fetch() calls to external servers
- Content Security Policy prevents inline scripts

**Code References**:
- All scripts listed in `manifest.json` lines 16-52 are local files
- No network requests in any source files

---

## User Data Policy

**Policy Requirement**: Extensions must be transparent about data collection, usage, and sharing. User data must be handled securely and used only for disclosed purposes.

**Compliance Statement**: The Embed Link Helper extension collects minimal data (only user configuration preferences) and handles it with complete transparency. No user data is transmitted to external servers or shared with third parties.

### Data Collection

**What Data is Collected**:
- User configuration preferences only:
  - Twitter/X target hostname (e.g., "fixvx.com")
  - Instagram target hostname (e.g., "kkinstagram.com")

**What Data is NOT Collected**:
- No browsing history
- No personal information
- No user content or posts
- No authentication credentials
- No usage analytics or telemetry
- No tracking data

**Code References**:
- Data structure: `config/config.js` lines 10-19
- Storage operations: `background/background.js` lines 68-106

### Data Storage

**Where Data is Stored**:
- Locally in the browser using `browser.storage.sync` API
- Data syncs across user's devices via browser's built-in sync (if enabled by user)
- No external databases or servers

**Data Security**:
- Data is stored using browser's secure storage APIs
- No encryption needed as data is not sensitive (just hostname preferences)
- User can clear data anytime via browser settings or extension popup

**Code References**:
- Storage implementation: `background/background.js` lines 95-106

### Data Usage

**How Data is Used**:
- Configuration preferences are used solely to determine which hostname to use when transforming URLs
- When user clicks a "Copy Link" button, the extension:
  1. Reads the target hostname from storage
  2. Transforms the post URL by replacing the hostname
  3. Copies the transformed URL to clipboard
- No other usage of any kind

**Code References**:
- Configuration retrieval: `content/twitter-content.js` lines 42-63
- URL transformation: `utils/url-transformer.js` lines 56-88
- Clipboard operation: `utils/per-post-button.js` lines 35-75

### Data Sharing

**Third-Party Sharing**: None. The extension does not share any data with third parties.

**External Transmission**: None. The extension does not transmit any data to external servers.

**Evidence**:
- No network requests in any source files
- No analytics libraries or tracking pixels
- No API calls to external services
- All processing happens locally in the browser

**Code References**:
- Complete absence of `fetch()`, `XMLHttpRequest`, or similar network APIs in all source files

### User Control

**User Rights**:
- Users can modify configuration anytime via the extension popup
- Users can clear all extension data via browser settings
- Users can uninstall the extension to remove all data
- No data persists after uninstallation

**Code References**:
- Configuration UI: `popup/popup.js` lines 75-130
- Clear config function: `config/config.js` lines 115-125

---

## Content Policy

**Policy Requirement**: Extensions must not contain or promote illegal content, malware, deceptive practices, or violate user privacy.

**Compliance Statement**: The Embed Link Helper extension fully complies with Chrome's Content Policy. It contains no prohibited content and operates transparently.

### No Prohibited Content

**Compliance**:
- No malware, spyware, or malicious code
- No deceptive or misleading functionality
- No illegal content or promotion of illegal activities
- No hate speech, violence, or adult content
- No copyright infringement

**Evidence**:
- All source code is available for review
- Extension does exactly what it claims: transforms URLs and adds copy buttons
- No hidden functionality or obfuscated code
- No external content loading

### No Deceptive Practices

**Compliance**:
- Extension description accurately reflects functionality
- Permissions are clearly justified and necessary
- No misleading claims or false advertising
- No impersonation of other services or brands
- UI elements are clearly labeled as extension features

**Evidence**:
- Manifest description matches actual functionality
- Permission justifications are accurate (see Permission Usage Policy section)
- Injected buttons are styled distinctly and include extension branding
- No attempt to mimic native platform features deceptively

**Code References**:
- Button styling: `utils/button-styles.css` - clearly distinguishable from native buttons
- Button creation: `utils/per-post-button.js` lines 15-33 - includes clear labeling

### Privacy Respect

**Compliance**:
- No tracking or surveillance
- No data collection beyond disclosed configuration
- No user profiling or behavioral analysis
- Transparent about all functionality

**Evidence**:
- See User Data Policy section above for complete privacy compliance
- Extension operates entirely locally
- No external communication

### User Experience

**Compliance**:
- Does not interfere with normal website functionality
- Does not inject ads or promotional content
- Does not redirect users without consent
- Provides clear value to users

**Evidence**:
- Buttons are non-intrusive and optional to use
- No modification of existing page content
- No pop-ups, overlays, or interruptions
- Users control when and how to use the extension

**Code References**:
- Non-intrusive injection: `utils/button-injector.js` lines 15-89
- Optional usage: Users can simply ignore the buttons if they don't want to use them

---

## Additional Compliance Notes

### Manifest V2 Compliance

**Note**: This extension currently uses Manifest V2 for Firefox compatibility. The extension is designed to be easily upgradable to Manifest V3 when needed.

**Manifest V3 Readiness**:
- No use of remotely hosted code
- No use of `eval()` or similar dynamic code execution
- Background script can be converted to service worker
- All APIs used have Manifest V3 equivalents

**Code References**:
- Manifest file: `manifest.json`
- Firefox-specific manifest: `manifest-firefox.json`

### Security Best Practices

**Implementation**:
- Input validation on all user-provided data (hostnames)
- No use of `innerHTML` with untrusted content
- Content Security Policy compliance
- Secure storage API usage

**Code References**:
- Hostname validation: `config/config.js` lines 27-60
- Safe DOM manipulation: `utils/button-injector.js` uses `createElement()` and `appendChild()`

---

## Conclusion

The Embed Link Helper extension fully complies with all Chrome Developer Program Policies:

1. **Single Purpose**: Clearly defined, narrow functionality for link transformation
2. **Permission Usage**: Minimal permissions with clear justifications and appropriate usage
3. **User Data**: Transparent data handling with no external transmission or third-party sharing
4. **Content**: No prohibited content, deceptive practices, or privacy violations

All claims in this compliance document are verifiable through the extension's source code, which is available for review in the extension package.
