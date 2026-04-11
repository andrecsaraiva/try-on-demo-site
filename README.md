# Watch Try-On Full V7 UNPKG

This version changes only the MediaPipe CDN.

## Why
The logs showed the phone could not fetch MediaPipe from jsDelivr.

## What changed
- MediaPipe import switched from jsDelivr to UNPKG
- MediaPipe WASM root switched from jsDelivr to UNPKG
- Cache-bust updated on `watch-tryon.html`

## Files changed
- `watch-tryon.html`
- `js/watch-tryon.js`
