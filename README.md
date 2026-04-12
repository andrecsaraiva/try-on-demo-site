# Watch Try-On Refine V15

Focused only on two visual refinements:

- move the watch a bit lower toward the forearm
- make the watch size follow an estimated wrist width instead of the full hand width

## Changes
- increased the wrist offset trim from 0.24 to 0.30
- scale now uses an inferred wrist-width estimate (86% of corrected hand width)
- all palm/dorsum logic and side-view logic from v14 remain unchanged
