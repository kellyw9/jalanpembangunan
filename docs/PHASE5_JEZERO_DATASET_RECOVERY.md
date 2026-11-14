# Phase 5: Jezero Dataset Recovery and Terrain Compatibility Audit

**Audit date:** 2026-11-14  
**Scope:** Read-only inventory of raster files in `resource-data/`, recovery search for the named M20 products, metadata-only comparison, and inspection of the Channel Fan ZIP. No files were extracted, modified, registered, or resampled; no application code or manifests were changed.

## Executive findings

- Both M20 CTX source TIFFs were found on the computer. Their SHA-256 hashes exactly match the source hashes recorded in `web/data/metadata.json`. The DEM is in Downloads, outside the repository. The orthomosaic is in Downloads and also has an identical copy in `resource-data/`.
- A Channel Fan TIFF and its sidecars are already present in `resource-data/Jezero_ChannelFan_DEM/`. The TIFF’s SHA-256 hash matches the member in `C:\Users\k3lly\Downloads\Jezero_ChannelFan_DEM.zip`. The ZIP was inspected in place; no extraction was performed in this phase.
- The M20 CTX pair provides broad Jezero-region terrain and grayscale image coverage. The 20 m DEM is the strongest raw regional terrain base found; the 5 m orthomosaic is nearly coextensive and the recorded hashes establish that both are the sources named by the existing runtime metadata.
- The currently loaded `web/data/` bundle is already sufficient for the existing interactive viewer. It is a 40 m processed grid with a coarser grayscale texture. The runtime loader does not read GeoTIFFs directly.
- The smaller CTX and HiRISE products are potential local terrain refinements, not replacements for the regional base. The Channel Fan raster has useful Jezero coverage and consistent georeferencing sidecars, but its Mars 2000 ellipsoidal CRS and unknown vertical reference prevent safe integration into the runtime sphere-based frame.
- This phase made no resource registrations. Kelly remains non-launchable.

## 1. Raster inventory

Projected bounds are in each dataset’s native CRS. Geographic extents are reported from Rasterio transforms where available; the Channel Fan geographic bounds are also stated in its Esri XML. “Vertical reference” describes elevation datum/unit evidence, not the horizontal CRS ellipsoid.

### Datasets found under `resource-data/`

