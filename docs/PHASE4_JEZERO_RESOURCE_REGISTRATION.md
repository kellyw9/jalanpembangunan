# Phase 4: Jezero Resource Verification and Registration

**Audit date:** 2026-11-14  
**Scope:** Read-only verification of the three named datasets, their available metadata, the approved roots, and current profile/resource contracts. No raster was modified, extracted, resampled, reprojected, or registered.

## 1. Actual locations

The approved asset-root registry currently allows only repository-relative `web/data` (`web-data`) and `resource-data` (`resource-data`).

| Dataset | Located physical path | Finding |
|---|---|---|
| `M20_JezeroCrater_CTXDEM_20m.tif` | No matching file in the repository or the supplied ZIP. | Only referenced by `web/data/metadata.json` and documentation as an input to the existing runtime bundle. |
| `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | No matching file in the repository or the supplied ZIP. | Only referenced by `web/data/metadata.json` and documentation as an input to the existing runtime bundle. |
| `Jezero_ChannelFan_DEM.tif` | ZIP member `Jezero_ChannelFan_DEM.tif` in `C:\Users\k3lly\Downloads\Jezero_ChannelFan_DEM.zip` (484,457,772 uncompressed bytes). | It is readable for metadata through the ZIP virtual path, but is not a standalone file under an approved root. No extraction was performed. |

The Channel Fan ZIP contains five members:

| ZIP member | Uncompressed bytes | Notes |
|---|---:|---|
| `Jezero_ChannelFan_DEM.tif` | 484,457,772 | Main GeoTIFF; compressed member size 468,257,310 bytes. |
| `Jezero_ChannelFan_DEM.tfw` | 91 | World-file transform; agrees with the GeoTIFF transform. |
| `Jezero_ChannelFan_DEM.tif.aux.xml` | 2,773 | Embedded statistics and histogram metadata. |
| `Jezero_ChannelFan_DEM.tif.ovr` | 143,767,307 | Overview sidecar; XML indicates nearest-neighbor pyramid resampling. |
| `Jezero_ChannelFan_DEM.tif.xml` | 5,459 | Esri metadata sidecar with title, source-path text, CRS, and geographic/projected extents. |

There are no loose matching `.xml`, `.aux.xml`, `.tfw`, `.json`, or raster files for the three names in the repository. The two M20 rasters also do not occur as members of the supplied ZIP.

## 2. Dataset metadata

### Channel Fan TIFF: metadata read from the ZIP member

Rasterio opened the GeoTIFF member without extracting it. Its physical container is the ZIP outside the repository; `resource-data/Jezero_ChannelFan_DEM.tif` does not exist.

| Property | Verified value |
|---|---|
| Format / driver | GeoTIFF (`GTiff`) |
| Member size | 484,457,772 bytes uncompressed; 468,257,310 bytes compressed in the ZIP |
| Dimensions | 14,341 × 17,220 pixels |
| Bands / data type | 1 band; float32 |
| CRS authority | None recognized |
| Resolution | 1 × 1 projected metre |
| Affine transform | `(1, 0, 4577343.614954024; 0, -1, 1106210.024117969)` |
| Projected bounds | X 4,577,343.614954024–4,591,684.614954024 m; Y 1,088,990.024117969–1,106,210.024117969 m |
| Geographic bounds | XML sidecar: 77.222555–77.464497° E, 18.371920–18.662432° N |
| NoData | `-3.4028234663852886e+38` |
| Compression / tiling | LZW; tiled, 128 × 128 blocks |
| Band unit | Not supplied |

Full CRS WKT2 reported by Rasterio:

```text
PROJCRS["MarsEC0",BASEGEOGCRS["GCS_Mars_2000",DATUM["Mars_2000",ELLIPSOID["Mars_2000_IAU_IAG",3396190,169.894447223612,LENGTHUNIT["metre",1,ID["EPSG",9001]]]],PRIMEM["Reference_Meridian",0,ANGLEUNIT["degree",0.0174532925199433,ID["EPSG",9122]]]],CONVERSION["unnamed",METHOD["Equidistant Cylindrical",ID["EPSG",1028]],PARAMETER["Latitude of 1st standard parallel",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8823]],PARAMETER["Longitude of natural origin",0,ANGLEUNIT["degree",0.0174532925199433],ID["EPSG",8802]],PARAMETER["False easting",0,LENGTHUNIT["metre",1],ID["EPSG",8806]],PARAMETER["False northing",0,LENGTHUNIT["metre",1],ID["EPSG",8807]]],CS[Cartesian,2],AXIS["easting",east,ORDER[1],LENGTHUNIT["metre",1,ID["EPSG",9001]]],AXIS["northing",north,ORDER[2],LENGTHUNIT["metre",1,ID["EPSG",9001]]]]
```

Embedded statistics are metadata, not newly computed here: minimum `-2598.6171875`, maximum `-1622.3764648438`, mean `-2256.0015218124`, and standard deviation `233.34367018836`. The auxiliary histogram is marked `Approximate=0`; its 256 counts sum to 161,116,666 cells, or about **65.24%** of the 246,952,020-cell raster. This is consistent with the NoData sentinel accounting for about 34.76% of cells. No full pixel scan was performed.

Dataset tags include `AREA_OR_POINT=Area`; the band tag `RepresentationType=ATHEMATIC`; the statistics above; and `IMAGE_STRUCTURE` tags `COMPRESSION=LZW`, `INTERLEAVE=BAND`. The Esri metadata gives the item title `CenterFan_plus_Channel.tif`, creation date 2017-10-12, and a legacy processing location `Y:\Processing\Mars2020\HiRISE_DEM\ASP\Jezero\Rectified\Projected\Mosaics\CenterFan_plus_Channel.tif`.

The world file stores pixel-center coordinates. Applying the half-pixel corner offset yields the same top-left origin as the GeoTIFF affine (`4577343.614954024`, `1106210.024117969`). The XML sidecar reports 1 m pixels, 14,341 × 17,220 dimensions, the same projected bounds, and the same NoData value.

### M20 CTX rasters: no TIFF metadata available locally

Because neither M20 TIFF is present, none of its actual file size, band count, dtype, full CRS WKT, affine transform, exact bounds, NoData, compression, tiling, embedded tags, or raster statistics could be inspected. The following are **recorded source metadata, not re-verified TIFF facts**:

| Named source | Recorded facts in `web/data/metadata.json` | Additional documented but unverified facts |
|---|---|---|
| `M20_JezeroCrater_CTXDEM_20m.tif` | Terrain-geometry source; nominal 20 m; dimensions 4,456 × 5,067; recorded SHA-256 `ba7f706ea1b5d63a562f28a7dcf7a7f3c79bce7f048e6974b57e8a33c30d1ba2`; credit says USGS Astrogeology / NASA Mars 2020 CTX DEM. | `docs/DATASETS.md` describes a one-band float32 GeoTIFF in a Mars 2000 spherical equirectangular frame, but that cannot be checked against the absent file. |
| `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | Surface-texture source; dimensions 17,766 × 20,234; nominal resolutions 5.002064681102627 × 5.002262971613293 m; recorded SHA-256 `cd9f4b2154fdd43e8c17abfbae63210b72507db2209d1d7db63f6f855b18d2df`; credit says USGS Astrogeology / NASA Mars 2020 CTX orthomosaic. | `docs/DATASETS.md` describes one-band uint8 grayscale imagery and a CRS shared with the source DEM. These remain documentation-level claims until the actual TIFF is available. |

