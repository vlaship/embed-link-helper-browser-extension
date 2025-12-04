# Social Media Link Transformer Browser Extension

A cross-browser extension (Chrome and Firefox) that transforms Twitter/X and Instagram links to alternative hostnames, enabling proper link previews in Discord, Telegram, and other messaging platforms. Integrates seamlessly with native share menus to copy transformed links directly from posts.

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
│   ├── twitter-share-menu.js    # Content script for Twitter/X (share menu integration)
│   └── instagram-share-menu.js  # Content script for Instagram (share menu integration)
├── popup/
│   ├── popup.html               # Popup interface HTML
│   ├── popup.css                # Popup styling
│   └── popup.js                 # Popup logic
├── config/
│   └── config.js                # Configuration management module
├── utils/
│   ├── post-detector.js         # Post container detection
│   ├── post-url-extractor.js    # URL extraction from posts
│   ├── share-menu-detector.js   # Share menu detection and monitoring
│   ├── share-menu-injector.js   # Menu item creation and injection
│   ├── feedback-manager.js      # Visual feedback for user actions
│   └── url-transformer.js       # URL hostname transformation
└── icons/
    ├── icon16.png               # 16x16 toolbar icon
    ├── icon48.png               # 48x48 management icon
    └── icon128.png              # 128x128 store icon
```

## Installation

### Chrome
1. **Build Chrome package**:
   ```bash
   npm run build:chrome
   ```
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `dist-chrome` directory

### Firefox
1. **Build Firefox package**:
   ```bash
   npm run build:firefox
   ```
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select the `manifest.json` file from the `dist-firefox` directory

**Note**: Chrome uses Manifest V3, while Firefox uses Manifest V2. The build scripts automatically create the correct version for each browser.

## Configuration

Click the extension icon in the browser toolbar to configure target hostnames for link transformation:
- **Twitter/X** (default: fixvx.com) - Provides reliable embeds for Twitter/X content
- **Instagram** (default: kkinstagram.com) - Provides reliable embeds for Instagram content

You can change these to any alternative hostname that provides better preview support for your preferred messaging platforms.

## Why Use This Extension?

Twitter/X and Instagram links often fail to show proper previews in messaging platforms like Discord, Telegram, Slack, and others. This extension transforms links to alternative hostnames (like fixvx.com for Twitter, kkinstagram.com for Instagram) that provide reliable embeds and previews.

**Use Case**: Share a tweet in Discord → Get a proper preview with images/videos instead of a broken link.

## Features

### Native Share Menu Integration
- **Seamless integration**: Adds "Copy embed link" option directly to Twitter/X and Instagram's native share menus
- **Hostname transformation**: Converts `x.com/user/status/123` → `fixvx.com/user/status/123`
- **Clipboard integration**: Click to copy the transformed link directly to your clipboard
- **Visual feedback**: Shows "✓ Copied!" confirmation when clicked
- **Native appearance**: Menu items match the platform's native styling and behavior

### Smart Detection
- **Automatic injection**: Menu items appear instantly when you open any share menu
- **Dynamic content handling**: Works with infinite scroll and dynamically loaded posts
- **Fast response**: Menu items appear within 200ms of opening a share menu
- **Multiple menu support**: Handles multiple share menus independently without conflicts

### Configuration
- **Customizable hostnames**: Configure target domains for Twitter/X (default: fixvx.com) and Instagram (default: kkinstagram.com)
- **Live updates**: Changes apply immediately without page reload
- **Persistent settings**: Configuration saved across browser sessions
- **Platform toggles**: Enable/disable the feature per platform

### Technical
- **URL preservation**: Maintains complete paths, query parameters, and hash fragments
- **Cross-browser compatible**: Works on Chrome and Firefox
- **Modular architecture**: Clean separation of concerns for maintainability
- **Graceful error handling**: Handles platform changes and missing elements without breaking

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

### Technology Stack
- Manifest V3 (Chrome) / V2 (Firefox)
- WebExtensions API for cross-browser support
- `webextension-polyfill` for API consistency
- Jest for unit testing
- fast-check for property-based testing

## How It Works

1. **Share Menu Detection**: MutationObserver watches for native share menus to appear on the page
2. **Post Association**: Identifies which post the share menu belongs to
3. **URL Extraction**: Extracts the unique URL for the post (handles regular posts, retweets, etc.)
4. **Menu Item Creation**: Creates a "Copy embed link" menu item styled to match the platform
5. **Menu Item Injection**: Injects the item into the share menu alongside native options
6. **Click Handler**: Transforms the URL hostname (e.g., `x.com` → `fixvx.com`) and copies to clipboard
7. **Visual Feedback**: Shows success/error feedback directly in the menu item
8. **Share**: Paste the transformed link in Discord, Telegram, etc. to get proper previews!

## Specifications

Detailed specifications available in `.kiro/specs/`:
- **Share Menu Integration**:
  - Requirements: `.kiro/specs/share-menu-integration/requirements.md`
  - Design: `.kiro/specs/share-menu-integration/design.md`
  - Tasks: `.kiro/specs/share-menu-integration/tasks.md`
- **Other Features**: See additional specs in `.kiro/specs/` directory

## License

MIT
