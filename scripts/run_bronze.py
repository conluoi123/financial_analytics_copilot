from datetime import date
from finsight.pipeline.extractors.market import MarketExtractor
from finsight.pipeline.delta_writer import write_bronze

print("Đang khởi tạo Market Extractor...")
extractor = MarketExtractor()

print("Đang kéo dữ liệu cổ phiếu VCB, BID, CTG, MBB, TCB...")
df = extractor.run(date.today())

print(f"Kéo thành công {len(df)} dòng dữ liệu!")
if not df.empty:
    print("Đang lưu vào thư mục data/bronze/vn_stocks (Delta Lake)...")
    write_bronze(df, "vn_stocks")
    print("Hoàn tất!")
else:
    print("Không có dữ liệu mới.")