`web/data/metadata.json` describes the existing processed runtime grid as a Mars 2000 **sphere** equirectangular frame (radius 3,396,190 m, standard parallel 18.4663°). It records a Jezero-region extent and says its two named inputs were cropped to a common extent without reprojection. This does not substitute for inspecting the original M20 files.

## 3. Provenance assessment

### Verified facts

- The Channel Fan XML sidecar explicitly gives a Jezero-area geographic bounding box and a projected coordinate system named `MarsEC0`.
- Its source item is titled `CenterFan_plus_Channel.tif`; its metadata path text includes `Mars2020\HiRISE_DEM\ASP\Jezero\...`. The metadata records a 2017-10-12 ArcGIS 10.4 environment and a source raster type of continuous floating point.
- The sidecar’s CRS describes an ellipsoid with radius 3,396,190 m and inverse flattening 169.894447223612; standard parallel and central meridian are both 0°.
- The raster transform, world-file transform, XML extents, dimensions, and nominal pixel resolution agree.
- The two M20 source names, claimed dimensions/resolutions, source hashes, and NASA/USGS credits are recorded in the existing runtime metadata, but the source files themselves are unavailable here.

### Reasonable inferences

- The Channel Fan raster is a processed Jezero-area terrain mosaic associated with Mars 2020 / HiRISE DEM processing. This inference is supported by its title, legacy source path, and geographic extent; it is not a substitute for source product identifiers.
- The Channel Fan footprint (about 77.223–77.464° E, 18.372–18.662° N) is geographically inside the broad Jezero runtime region and overlaps the existing candidate HiRISE DTM footprint.

### Unknown or not established

- Original HiRISE image/stereo product IDs, acquisition identifiers, producer/author, and the exact source-to-mosaic processing lineage are absent.
- The Channel Fan elevation unit and vertical datum are not declared. The XML’s elevation `UOM` is empty.
- The `kelly` profile is still marked `pending-verification`; project metadata does not independently establish ownership of this particular file by Kelly. The user’s request establishes the desired target profile, but does not place the ZIP member inside its approved resource root.
- The M20 input files’ direct metadata and recorded hashes cannot be verified without the files. A hash written in runtime metadata is not evidence that a same-named local file exists or matches it.

## 4. Spatial compatibility

