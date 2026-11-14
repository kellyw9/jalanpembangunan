# Phase 3: Jezero Data Inventory and Provenance Audit

**Audit date:** 2026-11-14  
**Scope:** Read-only inspection of `web/data/`, `resource-data/`, related metadata, documentation, and preprocessing code. Rasterio was used to read GeoTIFF metadata; raster pixel arrays were not read. No preprocessing, reprojection, resampling, or data writes were performed.

## 1. Dataset inventory

### Existing runtime bundle: `web/data/`

This is the currently configured single-map runtime dataset. The files are processed outputs, not the original GeoTIFFs. The affine shown for the binary terrain is the north-up, corner-based equivalent derived from the JSON extent and 40 m cell size; the JSON labels grid samples as pixel-centre referenced.

| File | Format/state; size | Dimensions, bands, type | CRS and resolution | Affine (a,b,c; d,e,f) | Bounds and NoData |
|---|---|---|---|---|---|
| `web/data/terrain.f32.bin` | Little-endian float32 binary; processed/runtime-ready; 22,476,520 bytes | 2,221 × 2,530 cells; one elevation value/cell; float32 | Custom equirectangular Mars 2000 sphere, radius 3,396,190 m, standard parallel 18.4663°, central meridian 0°; 40 × 40 m | `[40,0,4329200; 0,-40,1143340]` (derived; extent values are rounded here) | Projected X 4,329,200–4,418,040 m, Y 1,042,140–1,143,340 m; approximately 77.0010–78.5811° E, 17.5815–19.2888° N. Sentinel `-3.402823466e38` is recorded in metadata; the separate mask has zero flagged cells. |
| `web/data/texture.jpg` | Grayscale JPEG; processed/runtime-ready; 5,971,729 bytes | 4,096 × 4,666; one channel; 8-bit grayscale per metadata | Same common extent/CRS as the runtime terrain; approximately 21.69 m/pixel in each direction | Not stored as a separate georeferencing transform. Derived north-up transform is approximately `[21.68945,0,4329200; 0,-21.68967,1143340]` | Same common extent as terrain. No NoData value is declared for the JPEG. |
| `web/data/nodata.bin` | Packed bit-mask; processed/runtime-ready sidecar; 702,392 bytes | One bit per terrain cell; 5,619,130 cells | Inherits terrain grid; no independent CRS or transform | Inherits terrain grid | `1` means a source NoData cell was filled for rendering. The inspected mask contains zero set bits. |

`web/data/metadata.json` (3,260 bytes) describes the grid, extents, texture dimensions, elevation statistics, source names, source checksums, and preprocessing. It is metadata, not a raster.

### Supplied GeoTIFFs: `resource-data/`

The following metadata was read directly from the five locally present TIFFs. The projected bounds and transforms are in each file’s native coordinates. Geographic bounds for projected products are approximate conversions using the raster’s stated spherical equirectangular parameters.

