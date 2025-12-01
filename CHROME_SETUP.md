# Chrome Setup Guide

## Quick Start

The extension is now configured for Chrome (Manifest V3). Follow these steps to load it:

### 1. Verify Chrome Version
Make sure you're using Chrome version 88 or later (Manifest V3 support).

### 2. Load Extension in Chrome

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select this directory: `C:\prj\js\twi-insta-prefix-extension`
6. The extension should now appear in your extensions list

### 3. Verify Installation

- You should see "Social Media Redirector" in your extensions list
- The extension icon should appear in your Chrome toolbar
- Click the icon to open the popup and configure hostnames

### 4. Test the Extension

1. Navigate to https://x.com (Twitter)
2. Wait for tweets to load
3. Look for "Copy Link" buttons (📋) on each tweet
4. Click a button - it should copy the alternative URL to your clipboard
5. Paste somewhere to verify (Ctrl+V)

## Switching Between Browsers

### To Switch Back to Firefox:
```bash
node switch-to-firefox.js
```
or
```bash
npm run build:firefox
```

### To Switch to Chrome:
```bash
node switch-to-chrome.js
```
or
```bash
npm run build:chrome
```

## Key Differences: Chrome vs Firefox

| Feature | Chrome (MV3) | Firefox (MV2) |
|---------|--------------|---------------|
| Manifest Version | 3 | 2 |
| Background | Service Worker | Background Script |
| Permissions | Separate `host_permissions` | Combined in `permissions` |
| Action | `action` | `browser_action` |
| Polyfill | Not needed in content scripts | Loaded via manifest |

## Troubleshooting

### "Cannot install extension because it uses an unsupported manifest version"
- Make sure you ran `node switch-to-chrome.js`
- Verify `manifest.json` shows `"manifest_version": 3`

### Extension loads but buttons don't appear
- Check the browser console (F12) for errors
- Make sure you're on https://x.com or https://www.instagram.com
- Try refreshing the page

### Clipboard not working
- Chrome requires the `clipboardWrite` permission (already added)
- Make sure you're clicking the button (not just hovering)
- Check if clipboard access is blocked by browser settings

### Service Worker errors
- Chrome MV3 uses service workers instead of background pages
- Check `chrome://extensions/` → Click "Errors" button for details
- Service workers may go inactive - this is normal behavior

## Chrome-Specific Features

### Service Worker Lifecycle
- Chrome MV3 service workers can go inactive after 30 seconds of inactivity
- They automatically wake up when needed (e.g., when receiving messages)
- This is normal and doesn't affect functionality

### Permissions
- Chrome MV3 separates `permissions` and `host_permissions`
- Users see clearer permission requests
- `clipboardWrite` permission allows copying to clipboard

## Development Tips

### Reload Extension After Changes
1. Go to `chrome://extensions/`
2. Click the refresh icon (🔄) on your extension card
3. Refresh any open Twitter/Instagram tabs

### View Service Worker Console
1. Go to `chrome://extensions/`
2. Click "service worker" link under your extension
3. This opens DevTools for the background service worker

### Debug Content Scripts
1. Open a Twitter or Instagram page
2. Press F12 to open DevTools
3. Content script logs appear in the page console
4. Look for `[twitter-content]` or `[instagram-content]` prefixes

## Reloading Extension After Code Changes

After making code changes, you need to reload the extension:

1. Go to `chrome://extensions/`
2. Find "Social Media Redirector"
3. Click the **refresh icon (🔄)** on the extension card
4. Refresh any open Twitter/Instagram tabs (F5 or Ctrl+R)

**Important**: You must refresh both the extension AND the web pages for changes to take effect.

## Next Steps

Once the extension is loaded and working:
1. Follow the [MANUAL_TESTING_CHECKLIST.md](MANUAL_TESTING_CHECKLIST.md)
2. Test all features on both Twitter and Instagram
3. Try changing configuration through the popup
4. Test with many posts loaded (scroll extensively)
5. **Test scrolling up and down** - buttons should persist (see [SCROLLING_FIX.md](SCROLLING_FIX.md))

## Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Check the service worker console (chrome://extensions/)
3. Verify you're using the Chrome version of the manifest
4. Try reloading the extension
