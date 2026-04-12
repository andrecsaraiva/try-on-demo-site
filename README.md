# Watch Try-On Corrective V10

Focused only on the requested fixes:

- return the watch anchor to the wrist
- make the watch follow rotation better
- keep scale variation mainly tied to camera distance

## What changed
- anchor moved back to the wrist using the old working wrist-offset logic
- stronger 3D wrist rotation from depth differences
- softer but faster position/rotation smoothing
- auto scale now uses a short median history and clamps, so it breathes less
- no occlusion changes in this version

## Files changed
- `watch-tryon.html` (cache bust only)
- `js/watch-tryon.js`
- includes latest `assets/models/relogio.glb` if present
