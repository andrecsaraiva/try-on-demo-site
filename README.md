# Watch Try-On 3D Occluder V19

This version keeps the working v16 tracking / rotation / scale logic and replaces the failed 2D occlusion idea with a true 3D depth occluder.

## What changed
- added an invisible cylinder-based wrist occluder directly in the Three.js scene
- the occluder:
  - follows the same position as the watch
  - follows the same quaternion as the watch
  - sits slightly inside the watch volume
  - writes only depth, not color
- this hides the back half of the watch/strap instead of drawing a flat 2D mask over the whole model

## What did NOT change
- palm/dorsum logic
- wrist anchor logic
- watch rotation logic
- watch scale logic

## Notes
This is a much more correct approach than the previous 2D mask. If the occluder shape needs refinement, the next tuning should touch only:
- cylinder length
- cylinder radius
- local X offset
- local Z depth offset
