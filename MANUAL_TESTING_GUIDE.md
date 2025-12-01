# Manual Testing Guide - Social Media Redirector Extension

This guide provides step-by-step instructions for manually testing the Social Media Redirector extension on both Chrome and Firefox browsers.

## Prerequisites

Before testing, ensure:
- [ ] All automated tests pass (`npm test`)
- [ ] Extension files are built and ready
- [ ] You have Chrome (latest version) installed
- [ ] You have Firefox (latest version) installed
- [ ] You have active Twitter/X and Instagram accounts (or can access public pages)

## Test Environment Setup

### Chrome Setup

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the root directory of this extension project
6. Verify the extension appears in the list with:
   - Name: "Social Media Redirector"
   - Version: "1.0.0"
   - Status: Enabled (toggle should be ON)

### Firefox Setup

1. Open Firefox browser
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on..."
4. Navigate to the extension directory and select `manifest.json`
5. Verify the extension appears in the list with:
   - Name: "Social Media Redirector"
   - Version: "1.0.0"
   - Status: Enabled

**Note**: Firefox temporary add-ons are removed when Firefox closes. You'll need to reload for each testing session.

## Test Cases

### Test 1: Extension Installation and Icon Display
**Requirements: 4.1, 4.2**

#### Chrome
- [ ] Extension icon appears in the browser toolbar
- [ ] Clicking the icon opens the popup interface
- [ ] No console errors in extension background page (`chrome://extensions/` → Details → Inspect views: service worker)

#### Firefox
- [ ] Extension icon appears in the browser toolbar
- [ ] Clicking the icon opens the popup interface
- [ ] No console errors in extension background page (`about:debugging` → Inspect)

---

### Test 2: Popup Interface - Default Configuration
**Requirements: 3.1, 3.2, 3.4, 3.5**

#### Chrome
- [ ] Click extension icon to open popup
- [ ] Verify Twitter/X hostname field shows: `fixvx.com`
- [ ] Verify Instagram hostname field shows: `kkinstagram.com`
- [ ] Popup displays cleanly without layout issues
- [ ] No console errors in popup (right-click popup → Inspect)

#### Firefox
- [ ] Click extension icon to open popup
- [ ] Verify Twitter/X hostname field shows: `fixvx.com`
- [ ] Verify Instagram hostname field shows: `kkinstagram.com`
- [ ] Popup displays cleanly without layout issues
- [ ] No console errors in popup (right-click popup → Inspect)

---

### Test 3: Popup Interface - Configuration Persistence
**Requirements: 3.3, 6.1, 6.2**

#### Chrome
- [ ] Open popup and change Twitter/X hostname to: `test-twitter.com`
- [ ] Change Instagram hostname to: `test-instagram.com`
- [ ] Click "Save Configuration"
- [ ] Close popup
- [ ] Reopen popup
- [ ] Verify Twitter/X hostname shows: `test-twitter.com`
- [ ] Verify Instagram hostname shows: `test-instagram.com`
- [ ] Close and reopen Chrome browser
- [ ] Reopen popup and verify settings persisted

#### Firefox
- [ ] Open popup and change Twitter/X hostname to: `test-twitter.com`
- [ ] Change Instagram hostname to: `test-instagram.com`
- [ ] Click "Save Configuration"
- [ ] Close popup
- [ ] Reopen popup
- [ ] Verify Twitter/X hostname shows: `test-twitter.com`
- [ ] Verify Instagram hostname shows: `test-instagram.com`

**Note**: Firefox temporary add-ons lose data on browser restart. This is expected behavior.

---

### Test 4: Popup Interface - Hostname Validation
**Requirements: 7.3**

#### Chrome
- [ ] Open popup
- [ ] Try to save invalid hostname: `http://example.com` (with protocol)
- [ ] Verify error message appears
- [ ] Try to save invalid hostname: `example.com/path` (with path)
- [ ] Verify error message appears
- [ ] Try to save invalid hostname: `invalid..com` (double dots)
- [ ] Verify error message appears
- [ ] Try to save empty hostname: `` (empty string)
- [ ] Verify error message appears
- [ ] Try to save valid hostname: `valid-example.com`
- [ ] Verify save succeeds with no error

#### Firefox
- [ ] Repeat all validation tests from Chrome
- [ ] Verify identical behavior

