# Phase 6 — Playable Jezero Terrain Readiness

**Assessment date:** 2026-11-14
**Scope:** Read-only frontend and runtime-readiness assessment. No application code, manifests, or datasets were changed.

## Executive finding

The application already loads a processed, M20 CTX-derived Jezero dataset and builds a Three.js terrain mesh whose vertex elevations come from that dataset. It is not a flat surface. The viewer also has rover driving, camera modes, and a HUD.

The fastest first milestone needs **no code or dataset changes**: launch the existing app, enter its 3D-ready map card, keep the camera in Follow or Free orbit, and drive with WASD. The currently processed bundle is the right first dataset because it is already compatible with the runtime loader and its source hashes match the recovered M20 CTX DEM and orthomosaic.

One qualification matters for scientific fidelity: `RegionMarkers` adds procedurally generated relief patches and passes that relief into rover and mission elevation sampling. The base terrain is real-data-derived, but the complete scene and all sampled elevations are not exclusively real data.

## 1. What the application currently does

| Area | Current implementation |
|---|---|
| Rendering | Three.js with locally vendored modules and `OrbitControls`; the app assembles the scene in `web/src/main.js`. |
| Runtime data | `web/src/data/loader.js` fetches `metadata.json`, `terrain.f32.bin` as a `Float32Array`, and the configured texture image. It checks the height-array length against metadata. It does not read GeoTIFFs or the present `nodata.bin`. |
| Terrain geometry | `web/src/terrain/terrainRenderer.js` samples heightfield values into mesh vertex positions through `GeoFrame`. The default stride is 4, so the 40 m source grid is drawn at about 160 m vertex spacing. The current browser HUD reported approximately 352k vertices and 702k triangles. |
| Terrain appearance | The processed grayscale orthomosaic is the mesh texture. Mars tint, shader noise, slope colors, lighting, and shadows are visualization effects, not additional elevation data. |
| Coordinates and inspection | The metadata-driven `GeoFrame` maps projected coordinates to the scene. Terrain picking reports coordinates and sampled elevation. |
| Rover controls | `RoverInput` maps WASD and arrow keys to the active rover except that WASD is reserved for camera motion in Free-fly mode; arrow keys still drive there. Shift enables rover sprint. |
| Camera | Follow, Free orbit, and Free-fly are implemented. Free-fly uses WASD, E/Q, and mouse drag-look; Follow and Free orbit are the appropriate modes for WASD rover driving. |
| Robots and mission UI | Three rover models, selection controls, telemetry, and simulated mission/task UI are initialized. These features are simulation behavior, not evidence of scientific detections. |
| Map portal | The catalog contains one 3D-enabled Eastern Equatorial map entry with Jezero as its active sector. Clicking an enabled card hides the portal and emits a toast; it does not load a map profile or switch the data source. The scene uses the same configured `./data/` bundle regardless of the card. |

## 2. Current terrain and dataset

The runtime bundle is represented by:

- `web/data/metadata.json` — grid, extent, coordinate-frame, texture, and processing metadata.
- `web/data/terrain.f32.bin` — 2,221 × 2,530 float32 elevations on a 40 m grid.
- `web/data/texture.jpg` — processed grayscale imagery, 4,096 × 4,666 pixels.
- `web/data/nodata.bin` — a NoData mask is present, but the current loader does not consume it. The runtime metadata reports that no output cells needed filling.

The Phase 5 audit verified that the runtime metadata's source hashes match the recovered M20 CTX DEM and orthomosaic. The bundle records cropping to a common extent, 2 × 2 DEM averaging from 20 m to 40 m, and area-averaging of the orthomosaic. The browser does not load either original TIFF directly.

**Terrain verdict:** `TerrainRenderer.build()` assigns sampled DEM elevations to the mesh vertices. The scene is elevation-based rather than a flat plane. Browser inspection confirmed the app page loaded and displayed the mesh statistics; the initial portal covered the canvas, so the terrain surface itself was not visually inspected during this audit.

