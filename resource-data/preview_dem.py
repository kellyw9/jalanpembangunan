
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import json
import os

dem_path = r"D:\Kuliah\Semester_5\NASA\jalanpembangunan\resource-data\JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif"

output_dir = os.path.dirname(dem_path)

with rasterio.open(dem_path) as dem:

    # Baca DEM dalam resolusi lebih rendah
    data = dem.read(
        1,
        out_shape=(1200, 1200),
        masked=True,
        resampling=rasterio.enums.Resampling.average
    )

    valid = data.compressed()

    stats = {
        "sampled_valid_pixels": int(valid.size),
        "estimated_min_elevation": float(np.min(valid)),
        "estimated_max_elevation": float(np.max(valid)),
        "estimated_mean_elevation": float(np.mean(valid)),
        "estimated_percentiles": {
            "p05": float(np.percentile(valid, 5)),
            "p25": float(np.percentile(valid, 25)),
            "p50": float(np.percentile(valid, 50)),
            "p75": float(np.percentile(valid, 75)),
            "p95": float(np.percentile(valid, 95))
        }
    }

    # Buat visualisasi
    plt.figure(figsize=(12, 9))

    plt.imshow(data, cmap="terrain")
    plt.colorbar(label="Elevation (dataset units)")
    plt.title("HiRISE Jezero DEM - Elevation Preview")
    plt.xlabel("Pixel X")
    plt.ylabel("Pixel Y")

    plt.tight_layout()
    plt.savefig(
        os.path.join(output_dir, "dem_preview.png"),
        dpi=150
    )
    plt.close()

    # Simpan statistik
    with open(
        os.path.join(output_dir, "dem_sample_stats.json"),
        "w"
    ) as f:
        json.dump(stats, f, indent=4)

    print(json.dumps(stats, indent=4))
    print("\nPreview and statistics saved successfully!")