---

### Test 5: Twitter/X Button Injection
**Requirements: 1.1, 1.4, 5.1, 5.2, 5.3, 5.4**

#### Chrome
- [ ] Reset configuration to defaults (Twitter: `fixvx.com`)
- [ ] Navigate to `https://x.com/`
- [ ] Wait up to 500ms for button to appear
- [ ] Verify redirect button is visible on the page
- [ ] Verify button has clear text/icon indicating purpose
- [ ] Verify button is visually distinct (styled differently from page content)
- [ ] Hover over button and verify visual feedback (hover effect)
- [ ] Verify button position is consistent and non-intrusive
- [ ] Open browser console (F12) and verify no errors

#### Firefox
- [ ] Repeat all Twitter/X button injection tests from Chrome
- [ ] Verify identical behavior and appearance

---

### Test 6: Twitter/X Redirect Functionality
**Requirements: 1.2, 1.3, 7.1, 7.2, 7.4**

#### Chrome
- [ ] Navigate to `https://x.com/elonmusk`
- [ ] Wait for redirect button to appear
- [ ] Click the redirect button
- [ ] Verify browser navigates to: `https://fixvx.com/elonmusk`
- [ ] Navigate to `https://x.com/user/status/123456?ref=source#reply`
- [ ] Click redirect button
- [ ] Verify URL becomes: `https://fixvx.com/user/status/123456?ref=source#reply`
- [ ] Verify path, query parameters, and hash are preserved

#### Firefox
- [ ] Repeat all Twitter/X redirect tests from Chrome
- [ ] Verify identical redirect behavior

---

### Test 7: Twitter/X SPA Navigation
**Requirements: 1.5**

#### Chrome
- [ ] Navigate to `https://x.com/`
- [ ] Verify redirect button appears
- [ ] Click on a tweet to open it (SPA navigation - URL changes without page reload)
- [ ] Verify redirect button updates or remains visible appropriately
- [ ] Navigate back using browser back button
- [ ] Verify redirect button still works correctly

#### Firefox
- [ ] Repeat all Twitter/X SPA navigation tests from Chrome
- [ ] Verify identical behavior

---

### Test 8: Instagram Button Injection
**Requirements: 2.1, 2.4, 5.1, 5.2, 5.3, 5.4**

#### Chrome
- [ ] Reset configuration to defaults (Instagram: `kkinstagram.com`)
- [ ] Navigate to `https://www.instagram.com/`
- [ ] Wait up to 500ms for button to appear
- [ ] Verify redirect button is visible on the page
- [ ] Verify button has clear text/icon indicating purpose
- [ ] Verify button is visually distinct (styled differently from page content)
- [ ] Hover over button and verify visual feedback (hover effect)
- [ ] Verify button position is consistent and non-intrusive
- [ ] Open browser console (F12) and verify no errors

#### Firefox
- [ ] Repeat all Instagram button injection tests from Chrome
- [ ] Verify identical behavior and appearance

---

### Test 9: Instagram Redirect Functionality
**Requirements: 2.2, 2.3, 7.1, 7.2, 7.4**

#### Chrome
- [ ] Navigate to `https://www.instagram.com/instagram`
- [ ] Wait for redirect button to appear
- [ ] Click the redirect button
- [ ] Verify browser navigates to: `https://kkinstagram.com/instagram`
- [ ] Navigate to `https://www.instagram.com/p/ABC123/?ref=share#comments`
- [ ] Click redirect button
- [ ] Verify URL becomes: `https://kkinstagram.com/p/ABC123/?ref=share#comments`
- [ ] Verify path, query parameters, and hash are preserved

#### Firefox
- [ ] Repeat all Instagram redirect tests from Chrome
- [ ] Verify identical redirect behavior

---

### Test 10: Instagram SPA Navigation
**Requirements: 2.5**

#### Chrome
- [ ] Navigate to `https://www.instagram.com/`
- [ ] Verify redirect button appears
- [ ] Click on a post to open it (SPA navigation - URL changes without page reload)
- [ ] Verify redirect button updates or remains visible appropriately
- [ ] Navigate back using browser back button
- [ ] Verify redirect button still works correctly

