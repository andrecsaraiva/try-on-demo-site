# Watch Try-On Occlusion V18

Focused only on fixing the inverted / over-aggressive occlusion.

## What changed
- replaced the full-hand convex-hull occlusion with a narrow wrist-band occlusion
- the band follows the wrist direction and extends slightly into the forearm
- this should hide only the bracelet area that goes under the skin
- the watch face should stay visible instead of being covered by the whole hand mask

## What did NOT change
- anchor
- rotation
- scale
- dorsum/palm logic
