# Watch Try-On Full V1

This package keeps:

- Page 1 with separate desktop buttons:
  - AR
  - Try-On Watch
- Page 2 (`ar-view.html`) unchanged from your uploaded version
- Your current `styles.css` unchanged

And adds:

- `watch-tryon.html`
- `css/watch-tryon.css`
- `js/watch-tryon.js`

## What the watch try-on does

This first version is a working wrist-tracking prototype:
- opens the phone camera
- detects one hand / wrist
- overlays the watch GLB on the wrist
- includes developer fit sliders for:
  - watch size
  - rotation offset
  - wrist offset
- includes a debug landmark toggle

## Files used
- Watch model: `assets/models/relogio.glb`
- AR page model stays whatever your current `ar-view.html` points to

## Important
- Camera pages require HTTPS to work on phones
- The watch try-on page is a first functional prototype, not a production-grade tracker yet
