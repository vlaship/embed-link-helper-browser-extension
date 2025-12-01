# Testing Setup Instructions

## Quick Start for Manual Testing

### 1. Icon Files (Required for Loading Extension)

The extension requires icon files to load properly. You have two options:

#### Option A: Use Placeholder Icons (Quick)
Create simple colored PNG files with any image editor:
- `icons/icon16.png` - 16x16 pixels
- `icons/icon48.png` - 48x48 pixels  
- `icons/icon128.png` - 128x128 pixels

You can use any simple image (even a solid color square) for testing purposes.

#### Option B: Use Online Icon Generator
1. Visit https://www.favicon-generator.org/
2. Upload any image or create a simple design
3. Download the generated icons
4. Rename and place them in the `icons/` directory

### 2. Verify Extension Files

Ensure these files exist:
- ✓ `manifest.json` (for Chrome)
- ✓ `manifest-firefox.json` (for Firefox)
- ✓ `background/background.js`
- ✓ `content/twitter-content.js`
- ✓ `content/instagram-content.js`
- ✓ `popup/popup.html`
- ✓ `popup/popup.js`
- ✓ `lib/browser-polyfill.js`
- ⚠ `icons/icon16.png` (needs to be created)
- ⚠ `icons/icon48.png` (needs to be created)
- ⚠ `icons/icon128.png` (needs to be created)

### 3. Load Extension in Chrome

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select this extension's root directory
6. The extension should appear in the list

**Note**: If you see an error about missing icons, create placeholder PNG files as described above.

### 4. Load Extension in Firefox

Firefox can work with the current manifest.json (it includes browser_specific_settings for Firefox).

1. Open Firefox
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Select `manifest.json` from this directory
5. The extension should appear in the list

**Alternative**: Use the Firefox-specific manifest:
```bash
npm run build:firefox
```
Then load the extension. To restore Chrome manifest:
```bash
npm run build:chrome
```

### 5. Begin Manual Testing

Follow the comprehensive test cases in `MANUAL_TESTING_GUIDE.md`.

## Troubleshooting

### "Could not load icon" Error
- Create placeholder PNG files in the `icons/` directory
- Ensure files are named exactly: `icon16.png`, `icon48.png`, `icon128.png`
- Ensure files are valid PNG format

### Extension Won't Load
- Check browser console for specific errors
- Verify all required files exist
- Ensure manifest.json is valid JSON (no syntax errors)

### Content Scripts Not Running
- Check that you're visiting the exact URLs: `https://x.com/*` or `https://www.instagram.com/*`
- Open browser console on the page (F12) and check for errors
- Verify content scripts are listed in manifest.json

### Popup Won't Open
- Ensure popup files exist: `popup/popup.html`, `popup/popup.js`
- Check browser console for errors
- Try reloading the extension

## Ready to Test?

Once icons are created and the extension loads without errors:
1. ✓ Extension appears in browser toolbar
2. ✓ Clicking icon opens popup
3. ✓ No errors in extension management page

Proceed to `MANUAL_TESTING_GUIDE.md` for comprehensive testing.