#### Firefox
- [ ] Repeat all Instagram SPA navigation tests from Chrome
- [ ] Verify identical behavior

---

### Test 11: Custom Hostname Configuration
**Requirements: 3.3, 3.4, 3.5**

#### Chrome
- [ ] Open popup and set Twitter/X hostname to: `custom-twitter.com`
- [ ] Set Instagram hostname to: `custom-instagram.com`
- [ ] Click "Save Configuration"
- [ ] Navigate to `https://x.com/test`
- [ ] Click redirect button
- [ ] Verify navigation to: `https://custom-twitter.com/test`
- [ ] Navigate to `https://www.instagram.com/test`
- [ ] Click redirect button
- [ ] Verify navigation to: `https://custom-instagram.com/test`

#### Firefox
- [ ] Repeat all custom hostname tests from Chrome
- [ ] Verify identical behavior

---

### Test 12: Button Injection Idempotence
**Requirements: 1.1, 2.1**

#### Chrome
- [ ] Navigate to `https://x.com/`
- [ ] Wait for button to appear
- [ ] Count the number of redirect buttons (should be 1)
- [ ] Refresh the page (F5)
- [ ] Verify only 1 redirect button appears (no duplicates)
- [ ] Repeat for Instagram: `https://www.instagram.com/`

#### Firefox
- [ ] Repeat button idempotence tests from Chrome
- [ ] Verify identical behavior

---

### Test 13: URL Pattern Specificity
**Requirements: 7.5**

#### Chrome
- [ ] Navigate to `https://facebook.com/`
- [ ] Verify NO redirect button appears
- [ ] Navigate to `https://youtube.com/`
- [ ] Verify NO redirect button appears
- [ ] Navigate to `https://twitter.com/` (old domain)
- [ ] Verify NO redirect button appears (only x.com should trigger)

#### Firefox
- [ ] Repeat URL pattern tests from Chrome
- [ ] Verify identical behavior

---

### Test 14: Storage Error Handling
**Requirements: 6.3, 6.4**

#### Chrome
- [ ] Open `chrome://extensions/`
- [ ] Find the extension and click "Details"
- [ ] Click "Remove" to uninstall
- [ ] Reinstall the extension
- [ ] Open popup immediately
- [ ] Verify default values appear (no errors)
- [ ] Verify extension functions normally

#### Firefox
- [ ] Remove and reload the temporary add-on
- [ ] Open popup immediately
- [ ] Verify default values appear (no errors)
- [ ] Verify extension functions normally

---

### Test 15: Cross-Browser Consistency
**Requirements: 4.1, 4.2, 4.3**

Compare behavior between Chrome and Firefox:

- [ ] Button appearance is consistent across browsers
- [ ] Button positioning is consistent across browsers
- [ ] Popup interface looks identical in both browsers
- [ ] Redirect functionality works identically
- [ ] Configuration persistence works identically (accounting for Firefox temporary add-on limitations)
- [ ] Error messages are consistent
- [ ] Performance is similar (button injection within 500ms)

---

## Test Results Summary

### Chrome Results
- Total Tests: ___
- Passed: ___
- Failed: ___
- Notes: ___

### Firefox Results
- Total Tests: ___
- Passed: ___
- Failed: ___
- Notes: ___

### Issues Found
List any issues discovered during testing:

1. 
2. 
3. 

### Browser-Specific Issues
Note any differences in behavior between Chrome and Firefox:

1. 
2. 
3. 

## Troubleshooting

### Button Not Appearing
- Check browser console for errors
- Verify content script is injected (check Sources/Debugger tab)
- Verify URL matches pattern exactly
- Try refreshing the page

### Popup Not Opening
- Check if extension is enabled
- Check for manifest errors in extension management page
- Try reloading the extension

### Configuration Not Saving
- Check browser console in popup for errors
- Verify storage permissions in manifest
- Check if storage quota is exceeded

### Redirects Not Working
- Verify target hostname is valid
- Check browser console for navigation errors
- Verify URL transformation logic in console

## Sign-Off

Tester Name: _______________
Date: _______________
Chrome Version: _______________
Firefox Version: _______________

- [ ] All critical tests passed on Chrome
- [ ] All critical tests passed on Firefox
- [ ] Extension meets requirements 4.1 and 4.2
- [ ] Ready for release

