# Cross-Browser Compatibility Guide

This extension is designed to work on both Chrome and Firefox browsers using the WebExtensions API standard.

## Compatibility Layer

The extension uses the `webextension-polyfill` library to ensure consistent API usage across browsers:

- **Chrome**: Uses the polyfill to convert callback-based `chrome.*` APIs to Promise-based `browser.*` APIs
- **Firefox**: Has native `browser.*` namespace with Promise support

## File Structure

```
lib/
  browser-polyfill.js       # Polyfill library for Chrome compatibility
manifest.json               # Manifest V3 for Chrome
manifest-firefox.json       # Manifest V2 for Firefox (optional)
```

## Manifest Differences

### Chrome (Manifest V3)
- Uses `service_worker` for background script
- Uses `action` for browser action
- Requires `host_permissions` separate from `permissions`

### Firefox (Manifest V2 - Optional)
- Uses `scripts` array for background scripts
- Uses `browser_action` instead of `action`
- Combines permissions and host permissions

## API Usage

All browser API calls use the `browser` namespace with Promises:

```javascript
// ✅ Correct - Promise-based
const result = await browser.storage.sync.get('config');

// ❌ Incorrect - Callback-based (old Chrome style)
chrome.storage.sync.get('config', (result) => { ... });
```

## Loading the Polyfill

### Content Scripts
The polyfill is loaded automatically before content scripts via manifest.json:

```json
"content_scripts": [
  {
    "matches": ["*://x.com/*"],
    "js": ["lib/browser-polyfill.js", "content/twitter-content.js"]
  }
]
```

### Popup
The polyfill is loaded in popup.html before popup.js:

```html
<script src="../lib/browser-polyfill.js"></script>
<script src="popup.js"></script>
```

### Background Script
For Chrome MV3 service workers, the polyfill is imported using `importScripts()`:

```javascript
if (typeof importScripts === 'function') {
  importScripts('../lib/browser-polyfill.js');
}
```

## Testing on Different Browsers

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the extension directory

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` (or `manifest-firefox.json` if using MV2)

## Browser-Specific Settings

The manifest includes `browser_specific_settings` for Firefox:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "social-media-redirector@example.com",
    "strict_min_version": "109.0"
  }
}
```

This is ignored by Chrome and used by Firefox for extension identification.

## Known Differences

1. **Service Workers vs Background Scripts**
   - Chrome MV3 uses service workers (event-driven, no persistent state)
   - Firefox MV2 uses persistent background scripts
   - Our code is designed to work in both environments

2. **Storage API**
   - Both browsers support `browser.storage.sync`
   - Chrome has quota limits (100KB for sync storage)
   - Firefox has similar limits

3. **Message Passing**
   - Both support `browser.runtime.sendMessage()` with Promises
   - The polyfill ensures consistent behavior

## Requirements Validation

This implementation satisfies:

- **Requirement 4.1**: Extension functions on Chrome with all features
- **Requirement 4.2**: Extension functions on Firefox with all features  
- **Requirement 4.3**: Uses WebExtensions API standard compatible with both browsers

## Updating the Polyfill

To update the polyfill to a newer version:

```bash
npm install webextension-polyfill@latest
copy node_modules\webextension-polyfill\dist\browser-polyfill.min.js lib\browser-polyfill.js
```

## Resources

- [WebExtensions API Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [webextension-polyfill on GitHub](https://github.com/mozilla/webextension-polyfill)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Firefox Extension Workshop](https://extensionworkshop.com/)
