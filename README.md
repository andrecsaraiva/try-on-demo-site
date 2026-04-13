# Watch Try-On Diagnostic V26

Base:
- uploaded watch-tryon(27).html
- uploaded watch-tryon(26).js
- uploaded watch-tryon(5).css
- uploaded relogio(14).glb

Changes made:
1. Added diagnostics panel + live log inside Developer Tools
2. Enabled `logarithmicDepthBuffer: true` on the WebGLRenderer
3. Changed `sideCompMin` from `0.40` to `0.58`
4. Changed `maxScalePx` from `300` to `220`

What the panel shows:
- model ref size
- model bounding size
- current scale
- target scale
- side factor
- estimated wrist width
- camera near/far
- material summary:
  - transparent count
  - double-sided count
  - depthWrite disabled count
  - non-default blending count

Goal:
- diagnose whether the flicker is being driven by depth/render precision or by side-view scale blow-up.
