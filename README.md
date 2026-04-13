# Watch Try-On Occluder GLB V29

Base:
- working HDR-only V28b try-on

Changes:
- added support for `./assets/models/relogio-occlusion.glb`
- loads the occluder as a separate GLB
- attaches it as a child of `modelRoot`
- applies depth-only material to the occluder meshes
- keeps page 1 untouched
- only try-on files were changed

Important:
- `relogio-occlusion.glb` must share the same pivot/orientation as the watch model
- because it is parented to the watch root, it follows the watch automatically
