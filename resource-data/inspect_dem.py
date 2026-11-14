
import rasterio
import json
import os

dem_path = r"D:\Kuliah\Semester_5\NASA\jalanpembangunan\resource-data\JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif"

if not os.path.exists(dem_path):
    raise FileNotFoundError(f"File tidak ditemukan: {dem_path}")

with rasterio.open(dem_path) as dem:
    metadata = {
        "filename": os.path.basename(dem_path),
        "file_size_GB": round(os.path.getsize(dem_path) / (1024**3), 3),
        "width": dem.width,
        "height": dem.height,
        "bands": dem.count,
        "crs": str(dem.crs),
        "bounds": list(dem.bounds),
        "resolution": list(dem.res),
        "dtype": dem.dtypes,
        "nodata": dem.nodata,
        "transform": list(dem.transform),
    }

    print(json.dumps(metadata, indent=4))

with open("dem_metadata.json", "w") as f:
    json.dump(metadata, f, indent=4)

print("\nMetadata berhasil disimpan!")
