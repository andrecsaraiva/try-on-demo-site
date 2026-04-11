# Watch Try-On Full V3 Safe Boot

This version avoids silent module boot failures.

## Main changes
- Removed the import map
- Replaced top-level ES module imports with dynamic imports
- Uses `esm.sh` for `three` and `GLTFLoader`
- If any library import fails, the page now shows a visible status/hint error instead of doing nothing
- Bumped the watch try-on JS version query string to avoid stale cache

## Files changed
- `watch-tryon.html`
- `js/watch-tryon.js`
