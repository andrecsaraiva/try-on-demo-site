# Watch Try-On Premium V8

This package keeps page 1 and page 2 intact and upgrades only the watch try-on route.

## What changed on the watch try-on page

- More stable tracking with better pose filtering and slower hiding on detection loss
- Better anatomical fit using a 3D wrist basis from landmarks instead of a mostly 2D rotation
- Automatic scale tuned to wrist width, with trim sliders kept only in Developer Tools
- Cleaner client-facing UX with a single primary Start Try-On button
- Landmark-based hand occlusion mask so parts of the hand can cover the watch
- Rear camera by default
- Developer tools hidden under a collapsed panel

## Notes about occlusion
This version uses a practical hand-mask occlusion built from landmarks.
It looks much more natural than simple overlay, but it is still not the same as full segmentation or depth occlusion.

## Files you can replace directly
- watch-tryon.html
- css/watch-tryon.css
- js/watch-tryon.js

## Included model
- assets/models/relogio.glb