| File | Format/state; size | Dimensions, bands, type | CRS and resolution | Affine (a,b,c; d,e,f) | Bounds and NoData |
|---|---|---|---|---|---|
| `resource-data/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | GeoTIFF; candidate source product; 9,675,294 bytes | 1,596 × 1,512; 1 band; float32 | Rasterio reports `ESRI:103885`; spherical equirectangular, R=3,396,190 m, standard parallel 0°, central meridian 0°; 20 × 20 m | `[20,0,4573663.250853; 0,-20,1109693.140188]` | X 4,573,663.250853–4,605,583.250853 m, Y 1,079,453.140188–1,109,693.140188 m; approximately 77.1605–77.6990° E, 18.2110–18.7212° N. NoData `-3.4028226550889045e38`. |
| `resource-data/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif` | GeoTIFF; candidate imagery product; 36,269,402 bytes | 5,322 × 5,040; 1 band; uint8 grayscale | Same numerical projected parameters as the CTX DTM above; 6 × 6 m | `[6,0,4573663.250853; 0,-6,1109693.140188]` | X 4,573,663.250853–4,605,595.250853 m, Y 1,079,453.140188–1,109,693.140188 m; approximately 77.1605–77.6992° E, 18.2110–18.7212° N. NoData is recorded as `0`. |
| `resource-data/JEZ_hirise_DEM_5m.tif` | GeoTIFF; likely downsampled derivative per the checked-in script; 22,486,856 bytes | 4,280 × 4,298; 1 band; float32 | Rasterio reports `ESRI:103885`; spherical equirectangular, R=3,396,190 m, standard parallel 0°, central meridian 0°; 5 × 4.999534667 m | `[5,0,4577366; 0,-4.999534667,1106618]` | X 4,577,366–4,598,766 m, Y 1,085,130–1,106,618 m; approximately 77.2229–77.5840° E, 18.3068–18.6693° N. NoData `-3.4028226550889045e38`. |
| `resource-data/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` | GeoTIFF; candidate source DTM; 1,839,718,122 bytes | 21,400 × 21,488; 1 band; float32 | Rasterio reports `ESRI:103885`; spherical equirectangular, R=3,396,190 m, standard parallel 0°, central meridian 0°; 1 × 1 m | `[1,0,4577366; 0,-1,1106618]` | X 4,577,366–4,598,766 m, Y 1,085,130–1,106,618 m; approximately 77.2229–77.5840° E, 18.3068–18.6693° N. NoData `-3.4028226550889045e38`. |
| `resource-data/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd.tif` | GeoTIFF; candidate source imagery; 9,822,748,524 bytes | 85,600 × 85,952; 1 band; uint8 grayscale | Geographic coordinates on an unnamed sphere (R=3,396,190 m); WKT datum is `unknown`; resolution 4.2176512×10⁻⁶ degrees. This is approximately 0.237 m east-west and 0.250 m north-south near the footprint center. | `[4.2176512e-6,0,77.2229330769714; 0,-4.2176512e-6,18.669315006877742]` | Longitude 77.222933–77.583964° E, latitude 18.306799–18.669315° N. NoData is recorded as `0`. |

All five TIFFs report one band. Their only ordinary TIFF tag found was `AREA_OR_POINT=Area`; band units and descriptions are absent. Thus elevation units and vertical datum are not established by these TIFF headers.

### Named source rasters that are not present

`web/data/metadata.json` names `M20_JezeroCrater_CTXDEM_20m.tif` and `M20_JezeroCrater_CTXortho_mosaic_5m.tif` as its inputs and records SHA-256 values for them. Neither named file is present in `resource-data/` or elsewhere in the inspected repository. `docs/DATASETS.md` reports dimensions, resolution, and bounds for those sources, but those values could not be rechecked against the missing files. In particular, their exact native transforms and file sizes cannot be verified here.

`docs/DATASETS.md` and `preprocessing/check_fan_alignment.py` also refer to `Jezero_ChannelFan_DEM.tif` and sidecars. None of those files is present. The alignment measurements in that document are therefore documentation-only for this audit and were not reproduced.

## 2. Provenance findings

### Runtime bundle

- **Verified locally:** `metadata.json` identifies the result as “Jezero Crater region (Mars 2020 landing-site CTX products)” and records the two original source filenames, source sizes/resolutions, source SHA-256 values, and credits to USGS Astrogeology / NASA Mars 2020 terrain data.
- **Recorded processing:** `preprocessing/preprocess.py` describes cropping the CTX DEM and orthomosaic to a common extent, averaging the DEM 2×2 to 40 m, averaging the imagery to a 4,096-pixel-wide grayscale texture, and writing a packed NoData mask. The output metadata says zero output cells were filled.
- **Not independently verified:** the two named source TIFFs are absent, so their recorded hashes and their exact source lineage cannot be checked against local inputs. The raw source DEM’s vertical unit and datum are not stated in the available metadata; “MOLA-referenced” is explicitly qualified there as not stated in the source metadata.

### Supplied GeoTIFFs

- **Geographic coverage:** the `JEZ_ctx_*` and `JEZ_hirise_*` filenames and their coordinates place the candidate products in the Jezero area. The `JEZ_ctx_*` projected extents convert to roughly 77.16–77.70° E and 18.21–18.72° N. The HiRISE DTM footprint is about 77.22–77.58° E and 18.31–18.67° N. These facts support Jezero-area coverage, but filenames and coordinates do not establish profile ownership or full source lineage.
- **Instrument/source:** `CTX` and `hirise` appear in filenames. The TIFF metadata itself does not provide product IDs, acquisition identifiers, producer credits, or mission attribution. The available evidence is insufficient to independently establish the originating source products or their owner.
- **HiRISE 5 m derivative:** `resource-data/downsample_dem.py` names the 1 m DTM as input and `JEZ_hirise_DEM_5m.tif` as output. The output dimensions and footprint are consistent with that recipe. The file does not record an execution log or source checksum, so the exact generation history is not confirmed.
- **Supporting metadata:** `dem_metadata.json` reports the 1 m DTM’s dimensions, CRS, bounds, resolution, transform, NoData, and file size. `dem_sample_stats.json` says its statistics were estimated from sampled valid pixels. `preview_dem.py` produces the preview and sampled statistics by reading the DTM into a 1,200×1,200 output shape; neither file is a substitute for the source raster.

### XML and PDF references

- `Perseverance_Traverse_Path-fgdc.xml` identifies “Perseverance (Mars 2020) Path,” includes a Mars 2020 / Jezero abstract, and gives a bounding box of 77.303808–77.463133° E and 18.427253–18.499663° N. It contains no route geometry, so it cannot serve as a machine-readable traverse layer.
- Embedded PDF metadata identifies `sim3464.pdf` as a USGS Scientific Investigations Map 3464 map sheet and `sim3464_pamphlet.pdf` as its pamphlet. Both give the title “Geologic Map of Jezero Crater and the Nili Planum Region, Mars.” These are supporting geological references, not registered GIS polygons or raster layers.
- No local PDF text-extraction package or PDF command-line parser was available. The titles above were read from embedded metadata strings; the PDF page contents were not fully extracted or interpreted.
- No shapefile, GeoJSON, GeoPackage, or other machine-readable geological-unit polygons were found in the repository. No CRISM or OMEGA raster products were found in the inspected dataset locations.

## 3. Spatial compatibility

1. **The four projected `resource-data/` rasters are numerically compatible in projection parameters, but not identical grids.** Rasterio reports `ESRI:103885`; their WKT labels differ between CTX and HiRISE files, while the inspected PROJ definitions all normalize to a spherical equirectangular projection with radius 3,396,190 m, standard parallel 0°, central meridian 0°, and zero false offsets. Confirm vertical datum and product semantics before scientific combination.
2. **The CTX 20 m DTM and 6 m ortho share a projected origin and north/south extent, but not a raster grid.** They have different pixel sizes and dimensions; the ortho extends 12 m farther east. They can be placed in the same numerical coordinate frame, but rendering on one grid requires per-layer coordinate sampling or resampling.
3. **The 1 m and 5 m HiRISE DEMs have the same projected bounds and origin, but different dimensions and resolutions.** Their grid spacing is not identical; the 5 m file’s north-south pixel size is about 4.999535 m. The downsample script supports a likely derivation, but does not prove the actual file’s lineage.
4. **The 25 cm HiRISE ortho is geographic, unlike the projected DEMs.** Its geographic footprint matches the 1 m DTM’s projected footprint when converted using the stated sphere, but it requires a coordinate transformation for overlay and has a different pixel grid. The geographic datum is labeled unknown in its WKT.
5. **The runtime bundle uses a different equirectangular standard parallel.** Its standard parallel is 18.4663°, while the projected `resource-data/` rasters use 0°. Despite similar sphere/central-meridian values, their X coordinates are not interchangeable; any overlay requires an explicit transformation between the defined coordinate frames.
6. **No reprojection, grid alignment, or resampling was performed during this audit.** The current runtime’s regional footprint is approximately 77.001–78.581° E, 17.582–19.289° N; candidate CTX and HiRISE products cover smaller areas within that geographic region. Different resolution, footprint, NoData, and vertical-datum handling remain independent concerns.
7. The documented `Jezero_ChannelFan_DEM.tif` comparison is excluded from these findings because its source raster and sidecars are absent locally.

## 4. Current runtime data assessment

- `web/data/terrain.f32.bin` is a row-major, northern-row-first, little-endian float32 grid with 2,221 columns × 2,530 rows at 40 m. Its byte length exactly equals `cols × rows × 4`.
- `web/data/texture.jpg` is a grayscale image whose dimensions and common extent are specified in `metadata.json`. The runtime loader fetches it through Three.js.
- `web/data/nodata.bin` is a packed bitmask with the expected `ceil(cells/8)` length. The inspected mask has zero set bits; metadata records the source sentinel and `nodata_cells_filled: 0`.
- `web/src/data/loader.js` consumes `metadata.json`, `terrain.f32.bin`, and the configured texture as-is, and checks that the terrain value count matches the metadata dimensions. It does **not** load or apply `nodata.bin`, and it does not verify the texture’s decoded dimensions against metadata.
- The runtime bundle works with the current single-map loader configuration, but it is not yet a registered map resource set. Its source TIFFs are absent, and no profile ownership was established. Runtime compatibility does not resolve either question.

## 5. Resource recommendations

These recommendations use profile-registration readiness, which includes sufficient ownership and provenance—not just whether the current loader can consume a file. No resource is assigned to Kelly or teammate.

| Resource | Classification | Reason |
|---|---|---|
| `web/data/metadata.json`, `terrain.f32.bin`, `nodata.bin`, `texture.jpg` (as one runtime bundle) | **REQUIRES FURTHER VERIFICATION** | The bundle is runtime-ready and its internal sizes agree, but its named raw source files are absent and ownership by Kelly has not been verified. |
| `resource-data/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif` | **REQUIRES FURTHER VERIFICATION** | Metadata and bounds support Jezero-area coverage; source product identity, producer details, vertical units/datum, and profile ownership remain unverified. |
| `resource-data/JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif` | **REQUIRES FURTHER VERIFICATION** | Its numerical CRS matches the candidate CTX DTM, but source lineage and ownership are unverified, and its grid/footprint differs. |
| `resource-data/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif` | **REQUIRES FURTHER VERIFICATION** | It has useful spatial metadata and a local sidecar, but lacks verified product provenance, vertical-reference details, and profile ownership. |
| `resource-data/JEZ_hirise_DEM_5m.tif` | **REQUIRES FURTHER VERIFICATION** | The checked-in downsample recipe and matching footprint suggest a derived product; the exact processing lineage and profile ownership are not recorded. |
| `resource-data/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd.tif` | **REQUIRES FURTHER VERIFICATION** | Its footprint aligns geographically with the HiRISE DTM, but its WKT datum is unknown, it uses a geographic grid, and its source/owner are unverified. |
| `resource-data/Perseverance_Traverse_Path-fgdc.xml` | **NOT SUITABLE YET** as a traverse layer | It provides a bounding box and descriptive text, not path geometry. It may be kept as a documentary reference pending ownership confirmation. |
| `resource-data/sim3464.pdf` and `sim3464_pamphlet.pdf` | **NOT SUITABLE YET** as a GIS geology layer | They identify a geological map and pamphlet, but do not provide registered, queryable unit polygons in the repository. Documentary use is distinct from a vector geology resource. |
| `resource-data/dem_preview.png` and `dem_sample_stats.json` | **NOT SUITABLE YET** as terrain resources | They are preview/estimated-statistics outputs, not authoritative georeferenced raster products. |

No item is classified **READY FOR PROFILE REGISTRATION** because current ownership is unresolved. The runtime bundle is technically usable by the existing viewer, but that is not sufficient evidence to place it in Kelly’s profile.

## 6. Uncertainties and missing information

- Which supplied products, if any, are specifically owned by Kelly remains unverified. No file was assigned based on its name or directory.
- The raw `M20_JezeroCrater_CTXDEM_20m.tif` and `M20_JezeroCrater_CTXortho_mosaic_5m.tif` files named by runtime metadata are absent; their recorded source hashes cannot be checked against local originals.
- The four projected candidate TIFFs have matching numerical projection parameters but differing WKT labels. Their source product identifiers, vertical units, and vertical datum/registration are not established by available raster tags.
- The 5 m HiRISE product’s dimensions and bounds are consistent with the downsample script, but there is no recorded output hash or processing run record that links that specific file to that specific execution.
- The 25 cm HiRISE ortho uses a geographic CRS with an unknown datum label. Its local geographic bounds align with the projected HiRISE DTM only after applying the stated spherical conversion; this does not prove radiometric or scientific co-registration.
- `docs/DATASETS.md` contains details about a `Jezero_ChannelFan_DEM.tif` and sidecars that are not present in the current repository. Those documentation claims were not treated as current raster evidence.
- The supplied PDFs’ embedded title metadata was inspected, but their full page content and citations were not extracted.
- No machine-readable geology polygons or CRISM/OMEGA products were found in the inspected workspace.
- Preprocessing scripts were inspected but not run. Some write outputs (including under `web/data/` or `resource-data/`), so running them would violate this phase’s read-only constraint.
