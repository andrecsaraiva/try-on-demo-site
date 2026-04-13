# Watch Try-On GLB Align V21

This version updates the code for the newly authored watch GLB orientation and pivot strategy.

## What changed
- includes the uploaded `relogio(5).glb` as `assets/models/relogio.glb`
- recenters the model around the dial / glass region instead of the full strap bbox center
- uses dial width as the scaling reference, which is better for watch try-on
- applies a local correction quaternion for the newly authored "lying face-up" model:
  - face normal authored as +Z
  - bracelet axis authored as +Y
  - tracker expects bracelet axis on local +X

## What did NOT change
- palm/dorsum logic
- wrist anchor logic
- side-view scaling logic
- occlusion was NOT added in this version

## Goal
Keep the good v16 behavior, but make it match the newly exported GLB much more cleanly.
