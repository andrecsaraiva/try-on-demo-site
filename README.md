# Watch Try-On Full V2 Fix

This version fixes the issue where the watch try-on page loaded but the Start Camera button appeared to do nothing.

## Main fixes
- Added an import map for `three`
- This allows `GLTFLoader.js` to resolve the bare `three` import correctly in the browser
- Added automatic camera start attempt on page load
- Added visible error messages if the camera fails
- Moved the main controls above the stage so the Start Camera button is visible immediately

## Files changed
- `watch-tryon.html`
- `js/watch-tryon.js`

Everything else remains the same as V1.
