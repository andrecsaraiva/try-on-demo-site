# Watch Try-On Stable V9

This version intentionally backs off from the unstable premium-v8 experiment.

## What changed
- Rebuilt from the last working wrist-tracking flow
- Keeps premium UI
- Keeps logs and developer tools hidden in a collapsed panel
- Improves stability with:
  - rolling median auto-scale
  - gentler smoothing
  - longer persistence before hiding the watch
- Improves fit with:
  - more stable wrist anchor
  - model reference size based on the median GLB dimension
  - milder 3D tilt from landmark depth
- Removes the experimental occlusion layer that caused clipping / floating polygons

## Important
This version is the stable path for items 1, 2, 4 and 5.
Real hand occlusion still needs a separate segmentation/depth approach.
