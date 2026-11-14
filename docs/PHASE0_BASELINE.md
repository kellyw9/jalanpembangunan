# Phase 0: Inventory and Baseline Protection

Captured 2026-11-14. This is a read-only inventory of existing runtime configuration and data. Checksums are recorded in [PHASE0_ASSET_SHA256SUMS.txt](./PHASE0_ASSET_SHA256SUMS.txt). Paths in that file are the original repository-relative locations.

## Worktree and scope

- At the start of Phase 0, `git status --short` showed only `?? resource-data/`; there were no tracked diffs.
- `resource-data/` is untracked. Its contents were read and hashed but not modified.
- All 18 files under `web/data/` and `resource-data/` were included in the initial SHA-256 capture: 4 runtime data files and 14 supplied resource, metadata, reference, or helper files.
- The project has no existing test files and `package.json` has only a `start` script. No package script was added; the new baseline tests are run directly with Node.
- No preprocessing or data-generation scripts were run. In particular, `resource-data/inspect_dem.py` writes `dem_metadata.json` when run, so it was not executed. GeoTIFF metadata was read directly with Rasterio without reading or writing raster pixels.

## Project and runtime inventory

- `web/index.html` hosts the Three.js application and browser import map.
- `web/src/main.js` loads one dataset using `CONFIG.dataPath`, creates one heightfield and coordinate frame, then initializes terrain rendering, rover swarm, region markers, mission system, camera, HUD, and map portal.
- `web/src/config.js` selects `./data/`. The current viewer settings include mesh stride 4, vertical exaggeration 1, start at `[77.4509, 18.4446]`, and rover settings of 100 m/s maximum speed, 65 m/s² acceleration, 1.8 rad/s turn rate, and a 42-degree slope limit.
- `web/src/data/loader.js` loads `metadata.json`, `terrain.f32.bin`, and the configured texture. It does not load `nodata.bin`, although that file exists.
- `web/src/geo/coords.js` implements the current Mars equirectangular coordinate conversion. `web/src/terrain/heightfield.js` provides bounds, bilinear sampling, gradients, and slope for the current north-up, constant-cell grid.
- Rendering, terrain picking, rover input/model/physics/swarm, camera, HUD, map catalog/portal, AI, mission, and region-marker modules are present under `web/src/`. The project vendors Three.js and OrbitControls under `web/vendor/`.
- `server.js` serves the `web/` directory. It does not expose the sibling `resource-data/` directory.
- The static map catalog in `web/src/maps/mapRegistry.js` includes `usgs-i-1802-b` and a Gale placeholder. It is catalog/UI metadata, not a set of independently loaded terrain profiles. The portal's launch callback in the current `main.js` only reports the selected title; it does not load a different dataset.
- `web/src/ai/agentInterface.js`, `web/src/mission/missionSystem.js`, and `web/src/terrain/regionMarkers.js` contain current rover/mission/demo behavior. Some geological names, artifacts, analyses, and procedural relief are simulated rather than derived from registered GIS data. This inventory does not treat them as verified scientific observations.

## Dataset inventory

### Runtime assets under `web/data/`

| Original path | Size | Recorded content |
|---|---:|---|
| `web/data/metadata.json` | 3,260 bytes | Jezero Crater region; equirectangular Mars 2000 sphere, radius 3,396,190 m, standard parallel 18.4663 degrees; extent X 4,329,200 to 4,418,040 m and Y 1,042,140 to 1,143,340 m; 2,221 x 2,530 float32 cells at 40 m. |
| `web/data/terrain.f32.bin` | 22,476,520 bytes | Little-endian float32 terrain grid; length agrees with metadata dimensions. |
| `web/data/nodata.bin` | 702,392 bytes | Packed NoData mask; expected packed length for the metadata grid. A read-only count found zero flagged bits. The loader currently ignores this file. |
| `web/data/texture.jpg` | 5,971,729 bytes | Metadata describes a 4,096 x 4,666 grayscale CTX texture. |

The metadata names `M20_JezeroCrater_CTXDEM_20m.tif` and `M20_JezeroCrater_CTXortho_mosaic_5m.tif` as sources. Those exact filenames were not present in the inspected `resource-data/` listing. Therefore the supplied `JEZ_ctx_*` GeoTIFFs are not assumed to be the source of the existing preprocessed binaries.

### Supplied files under `resource-data/`

All paths below are preserved in place and individually checksummed. The directory contains 14 files:

