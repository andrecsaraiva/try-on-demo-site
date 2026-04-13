# Watch Try-On HDR + Persistence V28

Base:
- uploaded watch-tryon(27).html
- uploaded watch-tryon(26).js
- uploaded watch-tryon(5).css
- uploaded relogio(14).glb

Changes:
1. Try-on now uses `./assets/models/relogio-tryon.glb`
2. Added HDR reflections only:
   - `./assets/hdr/glasshouse_interior_4k_blur_exp_sat.hdr`
   - loaded as `scene.environment`
   - camera background remains unchanged
3. Renderer:
   - `logarithmicDepthBuffer: true`
4. Camera range:
   - near/far `1 / 500`
5. Tracking persistence:
   - `keepVisibleMisses: 90`
   - `hideAfterMisses: 240`
   - freezes last tracked pose when the hand disappears up close
   - reacquires when fingers come back
6. Scale/depth stability:
   - `wristOffsetTrim: 0.45`
   - `sideCompMin: 0.70`
   - `maxScalePx: 160`

Intent:
- improve metal/glass reflections without changing the real camera background
- let the user move closer without the watch instantly disappearing
- keep the rest of the try-on behavior as intact as possible