- **Channel Fan versus runtime grid:** the Channel Fan CRS uses the Mars 2000 ellipsoid (inverse flattening 169.894447...), standard parallel 0°. The runtime grid is explicitly a Mars 2000 sphere with standard parallel 18.4663°. Their coordinate values are not interchangeable. An explicitly chosen coordinate operation and independent vertical-reference review are required before overlay.
- **Channel Fan versus existing candidate CTX rasters:** the existing `resource-data/JEZ_ctx_*` GeoTIFFs use a Mars 2000 sphere, standard parallel 0°, with 20 m and 6 m grids. Their geographic footprints overlap the Channel Fan, but the ellipsoid definition differs and their grids/resolutions/footprints are not identical.
- **Channel Fan versus existing HiRISE DTM:** the existing 1 m HiRISE DTM uses a Mars 2000 sphere, standard parallel 0°, with bounds X 4,577,366–4,598,766 m and Y 1,085,130–1,106,618 m. The Channel Fan uses an ellipsoidal Mars 2000 CRS and bounds X 4,577,343.614954–4,591,684.614954 m and Y 1,088,990.024118–1,106,210.024118 m. Both are nominally 1 m, but origins, grids, and footprints differ; no grid identity or co-registration is established.
- **Channel Fan versus CTX source products:** the M20 DEM and ortho cannot be spatially compared directly because their TIFF files are absent. The runtime metadata claims those inputs shared a CRS and common extent during preprocessing; it does not establish a relationship to the Channel Fan.
- **Regional coverage:** the runtime bundle is broad (approximately 77.001–78.581° E, 17.582–19.289° N). The Channel Fan metadata describes a much smaller Jezero-area tile. Its local geographic extent is compatible with that regional location, not with a claim of full-crater high-resolution coverage.
- **Later integration:** resolve the ellipsoid-versus-sphere/latitude semantics and vertical datum first. Then define an explicit transformation into the chosen map frame and an independent sampling/grid-alignment strategy. If a common pixel grid is required for rendering, resampling is a later derived operation; no data was aligned or resampled in this phase.
- `docs/DATASETS.md` reports a historical elevation difference and a possible horizontal shift based on comparisons of the three rasters. The M20 files are absent, and the referenced alignment script expects external files; these numeric claims were not reproducible in this workspace and are not treated as verified findings.

## 5. Registration decisions

The only approved roots remain `web/data` and `resource-data`. The secure server resolver accepts regular files whose canonical paths remain inside one of those roots; it does not resolve ZIP members or paths from Downloads.

| Dataset | Classification | Registration decision |
|---|---|---|
| `M20_JezeroCrater_CTXDEM_20m.tif` | **NOT ELIGIBLE** | No physical file was found in the repository or uploaded ZIP. Recorded metadata alone cannot meet the physical-file requirement. |
| `M20_JezeroCrater_CTXortho_mosaic_5m.tif` | **NOT ELIGIBLE** | No physical file was found in the repository or uploaded ZIP. Recorded metadata alone cannot meet the physical-file requirement. |
| `Jezero_ChannelFan_DEM.tif` | **PRESENT BUT REQUIRES VERIFICATION** | TIFF and sidecars exist only as members of a ZIP outside the repository and approved roots. Its Jezero coverage is supported by sidecar metadata, but source product lineage and vertical reference remain incomplete. It cannot resolve through the current approved-root resolver in this location. |

**No resources were registered.** No entries were added to `web/maps/profiles/kelly/resources.json`; it remains an empty manifest with `profileId: "kelly"` and `resources: []`. No proposed or inferred manifest entry is being treated as an actual registration. The `kelly` profile remains non-launchable, and teammate and placeholder profiles were not changed.

The existing runtime bundle in `web/data/` was left in place and its configuration was not changed. It remains the current viewer’s fallback data.

## 6. Remaining risks and recommended next phase

- Make the two M20 TIFF files available as regular files within an approved root, or provide an authorized source location that can be added to the allowlist through a separately approved change.
- Decide whether to stage the Channel Fan TIFF and its needed sidecars under `resource-data/`. No files were extracted or copied from the ZIP in this phase.
- Obtain source product identifiers and vertical-unit/datum information for the Channel Fan mosaic and confirm that the dataset is intended for the `kelly` profile.
- Re-verify all three TIFFs directly at their approved-root paths, then prepare schema-valid entries with each raster’s own exact CRS, affine, dimensions, resolution, bounds, and NoData metadata. Do not infer the Channel Fan CRS from other Mars products.
- After verification and registration approval, a later phase may implement map-specific loading/rendering and explicit coordinate transformations. Do not enable the profile until its full resource and mission requirements are satisfied.

## 7. Files changed

Created for Phase 4:

- `docs/PHASE4_JEZERO_RESOURCE_REGISTRATION.md`

No existing files were modified. In particular, all TIFFs, the ZIP, `web/maps/profiles/kelly/resources.json`, other profile manifests, `server.js`, `server/approvedAssetResolver.cjs`, and runtime modules were left untouched.
