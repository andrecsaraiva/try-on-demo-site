# Watch Try-On Full V6 MediaPipe Fix

This version fixes the exact boot failure shown in the log.

## Problem found
The page failed on this dynamic import:
`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm`

## Fix
Switched the MediaPipe import to:
`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs`

## Files changed
- `watch-tryon.html`
- `js/watch-tryon.js`

Everything else remains the same as V5.
