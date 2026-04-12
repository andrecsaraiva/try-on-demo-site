# Watch Try-On Orientation V14

Focused only on the two requested adjustments:

- correct the initial dorsum/palm orientation
- reduce the side-view size drop without disturbing the parts that already work

## Changes
- inverted the palm-facing heuristic
- kept the same flip logic, so the watch should now start on the correct side
- added a separate corrected-width history for scale only
- scale now stays more stable at ~90° because it no longer learns progressively smaller side widths
- kept the wrist anchor history separate and untouched
