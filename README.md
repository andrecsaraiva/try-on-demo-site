# Watch Try-On Orientation V12

Focused only on two issues:

- prevent the watch from shrinking too much at ~90° hand twist
- make palm-facing orientation flip to the underside instead of snapping back to face-up

## What changed
- keeps the v11 wrist anchor and 3D rotation basis
- adds side-view scale compensation based on palm normal Z
- adds palm/back detection from 2D hand winding + handedness
- if palm is visible, applies a 180° flip around the bracelet axis
