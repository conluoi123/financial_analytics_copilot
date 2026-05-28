# Financial Analytics Copilot (FinSight)

FinSight là một hệ thống phân tích dữ liệu tài chính (tập trung vào ngành Ngân hàng Việt Nam) được xây dựng theo chuẩn Data Engineering hiện đại (Medallion Architecture) kết hợp Machine Learning và LLM Agent.

## 🚀 Tiến độ dự án hiện tại

Chúng ta đang xây dựng Data Pipeline theo kiến trúc Medallion.

### ✅ Layer 1: Ingestion & Bronze Layer (Hoàn thành)
- Tích hợp `vnstock` v4 để kéo giá cổ phiếu (OHLCV) và chỉ số tài chính (NIM, NPL, CAR, CASA, ROA, ROE) của 5 ngân hàng (VCB, BID, CTG, MBB, TCB).
- Tích hợp World Bank API để kéo số liệu vĩ mô (Lạm phát, Lãi suất, GDP, Nợ xấu/GDP).
- Validate dữ liệu bằng `Pydantic` ngay tại cổng vào.
- Lưu trữ dữ liệu thô vào **Delta Lake** (Append-only, ACID) tại thư mục `data/bronze/`.

### ✅ Layer 2: DuckDB & Silver Layer (Hoàn thành)
- Xây dựng cầu nối **DuckDB Warehouse** (`backend/db/warehouse.py`) tạo Views trực tiếp từ Delta Lake bằng `delta_scan` (Zero-copy architecture).
- Viết các models dbt (`models/staging/*.sql`) để clean, cast type, dedup (dùng `ROW_NUMBER`), và pivot data.
- Thiết lập Data Quality Tests bằng dbt (`.yml` và Singular tests) (VD: NPL > 30% alert). **Đã pass 16/16 tests.**

### ✅ Layer 3: Gold Layer (Hoàn thành)
- [x] Xây dựng bảng `mart_bank_perf` kết hợp giá cổ phiếu và tài chính.
- [x] Xây dựng bảng `mart_macro` kết hợp vĩ mô.
- [x] Xây dựng bảng `mart_anomaly_input` để tính Z-score phục vụ ML.

### ⏳ Layer 4: Machine Learning & LLM Agent (Sắp tới - Bước 4)
- [ ] Isolation Forest cho Anomaly Detection.
- [ ] LSTM Autoencoder & Prophet Forecasting.
- [ ] LangGraph State Machine & Semantic Layer (NL to SQL).

---

## 🛠️ Known Issues & Troubleshooting (Data Engineering)

Trong quá trình xây dựng Layer 1 (Bronze), dự án đã đối mặt và giải quyết các vấn đề thực tế từ API bên thứ ba:

### 1. Lỗi cấu trúc dữ liệu `vnstock` v4 (FinancialsExtractor)
- **Vấn đề:** Hàm `stock.finance.ratio(period="quarter")` trong phiên bản `vnstock` 4.0+ trả về dữ liệu dưới định dạng báo cáo (`orient='report'`). Các hàng là Tên chỉ số, các cột là thời gian (ví dụ: `2018-Q1`). Điều này phá vỡ luồng đọc dữ liệu cũ. 
- **Cách xử lý (Data Wrangling):** 
  - Áp dụng kỹ thuật `Transpose` (`df.T`) để xoay trục bảng dữ liệu, chuyển `item_id` thành cột và biến các Quý thành hàng.
  - Sử dụng hàm `_safe_float` đọc trực tiếp các `item_id` chuyên biệt của ngân hàng (`npl`, `net_interest_margin`, `car`, `casa_ratio`) từ nguồn dữ liệu VCI mới.

### 2. Lỗi `list index out of range` ở World Bank API
- **Vấn đề:** API của World Bank thỉnh thoảng trả về mảng lỗi (không có dữ liệu) cho chỉ số Nợ xấu trên GDP (`FS.AST.NPLL.GD.ZS`). Việc truy cập `data[1]` gây lỗi văng chương trình.
- **Cách xử lý:** Thêm logic bảo vệ `if len(data) > 1 and isinstance(data[1], list):` để bỏ qua các phản hồi rỗng, giúp tiến trình lấy dữ liệu Vĩ mô không bị sập.

---

## 📌 Lưu ý vnstock migration (2026)
- Dự án đã cập nhật dùng `vnstock>=4.0.0` trong `requirements.txt`.
- Cảnh báo: Lớp `Vnstock().stock(...)` đang bị deprecate. Trong các bản nâng cấp tới, sẽ chuyển hoàn toàn sang `vnstock.api` (Ví dụ: `from vnstock.api.quote import Quote`).