**Important synthetic overlay:** `web/src/terrain/regionMarkers.js` creates procedural terrain patches and labels. `web/src/main.js` also supplies `getReliefAt()` from those patches to rover physics and the mission system. Treat the underlying heightfield as M20-derived real data, but treat those patch shapes, added relief, and related mission claims as simulated—not as NASA elevation or confirmed Jezero geology. This behavior conflicts with the README statement that nothing procedural is rendered as terrain.

## 3. Dataset to use first

Use the existing processed M20-derived bundle in `web/data/` for the first playable environment.

Reasons:

1. It is already the configured runtime source and is consumed by the existing loader.
2. Its source hashes match the recovered M20 CTX DEM and orthomosaic documented in Phase 5.
3. It supplies both broad regional elevation and a matching grayscale texture in a single established runtime format.
4. It avoids introducing a new raster reader, reprojection, resampling, or profile-selection path.

Do not use the Channel Fan or HiRISE rasters for the first milestone. They are optional local products with separate grids and unresolved CRS and/or vertical-reference questions documented in Phase 5. They are not needed to make the current regional environment playable.

## 4. What is still missing or unverified

- **Browser end-to-end control check:** the app server returned HTTP 200, and the browser page showed the HUD and mesh statistics. The map portal obscured the terrain; automated clicks on its card timed out, so this audit did not confirm visible terrain after portal dismissal or prove rover movement with keypresses.
- **Clean real-elevation-only presentation:** procedural region patches alter rendered surface relief and rover/mission elevation sampling. The real DEM and simulated additions are not currently separated by a runtime toggle.
- **NoData use:** the loader ignores `nodata.bin`; the existing processed metadata says the output grid has no cells that were entirely NoData, so this is not a blocker for the current bundle.
- **Direct GeoTIFF loading:** unsupported by the browser loader. The existing preprocessed bundle is required unless a later task deliberately extends or reuses the preprocessing pipeline.
- **Map/profile switching:** the portal is a catalog/entry overlay, not a profile-aware resource loader. Its selection does not change `CONFIG.dataPath`.
- **Scientific geology and detections:** this frontend audit found no supplied geological polygon layer being loaded by the current terrain renderer. Mission targets and sample actions are simulated; they should not be presented as confirmed mineral detections.

## 5. Shortest path and exact file scope

### First milestone: prove the existing playable environment (zero code changes)

1. From the repository root, run `npm start`; open `http://localhost:8000/`.
2. Wait for the elevation grid and texture to finish loading.
3. Select the **3D READY — USGS I-1802-B** card to dismiss the portal.
4. Leave the camera in **Follow rover** (or **Free orbit**) and drive the active rover with WASD. Use arrow keys if the camera is in Free-fly; Shift enables sprint.
5. Confirm that rover speed/position telemetry changes and terrain inspection returns an elevation.

**Files that must change to get this existing playable path:** none. `web/src/main.js`, `web/src/data/loader.js`, `web/src/terrain/terrainRenderer.js`, `web/src/terrain/heightfield.js`, `web/src/rover/roverInput.js`, and `web/src/camera/cameraRig.js` already provide the required path from runtime data to terrain and rover control.

### Optional minimal code refinement: real-elevation-only baseline

If the first milestone must exclude synthetic surface relief, make a narrowly scoped change in **`web/src/main.js`**: do not instantiate `RegionMarkers` and do not pass its relief sampler to the rovers or mission system. The underlying DEM renderer, loader, heightfield, camera, and rover input do not need replacement. This would intentionally remove the procedural region patches and their associated overlays from that baseline.

Do not add raw-TIFF ingestion, map switching, a new terrain renderer, or a new raster-processing path to this first milestone. Those are separate follow-on work.

## 6. Definition of done

The first playable terrain milestone is complete when:

- The existing app serves and loads the current `web/data/` bundle without a loading error.
- The portal can be dismissed using the 3D-ready card and the terrain canvas is visible.
- The viewer reports a nonzero terrain mesh at the configured 160 m mesh spacing.
- Terrain inspection returns finite coordinates and elevations.
- With Follow or Free orbit selected, WASD changes the active rover's position and speed; switching to Free-fly makes WASD move the camera instead.
- Real DEM/texture content is distinguished from procedural overlays and simulated mission content.

The code path and data bundle are in place, but the final visible-terrain and keyboard-control checks remain to be completed manually or with a working browser automation setup.
