# Watch Try-On Rotation V11

Focused only on wrist rotation.

## What changed
- Keeps the v10 wrist anchor and scale logic
- Replaces Euler wrist tilt with a 3D basis + quaternion orientation
- Uses:
  - along axis = wrist -> knuckles
  - face normal = hand plane normal
- Applies quaternion slerp for smoother arm-twist tracking

## Goal
The watch should stay in the wrist area and rotate more convincingly as the arm twists.
