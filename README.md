# Social Media Link Transformer Browser Extension

A cross-browser extension (Chrome and Firefox) that transforms Twitter/X and Instagram links to alternative hostnames, enabling proper link previews in Discord, Telegram, and other messaging platforms. Adds convenient per-post buttons to copy transformed links directly from your timeline.

## Project Structure

```
.
├── manifest.json                 # Extension manifest (Manifest V3 for Chrome)
├── manifest-firefox.json         # Firefox-specific manifest (Manifest V2)
├── lib/
│   └── browser-polyfill.js      # WebExtension polyfill for cross-browser compatibility
├── background/
│   └── background.js            # Background service worker
├── content/
│   ├── twitter-content.js       # Content script for Twitter/X (per-post buttons)
│   └── instagram-content.js     # Content script for Instagram (per-post buttons)
├── popup/
│   ├── popup.html               # Popup interface HTML
│   ├── popup.css                # Popup styling
│   └── popup.js                 # Popup logic
├── config/
│   └── config.js                # Configuration management module
├── utils/
│   ├── post-detector.js         # Post container detection
│   ├── post-url-extractor.js    # URL extraction from posts
│   ├── per-post-button.js       # Button creation and styling
│   ├── button-injector.js       # Button injection logic
│   └── post-registry.js         # Post tracking and deduplication
└── icons/
    ├── icon16.png               # 16x16 toolbar icon
    ├── icon48.png               # 48x48 management icon
    └── icon128.png              # 128x128 store icon
```

## Installation

### Chrome
1. **Switch to Chrome version** (if not already):
   ```bash
   node switch-to-chrome.js
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

### Firefox
1. **Switch to Firefox version** (if not already):
   ```bash
   node switch-to-firefox.js
   ```
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the extension directory

**Note**: Chrome requires Manifest V3, while Firefox uses Manifest V2. Use the switch scripts to toggle between versions.

## Configuration

Click the extension icon in the browser toolbar to configure target hostnames for link transformation:
- **Twitter/X** (default: fixvx.com) - Provides reliable embeds for Twitter/X content
- **Instagram** (default: kkinstagram.com) - Provides reliable embeds for Instagram content

You can change these to any alternative hostname that provides better preview support for your preferred messaging platforms.

## Why Use This Extension?

Twitter/X and Instagram links often fail to show proper previews in messaging platforms like Discord, Telegram, Slack, and others. This extension transforms links to alternative hostnames (like fixvx.com for Twitter, kkinstagram.com for Instagram) that provide reliable embeds and previews.

**Use Case**: Share a tweet in Discord → Get a proper preview with images/videos instead of a broken link.

## Features

### Per-Post Link Transformation
- **Individual buttons on each post**: Every tweet and Instagram post gets its own "Copy Link" button
- **Hostname transformation**: Converts `x.com/user/status/123` → `fixvx.com/user/status/123`
- **Clipboard integration**: Click to copy the transformed link directly to your clipboard
- **Visual feedback**: Button shows "✓ Copied!" confirmation when clicked
- **Seamless integration**: Buttons match the native platform design (Twitter blue, Instagram pink)

### Smart Detection
- **Automatic injection**: Buttons appear on all visible posts as you scroll
- **Dynamic content handling**: Works with infinite scroll and virtual scrolling
- **Periodic recheck**: Ensures buttons persist even when Twitter/X recycles DOM elements (every 2 seconds)
- **Fast response**: Buttons appear within 100ms of new posts loading

### Configuration
- **Customizable hostnames**: Configure target domains for Twitter/X (default: fixvx.com) and Instagram (default: kkinstagram.com)
- **Live updates**: Changes apply immediately without page reload
- **Persistent settings**: Configuration saved across browser sessions

### Technical
- **URL preservation**: Maintains complete paths, query parameters, and hash fragments
- **Cross-browser compatible**: Works on Chrome and Firefox
- **Modular architecture**: Clean separation of concerns for maintainability

## Cross-Browser Compatibility

This extension works on both Chrome and Firefox using the WebExtensions API standard:

- **Chrome**: Uses Manifest V3 with service workers
- **Firefox**: Compatible with both Manifest V2 and V3
- **Polyfill**: Uses `webextension-polyfill` for consistent Promise-based API

All browser API calls use the `browser` namespace with Promises, ensuring consistent behavior across browsers.

For detailed compatibility information, see [CROSS_BROWSER_COMPATIBILITY.md](CROSS_BROWSER_COMPATIBILITY.md).

## Development

### Setup
```bash
npm install
```

### Testing
```bash
npm test
```

### Building for Different Browsers

The extension uses different manifest versions for Chrome and Firefox.

#### Build Packages (Recommended)

Create distributable packages in separate folders:

```bash
# Build Firefox package (outputs to dist-firefox/)
npm run build:firefox

# Build Chrome package (outputs to dist-chrome/)
npm run build:chrome

# Build both
npm run build:all
```

The build scripts create clean packages ready for distribution or loading in the browser.

#### Switch Manifest (Development)

For development in the main directory:

```bash
# Switch to Firefox (Manifest V2)
npm run switch:firefox

# Switch to Chrome (Manifest V3)
npm run switch:chrome
```

### Technology Stack
- Manifest V3 (Chrome) / V2 (Firefox)
- WebExtensions API for cross-browser support
- `webextension-polyfill` for API consistency
- Jest for unit testing
- fast-check for property-based testing

## How It Works

1. **Post Detection**: Scans the timeline for tweet/post containers using platform-specific selectors
2. **URL Extraction**: Extracts the unique URL for each post (handles regular posts, retweets, etc.)
3. **Button Creation**: Creates a styled "Copy Link" button with clipboard functionality
4. **Button Injection**: Injects the button into the post's action bar (next to like/retweet/share)
5. **Continuous Monitoring**: MutationObserver watches for new posts + periodic recheck every 2 seconds
6. **Click Handler**: Transforms the URL hostname (e.g., `x.com` → `fixvx.com`) and copies to clipboard
7. **Share**: Paste the transformed link in Discord, Telegram, etc. to get proper previews!

## Specifications

Detailed specifications available in `.kiro/specs/`:
- **Requirements**: `.kiro/specs/per-post-redirect-buttons/requirements.md`
- **Design**: `.kiro/specs/per-post-redirect-buttons/design.md`
- **Tasks**: `.kiro/specs/per-post-redirect-buttons/tasks.md`

## License

MIT
