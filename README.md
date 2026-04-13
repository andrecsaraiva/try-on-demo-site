# Watch Try-On V20 Restored + Corrected GLB7 (V22)

This package restores the V20 behavior baseline, but replaces the model with the user's corrected `relogio(7).glb`.

## What changed
- based on `watch-tryon-3d-occluder-v20`
- replaces `assets/models/relogio.glb` with the uploaded `relogio(7).glb`
- preserves the authored pivot/origin from the corrected GLB
- aligns the corrected GLB orientation with a local correction quaternion
- keeps the V20 3D occluder approach

## What was intentionally NOT changed
- wrist anchor logic
- palm/dorsum logic
- side-scale logic
- V20 occluder dimensions
