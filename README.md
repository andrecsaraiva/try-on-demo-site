# Watch Try-On Full V5 Logging

This version is focused on diagnosis.

## What changed
- Added visible on-screen log
- Added copy log / clear log buttons
- Added metrics for:
  - delegate
  - camera
  - video resolution
  - detections count
  - last hand
- Added GPU -> CPU fallback log
- Keeps rear camera and landmarks enabled by default

## Goal
Use this version to understand whether the problem is:
- library boot
- camera start
- MediaPipe hand detection
- fit/placement after detection
