from dagster import ScheduleDefinition
from orchestration.assets import bronze_data, silver_data, gold_data, ml_anomalies

# Lên lịch chạy vào 16:00 (sau giờ đóng cửa thị trường) từ Thứ 2 đến Thứ 6
daily_pipeline_schedule = ScheduleDefinition(
    name="daily_financial_pipeline",
    target=[bronze_data, silver_data, gold_data, ml_anomalies],
    cron_schedule="0 16 * * 1-5", 
    execution_timezone="Asia/Ho_Chi_Minh",
)
