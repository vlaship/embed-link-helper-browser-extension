# Manual Testing Checklist for Per-Post Redirect Buttons

## Summary of Changes

### 1. Fixed Twitter/X Initialization Issue
- Changed `run_at` from `document_idle` to `document_end` in manifest.json
- Added retry logic to handle Twitter's SPA loading
- Buttons should now appear on initial page load without requiring extension reload

### 2. Changed Button Behavior
- **Old behavior**: Click button → Navigate to alternative site
- **New behavior**: Click button → Copy alternative link to clipboard
- Button shows feedback: "✓ Copied!" (green) or "❌ Failed" (red)

### 3. Updated Button Appearance
- **Icon**: Changed from 🔄 to 📋 (clipboard icon)
- **Text**: Changed from "Redirect" to "Copy Link"
- **Tooltip**: Updated to "Copy alternative link to clipboard"

### 4. Fixed Disappearing Buttons on Scroll
- Buttons now persist when scrolling up and down
- Handles Twitter's virtual scrolling (DOM element recreation)
- Verifies button exists in DOM before skipping injection
- See [SCROLLING_FIX.md](SCROLLING_FIX.md) for technical details

## Testing Checklist

### Prerequisites
- [ ] PNG icons generated (already done ✓)

#### For Firefox Testing:
- [ ] Run `node switch-to-firefox.js` (or `npm run build:firefox`)
- [ ] Load extension in Firefox (about:debugging)

#### For Chrome Testing:
- [ ] Run `node switch-to-chrome.js` (or `npm run build:chrome`)
- [ ] Load extension in Chrome (chrome://extensions/)

**Note**: Chrome requires Manifest V3, Firefox uses Manifest V2. The switch scripts handle this automatically.

### Twitter/X Testing

#### Initial Load
- [ ] Navigate to https://x.com
- [ ] Wait for timeline to load
- [ ] Verify "Copy Link" buttons appear on tweets WITHOUT reloading extension
- [ ] Verify buttons have clipboard icon (📋) and "Copy Link" text

#### Button Functionality
- [ ] Click a "Copy Link" button on a regular tweet
- [ ] Verify button shows "✓ Copied!" feedback
- [ ] Paste clipboard content - should be alternative URL (e.g., https://fixvx.com/user/status/123)
- [ ] Test on a retweet - verify it copies the original tweet URL
- [ ] Test on a quoted tweet

#### Dynamic Content
- [ ] Scroll down to load more tweets
- [ ] Verify new tweets get "Copy Link" buttons within ~500ms
- [ ] Continue scrolling and verify buttons appear consistently

#### Visual Integration
- [ ] Verify button styling matches Twitter's design language
- [ ] Verify button position is consistent across different tweet types
- [ ] Hover over button - verify hover effect works
- [ ] Check button doesn't break tweet layout

### Instagram Testing

#### Initial Load
- [ ] Navigate to https://www.instagram.com
- [ ] Wait for feed to load
- [ ] Verify "Copy Link" buttons appear on posts
- [ ] Verify buttons have clipboard icon (📋) and "Copy Link" text

#### Button Functionality
- [ ] Click a "Copy Link" button on a regular post
- [ ] Verify button shows "✓ Copied!" feedback
- [ ] Paste clipboard content - should be alternative URL (e.g., https://kkinstagram.com/p/ABC123/)
- [ ] Test on a Reel post

#### Dynamic Content
- [ ] Scroll down to load more posts
- [ ] Verify new posts get "Copy Link" buttons within ~500ms
- [ ] Continue scrolling and verify buttons appear consistently

#### Visual Integration
- [ ] Verify button styling matches Instagram's design language
- [ ] Verify button position is consistent across different post types
- [ ] Hover over button - verify hover effect works
- [ ] Check button doesn't break post layout

### Configuration Testing

#### Twitter Configuration
- [ ] Open extension popup
- [ ] Change Twitter target hostname (e.g., to "nitter.net")
- [ ] Go back to Twitter tab (don't reload)
- [ ] Click a "Copy Link" button
- [ ] Verify copied URL uses new hostname

#### Instagram Configuration
- [ ] Open extension popup
- [ ] Change Instagram target hostname (e.g., to "imginn.com")
- [ ] Go back to Instagram tab (don't reload)
- [ ] Click a "Copy Link" button
- [ ] Verify copied URL uses new hostname

#### Disable/Enable
- [ ] Disable Twitter in popup
- [ ] Verify existing buttons disappear from Twitter
- [ ] Re-enable Twitter
- [ ] Verify buttons reappear

### Performance Testing

#### Many Posts Loaded
- [ ] Scroll extensively on Twitter (load 50+ tweets)
- [ ] Verify page remains responsive
- [ ] Verify no memory leaks (check browser task manager)
- [ ] Verify buttons continue to appear on new content

- [ ] Scroll extensively on Instagram (load 30+ posts)
- [ ] Verify page remains responsive
- [ ] Verify no memory leaks
- [ ] Verify buttons continue to appear on new content

### Edge Cases

#### Error Handling
- [ ] Find a post with unusual structure (if possible)
- [ ] Verify extension doesn't crash
- [ ] Check browser console for errors

#### Navigation
- [ ] Navigate from timeline to profile page
- [ ] Verify buttons appear on profile tweets/posts
- [ ] Navigate back to timeline
- [ ] Verify buttons still work

#### Multiple Tabs
- [ ] Open Twitter in two tabs
- [ ] Verify buttons work in both tabs
- [ ] Change config in popup
- [ ] Verify both tabs update

## Known Issues

### Test Environment Limitations
- Integration tests show clipboard errors in Jest/JSDOM environment
- This is expected - clipboard API works fine in real browsers
- Tests verify the button creation and injection logic correctly

## Success Criteria

All checkboxes above should be checked, with:
- ✅ Buttons appear on initial load (no extension reload needed)
- ✅ Clicking buttons copies alternative URLs to clipboard
- ✅ Visual feedback shows copy success/failure
- ✅ Buttons integrate naturally with platform UI
- ✅ Configuration changes work without page reload
- ✅ Performance remains good with many posts loaded

## Reporting Issues

If you find any issues during testing, please note:
1. Which platform (Twitter/X or Instagram)
2. What action you performed
3. What you expected to happen
4. What actually happened
5. Any console errors (F12 → Console tab)
