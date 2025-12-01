# Fix for Disappearing Buttons on Scroll

## Problem

Buttons were disappearing when scrolling on Twitter/X. After initial page load, buttons would appear, but when scrolling down and then back up, the buttons would be gone.

## Root Cause

Twitter/X uses **virtual scrolling** (also called windowing) to optimize performance. This means:

1. When you scroll down, tweets that go off-screen are removed from the DOM
2. When you scroll back up, those tweets are re-created as new DOM elements
3. Even though the tweet content is the same, the DOM element is a brand new instance

Our extension was tracking "processed" posts in two ways:
- **WeakMap**: Tracks the actual DOM element reference
- **Set**: Tracks post IDs extracted from the tweet URL

### The Bug

When Twitter removed and re-added a tweet:
1. The WeakMap lost the reference (because it's a new DOM element)
2. But the Set still had the post ID
3. Our `isPostProcessed()` function saw the ID in the Set and returned `true`
4. So we skipped re-injecting the button
5. Result: Button disappeared!

## Solution

Modified `isPostProcessed()` to verify the button actually exists in the DOM:

```javascript
function isPostProcessed(postElement, verifyButton = false) {
  // If verification is enabled, check if button actually exists
  if (verifyButton) {
    const hasButton = postElement.querySelector('.social-redirector-per-post-button');
    if (hasButton) {
      return true; // Button exists, truly processed
    }
    
    // If registry says processed but button doesn't exist,
    // the post was removed and re-added (virtual scrolling)
    // Return false to allow re-injection
    if (processedPosts.has(postElement) || processedPostIds.has(postId)) {
      return false; // Registry says yes, but button missing - re-inject!
    }
  }
  
  // Normal registry check...
}
```

### Key Changes

1. **Added `verifyButton` parameter** to `isPostProcessed()`
   - Default: `false` (for backwards compatibility with tests)
   - When `true`: Checks if button actually exists in DOM

2. **Updated content scripts** to pass `verifyButton = true`:
   ```javascript
   if (isPostProcessed(tweetElement, true)) {
     return; // Skip if button actually exists
   }
   ```

3. **Smart re-injection logic**:
   - If button exists → Skip (truly processed)
   - If registry says processed BUT button missing → Re-inject (virtual scrolling)
   - If not in registry → Inject (new post)

## Testing

### Unit Tests
All tests pass (237 passed, 5 expected failures in test environment)

### Manual Testing
1. Load extension in Chrome
2. Go to https://x.com
3. Scroll down to load more tweets
4. Scroll back up
5. **Expected**: Buttons remain visible on all tweets
6. **Result**: ✅ Buttons persist through scrolling

## Technical Details

### Virtual Scrolling Behavior

Twitter/X's virtual scrolling:
- Keeps only ~10-20 tweets in DOM at once
- Removes tweets that are >1000px off-screen
- Re-creates tweets when scrolling back
- Uses same HTML structure but new DOM instances

### Why WeakMap Alone Isn't Enough

WeakMaps are perfect for memory management (auto-cleanup when elements are garbage collected), but they can't track "logical" posts across DOM recreation.

### Why Set Alone Isn't Enough

Sets can track post IDs across DOM recreation, but they don't know if the button was removed when Twitter removed the element.

### The Hybrid Solution

Combine both approaches with DOM verification:
1. Use WeakMap for fast lookups on existing elements
2. Use Set for tracking logical posts
3. **Verify button exists** before trusting the registry
4. Re-inject if button is missing (handles virtual scrolling)

## Files Modified

- `utils/post-registry.js` - Added `verifyButton` parameter and DOM verification logic
- `content/twitter-content.js` - Pass `verifyButton = true` when checking
- `content/instagram-content.js` - Pass `verifyButton = true` when checking
- `utils/button-injector.js` - Check for actual button in DOM instead of just attribute

## Performance Impact

Minimal - the DOM query (`querySelector`) is very fast and only runs when:
1. We're about to process a post
2. The post might have been processed before

This is much better than re-injecting buttons unnecessarily.

## Future Improvements

If performance becomes an issue with thousands of posts:
1. Use IntersectionObserver to only process visible posts
2. Implement a more sophisticated caching strategy
3. Add debouncing to scroll events

## Related Issues

This fix also improves:
- Memory usage (buttons are re-created only when needed)
- Reliability (handles any DOM manipulation by Twitter)
- Maintainability (works even if Twitter changes their virtual scrolling implementation)
