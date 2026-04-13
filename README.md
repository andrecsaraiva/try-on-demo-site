# Watch Try-On Pre-Occlusion + GLB9 (V23)

This package restores the last version before occlusion experiments and uses the uploaded corrected `relogio(9).glb`.

## Base
- based on `watch-tryon-refine-v16`
- no 2D occlusion
- no 3D occluder

## What changed
- replaced `assets/models/relogio.glb` with `relogio(9).glb`
- preserved the authored pivot/origin from the corrected GLB
- aligned the corrected GLB orientation to the tracker convention
- uses dial width as the reference size when possible

## What did NOT change
- wrist anchor logic
- palm/dorsum logic
- side-scale logic
- overall UI/UX from v16
