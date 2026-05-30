from dagster import Definitions, load_assets_from_modules
from orchestration import assets, schedules

# Tự động tải tất cả các @asset trong file assets.py
all_assets = load_assets_from_modules([assets])

# Đóng gói thành Ứng dụng Dagster
defs = Definitions(
    assets=all_assets,
    schedules=[schedules.daily_pipeline_schedule],
)