| Dataset and path | Size; dimensions; resolution; type | CRS and geographic coverage | NoData, compression, and vertical reference |
|---|---|---|---|
| `resource-data/M20_JezeroCrater_CTXortho_mosaic_5m.tif` | 359,599,280 bytes; 17,766 × 20,234; 5.002064681 × 5.002262972 m; 1-band uint8 grayscale | Equidistant cylindrical on a Mars sphere (R=3,396,190 m), standard parallel 18.4663°, central meridian 0°; 77.000854–78.581475° E, 17.581391–19.288963° N. Transform `(5.002064681,0,4329192.108126; 0,-5.002262972,1143347.424175)`. | NoData absent; uncompressed, strip layout, not tiled. Imagery has no vertical reference. |
| `resource-data/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | 9,675,294 bytes; 1,596 × 1,512; 20 × 20 m; 1-band float32 | `ESRI:103885`, spherical equirectangular (R=3,396,190 m), standard parallel 0°; 77.160465–77.698975° E, 18.211027–18.721194° N. Transform `(20,0,4573663.250853; 0,-20,1109693.140188)`. | NoData `-3.4028226550889045e38`; uncompressed, not tiled. Filename includes `MOLAtopography_DeltaGeoid`, but no vertical unit/datum is recorded in TIFF tags. |
| `resource-data/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif` | 36,269,402 bytes; 5,322 × 5,040; 6 × 6 m; 1-band uint8 grayscale | `ESRI:103885`, spherical equirectangular, standard parallel 0°; 77.160465–77.699178° E, 18.211027–18.721194° N. Transform `(6,0,4573663.250853; 0,-6,1109693.140188)`. | NoData recorded as `0`; uncompressed, not tiled. Imagery has no vertical reference. |
| `resource-data/JEZ_hirise_DEM_5m.tif` | 22,486,856 bytes; 4,280 × 4,298; 5 × 4.999534667 m; 1-band float32 | `ESRI:103885`, spherical equirectangular, standard parallel 0°; 77.222933–77.583964° E, 18.306799–18.669315° N. Transform `(5,0,4577366; 0,-4.999534667,1106618)`. | NoData `-3.4028226550889045e38`; DEFLATE, tiled 256 × 256, predictor 3. No vertical reference recorded. |
| `resource-data/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` | 1,839,718,122 bytes; 21,400 × 21,488; 1 × 1 m; 1-band float32 | `ESRI:103885`, spherical equirectangular, standard parallel 0°; 77.222933–77.583964° E, 18.306799–18.669315° N. Transform `(1,0,4577366; 0,-1,1106618)`. | NoData `-3.4028226550889045e38`; uncompressed, not tiled. Filename suggests a MOLA/DeltaGeoid product, but the file and `dem_metadata.json` do not establish vertical units or datum. |
| `resource-data/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd.tif` | 9,822,748,524 bytes; 85,600 × 85,952; 4.2176512×10⁻⁶ degrees/pixel; 1-band uint8 grayscale | Geographic CRS has an unnamed ellipsoid (a=3,396,190 m) and unknown datum; 77.222933–77.583964° E, 18.306799–18.669315° N. Transform `(4.2176512e-6,0,77.222933077; 0,-4.2176512e-6,18.669315007)`. | NoData recorded as `0`; uncompressed, not tiled. Imagery has no verified vertical or geographic datum. |
| `resource-data/Jezero_ChannelFan_DEM/Jezero_ChannelFan_DEM.tif` | 484,457,772 bytes; 14,341 × 17,220; 1 × 1 m; 1-band float32 | `MarsEC0`, Mars 2000 ellipsoid (a=3,396,190 m, inverse flattening 169.894447...), standard parallel 0°; XML bounds 77.222555–77.464497° E, 18.371920–18.662432° N. Transform `(1,0,4577343.614954; 0,-1,1106210.024118)`. | NoData `-3.4028234663852886e38`; LZW, tiled 128 × 128. XML elevation unit is empty; vertical datum is unknown. Its checksum matches the ZIP member. |

`ESRI:103885` resolves in the inspected products to the Mars 2000 sphere equirectangular frame with standard parallel 0°. The M20 sources use a sphere with standard parallel 18.4663°. Similar Mars names do not make those projected coordinate values interchangeable.

Channel Fan sidecars present in its directory are `.tfw`, `.tif.xml`, `.tif.aux.xml`, and `.tif.ovr`. The `.tfw` pixel-center values produce the same corner-based affine as the GeoTIFF. The `.ovr` is an overview file; its Esri metadata says nearest-neighbor pyramid resampling.

### Recovered M20 DEM outside the repository

`C:\Users\k3lly\Downloads\M20_JezeroCrater_CTXDEM_20m.tif` is a GeoTIFF, 90,345,300 bytes, 4,456 × 5,067 pixels, 1-band float32 at 20 m. Its CRS is Jezero equirectangular on the Mars 2000 sphere (R=3,396,190 m), standard parallel 18.4663°, central meridian 0°. Transform: `(20,0,4329000; 0,-20,1143420)`. Bounds are X 4,329,000–4,418,120 m and Y 1,042,080–1,143,420 m, or approximately 76.997437–78.582563° E and 17.580520–19.290187° N. NoData is `-3.4028234663852886e38`; it is uncompressed and not tiled. TIFF tags do not establish a vertical unit or datum.

The file’s SHA-256 is `ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2`, exactly matching the source hash recorded in `web/data/metadata.json`. Its location is outside the approved asset roots.

### Existing runtime dataset

The existing runtime bundle in `web/data/` remains the widest immediately usable application dataset: `terrain.f32.bin` is a 2,221 × 2,530 float32 grid at 40 m; `texture.jpg` is a 4,096 × 4,666 grayscale image; `metadata.json` describes the Mars 2000 sphere frame with standard parallel 18.4663°. Its geographic bounds are approximately 77.001–78.581° E and 17.582–19.289° N. `nodata.bin` exists, but `web/src/data/loader.js` does not load it.

## 2. Missing-dataset investigation and integrity

The Phase 4 audit did not find the M20 files. This Phase 5 search located them in `C:\Users\k3lly\Downloads`; the 5 m orthomosaic is also present at `resource-data/M20_JezeroCrater_CTXortho_mosaic_5m.tif`. The Phase 4 audit had found the Channel Fan TIFF only inside the ZIP; the Phase 5 recursive inventory found a standalone copy and sidecars under `resource-data/Jezero_ChannelFan_DEM/`. These findings reflect the workspace state during this audit; no extraction or copying was performed by this phase.

The search covered the project tree and common user data locations: Downloads, Desktop, Documents, OneDrive, and `D:\Kuliah`. The M20 DEM was found only in Downloads among these locations. The M20 orthomosaic was found in Downloads and in the project. This was a targeted filename search, not an exhaustive scan of system directories or other users’ files.

Both Download copies match the SHA-256 values recorded in runtime metadata:

| File | Recorded source SHA-256 | Observed SHA-256 | Result |
|---|---|---|---|
| `M20_JezeroCrater_CTXDEM_20m.tif` | `ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2` | `ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2` | Exact match |
| `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | `cd9f4b2154fdd43e8c17abfbae63210b72507db2209d1d7db63f6f855b18d2df` | `cd9f4b2154fdd43e8c17abfbae63210b72507db2209d1d7db63f6f855b18d2df` | Exact match |

