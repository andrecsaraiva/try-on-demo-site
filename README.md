# Watch Try-On Orientation V13

Focused only on the two requested adjustments:

- start with the watch facing the correct way on the back of the hand
- reduce side-view shrinking when the arm is rotated ~90°

## Changes
- reversed the bracelet-axis flip condition:
  - back of hand => watch face visible
  - palm => watch underside visible
- increased side-view scale compensation
- raised the max allowed auto scale slightly so the side compensation is not clipped
