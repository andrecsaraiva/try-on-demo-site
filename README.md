# Watch Try-On Occlusion V17

Focused only on one addition:

- image-based hand occlusion over the watch

## What changed
- added a dedicated `occlusion-canvas` above the 3D watch canvas
- when a hand is detected, the page builds a hand/forearm mask from landmarks
- the current video frame is redrawn inside that mask, over the watch
- this hides parts of the watch that should appear under the hand

## Important
- no palm/dorsum logic was changed
- no anchor, rotation or scale logic was changed
- this is a safe image-based occlusion layer, not depth occlusion