The orthomosaic in `resource-data/` has the same observed SHA-256 as its Downloads copy. The Channel Fan TIFF already present under `resource-data/` has SHA-256 `105a258c9654a794d97175c9a8f63cbf71d878e99c5caebb049597ea28ab30dc`, equal to the TIFF member streamed directly from the ZIP. No extraction was performed during this phase.

The Channel Fan archive remains at `C:\Users\k3lly\Downloads\Jezero_ChannelFan_DEM.zip`. The ZIP was read in place; its five members are the TIFF, `.tfw`, `.tif.aux.xml`, `.tif.ovr`, and `.tif.xml`. The already-present project copy and archive member are byte-identical.

## 3. CRS and vertical-reference comparison

### Horizontal CRS

- **M20 regional CTX pair:** both use the same numerical Mars 2000 spherical equirectangular frame, standard parallel 18.4663°, central meridian 0°. Their WKT names differ, but the projection parameters agree. Their footprints are nearly coextensive.
- **Existing `JEZ_ctx_*` pair and HiRISE DEMs:** these use a Mars 2000 sphere with standard parallel 0°. The CTX DTM and 6 m ortho share origin and north/south bounds but differ in resolution and extend 12 m differently on the east edge. The 1 m and 5 m HiRISE DEMs share bounds; their grids are different.
- **Channel Fan:** its WKT specifies a Mars 2000 ellipsoid with inverse flattening 169.894447..., standard parallel 0°. This is not the spherical CRS used by the existing 0° CTX/HiRISE products, even though the projection name and radius look similar.
- **25 cm HiRISE ortho:** geographic coordinates with an unknown datum label. Its footprint aligns numerically with the HiRISE DEM’s approximate lon/lat bounds, but datum and co-registration are not independently established.
- **Runtime grid:** standard parallel 18.4663° on a sphere. It is not in the same projected frame as the 0° products or Channel Fan.

Explicit coordinate transformations are required to place datasets with different CRS definitions in one map frame. Do not copy projected coordinates between them. The 20 m and 5 m M20 rasters also have separate transforms and resolutions; their geographic coverage overlaps, but they are not the same grid.

### Vertical reference