| Original path | Size | Read-only inventory |
|---|---:|---|
| `resource-data/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | 9,675,294 bytes | 1-band float32, 1,596 x 1,512, 20 m, `ESRI:103885`, projected bounds 4,573,663.250853..4,605,583.250853 E and 1,079,453.140188..1,109,693.140188 N; float32 NoData sentinel. |
| `resource-data/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif` | 36,269,402 bytes | 1-band uint8, 5,322 x 5,040, 6 m, `ESRI:103885`; NoData 0. Its bounds differ slightly from the CTX DTM. |
| `resource-data/JEZ_hirise_DEM_5m.tif` | 22,486,856 bytes | 1-band float32, 4,280 x 4,298, approximately 5 m, `ESRI:103885`; local HiRISE footprint and float32 NoData sentinel. |
| `resource-data/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` | 1,839,718,122 bytes | 1-band float32, 21,400 x 21,488, 1 m, `ESRI:103885`; bounds 4,577,366..4,598,766 E and 1,085,130..1,106,618 N; float32 NoData sentinel. |
| `resource-data/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd.tif` | 9,822,748,524 bytes | 1-band uint8, 85,600 x 85,952, geographic coordinates, bounds 77.222933..77.583964 E and 18.306799..18.669315 N; NoData 0. It is not the same grid or CRS as the projected DTM. |
| `resource-data/dem_metadata.json` | 627 bytes | Metadata for the 1 m HiRISE DTM, including CRS, transform, footprint, and NoData. |
| `resource-data/dem_sample_stats.json` | 412 bytes | Estimated statistics from sampled valid pixels, not a complete raster scan. |
| `resource-data/dem_preview.png` | 585,635 bytes | Preview image. |
| `resource-data/Perseverance_Traverse_Path-fgdc.xml` | 1,752 bytes | Describes the Perseverance path and a geographic bounding box; it does not contain a path geometry. |
| `resource-data/sim3464.pdf` | 36,406,378 bytes | PDF reference; not registered as a georeferenced GIS layer in the application. |
| `resource-data/sim3464_pamphlet.pdf` | 728,435 bytes | PDF reference; not registered as a georeferenced GIS layer in the application. |
| `resource-data/downsample_dem.py` | 1,399 bytes | Helper script; not run. |
| `resource-data/inspect_dem.py` | 955 bytes | Metadata helper that writes a JSON file when run; not run. |
| `resource-data/preview_dem.py` | 1,790 bytes | Preview helper; not run. |

The supplied CTX and HiRISE products are separate rasters with different dimensions, resolutions, and in one case a geographic CRS. No alignment, mosaic, or substitution was performed. No machine-readable geological-unit layer is registered in the current app. The PDF references were inventoried but not interpreted as unit polygons or a queryable geology dataset.

## Map identities, ownership, and provenance

- **Verified runtime dataset identity:** the metadata names the loaded terrain as “Jezero Crater region (Mars 2020 landing-site CTX products).”
- **Supplied product identity:** the supplied raster filenames and metadata identify Jezero-area CTX and HiRISE products. Their relationship to the existing `web/data/` preprocessing inputs is unresolved.
- **Catalog-only identities:** `USGS I-1802-B` is a static catalog entry; Gale is marked as a placeholder. Neither entry supplies an independent terrain/resource manifest.
- **Ownership:** the project files do not establish which products belong to `teammate` versus `kelly`. Do not bind a resource to either profile based only on the filenames or directory location.
- **Unknown:** the inventory does not establish five distinct runnable geographic environments, five source-data lineages, or a registered geological-unit layer. Unknown profiles and missions must remain placeholders until evidence is provided.

## Baseline tests and limitations

Command:

```powershell
node --experimental-default-type=module --test web/test/baseline.test.js
```

Result: **6 passed, 0 failed.** The tests characterize the configured `./data/` path, coordinate round trips, real terrain/mask/texture byte lengths and start-point sampling, synthetic heightfield interpolation, synthetic flat-terrain rover movement and edge blocking, and current map-catalog flags. The synthetic tests use in-memory fixtures and do not write data.

Not tested in this baseline:

- Browser rendering, WebGL shaders, texture upload, and terrain appearance.
- DOM interaction for the portal, HUD, controls, and mission actions.
- Three.js rover models, swarm visuals, mission artifacts, and full interactive mission flow.
- Loading through `loadDataset`; it imports the browser import-map specifier `three` and uses `TextureLoader`, which is not configured for Node tests.
- Geological-unit lookup or mission results derived from GIS; no such layer is registered.
- CRS compatibility or co-registration between supplied raster products.

The package test script was not changed; the direct Node command above is sufficient. No preprocessing, server startup, or browser simulation was run.
