# Financial Analytics Copilot (FinSight)

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
