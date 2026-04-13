# Watch Try-On HDR Only V28b

Base:
- uploaded watch-tryon(27).html
- uploaded watch-tryon(26).js
- uploaded watch-tryon(5).css
- uploaded relogio(14).glb

Changes:
1. Try-on uses `./assets/models/relogio-tryon.glb`
2. Added HDR reflections only:
   - `./assets/hdr/glasshouse_interior_4k_blur_exp_sat.hdr`
   - loaded as `scene.environment`
   - camera background remains unchanged
3. Slightly reduced direct light intensities so the HDR reflections can show up better
4. Did NOT change:
   - tracking logic
   - persistence logic
   - scale limits
   - palm/dorsum logic
   - occlusion

Goal:
- improve metal / glass reflections without changing the working tracking behavior