No inspected elevation GeoTIFF establishes both elevation units and a vertical datum. MOLA/DeltaGeoid strings occur in some filenames, but are not enough to prove the vertical reference. The runtime metadata itself says its source vertical datum is not stated, despite describing the DEM as MOLA-referenced. Channel Fan’s XML has an empty elevation unit field. The M20 source DEM’s TIFF has no vertical unit metadata. Thus vertical offsets between source products cannot be safely assumed or corrected from filenames.

For the 1 m HiRISE DEM, `dem_sample_stats.json` contains estimates from 954,621 sampled valid pixels (estimated min −2665.08 m, max −1640.55 m, mean −2419.74 m); these are approximate statistics, not vertical-reference evidence. Channel Fan has embedded band statistics (min −2598.62, max −1622.38, mean −2256.00, standard deviation 233.34), and its auxiliary histogram indicates about 65.24% valid cells. These values also do not identify a datum.

## 4. Spatial coverage and terrain/imagery compatibility

| Product group | Approximate footprint | Assessment |
|---|---|---|
| M20 DEM and ortho | About 89.1 × 101.3 km; approximately 77.0–78.58° E, 17.58–19.29° N | Broad regional Jezero terrain and grayscale imagery. The DEM is nearly the same extent as the runtime bundle; the ortho is slightly inset/cropped. Together they are sufficient for the defined regional viewer extent, but do not by themselves prove coverage of every part of Jezero Crater. |
| Runtime 40 m DEM and texture | About 88.84 × 101.2 km, same regional area | Already loadable by the current viewer. At `meshStride: 4`, the rendered terrain samples roughly every 160 m, so it is suited to regional navigation/overview, not fine-scale terrain inspection. |
| `JEZ_ctx_*` 20 m DTM and 6 m ortho | About 31.9 × 30.2 km, 77.16–77.70° E and 18.21–18.72° N | Useful localized CTX terrain and image coverage, not a substitute for the broad M20 region. Their 0° standard parallel differs from the M20 pair. |
| HiRISE 1 m and 5 m DEMs | About 21.4 × 21.5 km, 77.223–77.584° E and 18.307–18.669° N | Candidate high-resolution local terrain. The checked-in `downsample_dem.py` uses the 1 m product to create a 5 m average-resampled derivative; the 5 m dimensions and transform are consistent with that recipe. The exact existing output’s generation history is not logged. |
| HiRISE 25 cm ortho | Approximately the same footprint as the HiRISE DEMs | Potential detailed grayscale texture, but its geographic datum is unknown and its 9.82 GB size is costly. Not necessary for the minimum environment. |
| Channel Fan 1 m DEM | About 14.3 × 17.2 km, 77.223–77.464° E and 18.372–18.662° N | Local terrain tile inside the Jezero region. It overlaps the existing HiRISE DEM area but has a distinct ellipsoidal CRS, transform, and grid; vertical datum is unknown. Keep separate until the source reference and transformation are verified. |

The M20 source hashes match the inputs identified in `web/data/metadata.json`, confirming the processed runtime terrain and texture were generated from these exact M20 files. The metadata describes cropping to a common extent, 2× averaging of the 20 m DEM to 40 m, and area-averaging the approximately 5 m imagery to the current texture grid. The current viewer consumes the processed binary/texture bundle, not these TIFFs.

### Sufficiency of the CTX pair

- The recovered M20 CTX DEM is a suitable broad terrain source for the defined regional footprint; its exact hash matches the recorded runtime input. The M20 orthomosaic provides nearly coextensive grayscale imagery and also matches its recorded source hash.
- The raw pair is not directly consumable by the existing loader. The current viewer already has a processed derivative of both sources, so it can provide an interactive regional environment without loading the raw TIFFs.
- The separate `JEZ_ctx_B_soc_008_*` pair is limited to a smaller local footprint and a different standard parallel. It can provide localized context only after explicit coordinate transformation.
- Neither CTX orthomosaic contains elevation. Imagery should be used for surface appearance, not terrain geometry.

## 5. Recommended terrain hierarchy

