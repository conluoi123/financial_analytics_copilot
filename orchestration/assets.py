from dagster import asset, AssetExecutionContext
from scripts.run_bronze import run_all as run_bronze 
from finsight.pipeline.transforms.silver_builder import run_silver
from finsight.pipeline.transforms.gold_builder import build_gold 
from ml.feature_store import build_anomaly_features
from ml.anomaly.isolation_forest import IsolationForestDetector

@asset(description="Kéo dữ liệu tài chính từ VNStock về lưu vào Bronze layer (Delta Lake)")
def bronze_data(context: AssetExecutionContext): 
    context.log.info("Bắt đầu kéo dữ liệu vào Bronze Layer...")
    run_bronze()
    context.log.info("Bronze layer ingestion hoàn tất.")
    return True 


@asset(description="Làm sạch và kết nối dữ liệu Bronze chuyển sang Silver layer (DuckDB).", deps=[bronze_data])
def silver_data(context: AssetExecutionContext): 
    context.log.info("Bắt đầu xây dựng Silver layer...")
    output = run_silver()
    for k, v in output.items(): 
        context.log.info(f"Đã ghi bảng {k}: {len(v)} rows")
    return True


@asset(description="Tổng hợp và làm đẹp dữ liệu Silver chuyển sang Gold layer (PostgreSQL).", deps=[silver_data])
def gold_data(context: AssetExecutionContext):
    context.log.info("Bắt đầu xây dựng Gold layer...")
    output = build_gold()
    for k, v in output.items(): 
        context.log.info(f"Đã ghi bảng {k}: {len(v)} rows")
    return True


@asset(description="Chạy mô hình Isolation Forest để phát hiện dữ liệu bất thường ngay sau khi có số liệu mới.", deps=[gold_data])
def ml_anomalies(context: AssetExecutionContext):
    context.log.info("Đang lấy dữ liệu features cho Machine Learning...")
    df_features = build_anomaly_features(days=365)   
    if df_features.empty:
        context.log.warning("Không có dữ liệu để chạy ML.")
        return False     
    context.log.info(f"Đang chạy Isolation Forest trên {len(df_features)} bản ghi...")
    detector = IsolationForestDetector(contamination=0.05)
    df_result = detector.fit_predict(df_features)
    anomalies = df_result[df_result['is_anomaly'] == -1]
    context.log.info(f"Pipeline đã quét xong. Phát hiện tổng cộng {len(anomalies)} điểm giao dịch bất thường trên toàn thị trường.")
    return True
