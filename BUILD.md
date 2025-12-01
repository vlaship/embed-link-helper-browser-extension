# Build Guide

This document explains how to build the extension for Firefox and Chrome.

## Quick Start

### Build Firefox Package
```bash
npm run build:firefox
```
Output: `dist-firefox/` directory with Firefox-ready extension

### Build Chrome Package
```bash
npm run build:chrome
```
Output: `dist-chrome/` directory with Chrome-ready extension

### Build Both
```bash
npm run build:all
```

## What Gets Built

Each build creates a clean distribution folder containing:
- Correct manifest file (V2 for Firefox, V3 for Chrome)
- All source code (background, content, popup, utils, config)
- Icons (PNG format)
- Browser polyfill library

## Loading Built Extensions

### Firefox
1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to `dist-firefox/` and select `manifest.json`

### Chrome
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `dist-chrome/` directory

## Creating Distribution Packages

### For Firefox Add-ons (AMO)

```bash
cd dist-firefox
zip -r ../social-media-redirector-firefox.zip *
```

Or on Windows PowerShell:
```powershell
cd dist-firefox
Compress-Archive -Path * -DestinationPath ../social-media-redirector-firefox.zip
```

Upload `social-media-redirector-firefox.zip` to https://addons.mozilla.org/developers/

### For Chrome Web Store

```bash
cd dist-chrome
zip -r ../social-media-redirector-chrome.zip *
```

Or on Windows PowerShell:
```powershell
cd dist-chrome
Compress-Archive -Path * -DestinationPath ../social-media-redirector-chrome.zip
```

Upload `social-media-redirector-chrome.zip` to https://chrome.google.com/webstore/devconsole

## Development Workflow

For active development, you can work directly in the main directory:

### Switch Between Browsers

```bash
# For Firefox development
npm run switch:firefox

# For Chrome development
npm run switch:chrome
```

This modifies `manifest.json` in the main directory.

### Reload After Changes

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Reload" button on your extension
3. Refresh any open Twitter/Instagram tabs

**Chrome:**
1. Go to `chrome://extensions/`
2. Click refresh icon (🔄) on your extension
3. Refresh any open Twitter/Instagram tabs

## Build Scripts

### `build-firefox-package.js`
- Copies all necessary files to `dist-firefox/`
- Renames `manifest-firefox.json` to `manifest.json`
- Excludes development files (tests, docs, etc.)

### `build-chrome-package.js`
- Copies all necessary files to `dist-chrome/`
- Renames `manifest-v3.json` to `manifest.json`
- Excludes development files (tests, docs, etc.)

## Clean Build

To start fresh:

```bash
# Remove dist directories
rm -rf dist-firefox dist-chrome

# Or on Windows
rmdir /s /q dist-firefox dist-chrome

# Rebuild
npm run build:all
```

## Manifest Versions

### Firefox (Manifest V2)
- Uses `background.scripts`
- Uses `browser_action`
- Permissions in single array
- Requires `browser-polyfill.js`

### Chrome (Manifest V3)
- Uses `background.service_worker`
- Uses `action`
- Separate `host_permissions`
- Native Promise support

## Testing Before Distribution

Before creating distribution packages:

1. **Run tests:**
   ```bash
   npm test
   ```

2. **Build packages:**
   ```bash
   npm run build:all
   ```

3. **Test Firefox build:**
   - Load `dist-firefox/` in Firefox
   - Test all features (see MANUAL_TESTING_CHECKLIST.md)

4. **Test Chrome build:**
   - Load `dist-chrome/` in Chrome
   - Test all features (see MANUAL_TESTING_CHECKLIST.md)

5. **Create distribution packages:**
   - Create .zip files as shown above
   - Test loading the .zip files in browsers

## Troubleshooting

### "Manifest version not supported"
- Make sure you're loading the correct dist folder
- Firefox needs `dist-firefox/`
- Chrome needs `dist-chrome/`

### "Files missing in dist folder"
- Check `build-firefox-package.js` or `build-chrome-package.js`
- Ensure all required directories are in `filesToCopy` array
- Rebuild: `npm run build:all`

### "Extension doesn't work after build"
- Verify all source files are copied
- Check browser console for errors
- Compare dist folder with main directory

## CI/CD Integration

For automated builds:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build packages
npm run build:all

# Create distribution archives
cd dist-firefox && zip -r ../firefox.zip * && cd ..
cd dist-chrome && zip -r ../chrome.zip * && cd ..
```

## Version Updates

When updating version:

1. Update `version` in `package.json`
2. Update `version` in `manifest-firefox.json`
3. Update `version` in `manifest-v3.json`
4. Rebuild: `npm run build:all`
5. Create new distribution packages
