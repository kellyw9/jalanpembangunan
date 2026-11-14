
import rasterio
from rasterio.enums import Resampling
from affine import Affine
import os

input_file = (
    "JEZ_hirise_soc_006_DTM_MOLAtopography_"
    "DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif"
)

output_file = "JEZ_hirise_DEM_5m.tif"

print("Opening original DEM...")

with rasterio.open(input_file) as src:

    new_width = round(src.width * 0.2)
    new_height = round(src.height * 0.2)

    print(f"Original: {src.width} x {src.height}")
    print(f"Output:   {new_width} x {new_height}")

    data = src.read(
        1,
        out_shape=(new_height, new_width),
        resampling=Resampling.average,
        masked=True
    )

    new_transform = src.transform * Affine.scale(
        src.width / new_width,
        src.height / new_height
    )

    profile = src.profile.copy()

    profile.update(
        width=new_width,
        height=new_height,
        transform=new_transform,
        compress="deflate",
        predictor=3,
        tiled=True,
        blockxsize=256,
        blockysize=256,
        BIGTIFF="IF_SAFER"
    )

    print("Writing downsampled DEM...")

    with rasterio.open(output_file, "w", **profile) as dst:
        dst.write(data.filled(src.nodata), 1)

print("\nSuccessfully created:", output_file)
print(
    "Output size:",
    round(os.path.getsize(output_file) / (1024**2), 2),
    "MB"
)