1. **Immediate regional fallback:** keep `web/data/terrain.f32.bin`, `texture.jpg`, and `metadata.json` as the current runtime base. Keep `nodata.bin` available; the current loader does not apply it.
2. **Raw regional source of record:** M20 20 m CTX DEM plus the M20 5 m CTX orthomosaic. Their recorded hashes are verified. The DEM is currently in Downloads rather than an approved repository root; the ortho is already under `resource-data/`. No file was moved or copied.
3. **Optional medium-detail local terrain:** `JEZ_hirise_DEM_5m.tif` is the lighter candidate for a HiRISE overlay. It has a smaller footprint and a 0° sphere CRS; registration/integration still needs its vertical reference and transformation path resolved.
4. **Optional high-detail terrain:** the 1 m HiRISE DTM may be retained as a separate detail source if performance and provenance requirements justify its approximately 1.84 GB size. Avoid loading it as a full-resolution regional mesh.
5. **Separate local scientific tile:** keep Channel Fan as its own 1 m terrain tile candidate. Do not merge it into the base until its vertical datum and ellipsoid-to-sphere mapping are documented and checked.
6. **Imagery:** use the M20 orthomosaic for the broad region. Consider the 25 cm HiRISE image only for a localized overlay after its datum/registration is clarified and memory/texture limits are addressed. The 6 m CTX image is a local alternative, not a regional replacement.

This hierarchy is a data recommendation only; no layer is registered or rendered by this phase.

## 6. Minimum data for a functional interactive Jezero environment

- **For the existing viewer as it currently works:** `web/data/metadata.json`, `web/data/terrain.f32.bin`, and `web/data/texture.jpg`. `web/data/nodata.bin` is present and should remain preserved, but the current loader does not read it.
- **For a minimally complete regional source pair:** the M20 CTX DEM supplies elevations; the matching M20 orthomosaic supplies optional grayscale visual texture. A DEM alone is enough for terrain geometry in a renderer that supports untextured terrain; imagery is not another elevation source.
- **For current implementation compatibility:** keep using the already-preprocessed runtime bundle. Direct TIFF loading, map-specific resource registration, and coordinate transformation are not implemented as part of this audit.
- **Higher-resolution HiRISE and Channel Fan layers are not required** for a functional broad Jezero scene. They are optional localized refinements with additional CRS, vertical-reference, storage, and rendering costs.

## 7. Remaining blockers and exact next actions

1. Preserve the hash-verified M20 source pair. Before any profile registration, obtain approval to place or otherwise make the M20 DEM available through an approved root; it currently remains in Downloads. The orthomosaic already has a repository copy with a matching hash.
2. Obtain authoritative source/product documentation for the M20 and HiRISE elevation vertical units/datum. Do not infer this from `MOLA`, `DeltaGeoid`, or `Mars2000` strings alone.
3. Obtain the Channel Fan source product identifiers and vertical reference, and define a documented coordinate operation from its Mars 2000 ellipsoid frame into the chosen runtime/map frame.
4. Validate any candidate transformation against independent geographic control points and overlapping terrain; treat the older `docs/DATASETS.md` offset/alignment figures as unverified until they can be reproduced from the exact files.
5. Decide the target coverage and detail budget: regional CTX base plus optional local HiRISE/Channel Fan tiles. Preserve each raster’s own CRS, transform, resolution, bounds, and NoData; do not merge source datasets.
6. Only after these checks and a separate approval, prepare profile resource entries and later implement a TIFF-aware map loader. Do not make Kelly launchable on the basis of this audit.

## 8. Validation and change scope

- Existing tests: run with `node --experimental-default-type=module --test web/test/*.test.js`.
- Whitespace validation: run `git diff --check`.
- Phase 0 integrity: verify all 18 hashes in `docs/PHASE0_ASSET_SHA256SUMS.txt`.
- Phase 5 changes: this report only. No TIFF, ZIP, profile manifest, profile launchability, runtime module, or test file was modified. The Channel Fan directory and M20 orthomosaic were present in the starting worktree; the M20 DEM remains in Downloads.
