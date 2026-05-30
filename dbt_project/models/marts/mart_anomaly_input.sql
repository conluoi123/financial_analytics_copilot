-- bảng này là nguyên liệu cho AI để phát hiện sự bất thường.
-- Sự xếp chồng: Bronze -> Silver -> Gold (bank_perf) -> Gold (anomaly_input)
--
-- Các cột Z-score được tính theo 2 loại cửa sổ:
--   w_price : rolling 30 ngày giao dịch  → cho giá & khối lượng (dữ liệu ngày)
--   w_fin   : rolling 8 quý              → cho chỉ số tài chính (dữ liệu quý)
-- Công thức: z = (x - mean) / stddev
-- Giá trị càng xa 0 → càng bất thường.
-- Ensemble Agent (anomaly_agent.py) dùng cột z_score và ma_30d làm tín hiệu chính.

WITH base AS (
    SELECT * FROM {{ ref('mart_bank_perf') }}
)

SELECT
    trade_date,
    ticker,
    close_price,
    pct_change,
    volume,

    -- Chỉ số tài chính (từ mart_bank_perf)
    nim_pct,
    npl_ratio_pct,
    car_pct,
    casa_ratio_pct,
    roe_pct,
    roa_pct,

    -- ----------------------------------------------------------------
    -- NHÓM 1: Moving Average & Z-score cho GIÁ (close_price)
    -- Ensemble Agent dùng ma_30d + z_score làm tín hiệu z-score chính
    -- ----------------------------------------------------------------

    -- MA 30 ngày của giá đóng cửa — "giá kỳ vọng"
    ROUND(AVG(close_price) OVER w_price, 2)                         AS ma_30d,

    -- Z-score của close_price so với rolling 30 ngày
    -- Đây là cột "z_score" chính mà anomaly_agent.py sẽ query
    ROUND(
        (close_price - AVG(close_price) OVER w_price)
        / NULLIF(STDDEV(close_price) OVER w_price, 0),
    4)                                                              AS z_score,

    -- Z-score của % thay đổi giá (đã có từ trước)
    ROUND(
        (pct_change - AVG(pct_change) OVER w_price)
        / NULLIF(STDDEV(pct_change) OVER w_price, 0),
    4)                                                              AS pct_change_zscore,

    -- ----------------------------------------------------------------
    -- NHÓM 2: Z-score cho KHỐI LƯỢNG giao dịch (volume)
    -- Volume tăng đột biến thường đi kèm sự kiện bất thường
    -- ----------------------------------------------------------------

    ROUND(
        (volume - AVG(volume) OVER w_price)
        / NULLIF(STDDEV(volume) OVER w_price, 0),
    4)                                                              AS volume_zscore,

    -- ----------------------------------------------------------------
    -- NHÓM 3: Z-score cho CHỈ SỐ TÀI CHÍNH (rolling 8 quý ≈ 2 năm)
    -- Dùng cửa sổ w_fin vì dữ liệu tài chính là theo quý,
    -- không thay đổi theo ngày → cần partition + order khác
    -- ----------------------------------------------------------------

    -- Z-score NIM (Net Interest Margin)
    -- NIM giảm mạnh → biên lãi ròng thu hẹp → rủi ro kinh doanh
    ROUND(
        (nim_pct - AVG(nim_pct) OVER w_fin)
        / NULLIF(STDDEV(nim_pct) OVER w_fin, 0),
    4)                                                              AS nim_zscore,

    -- Z-score NPL (Non-Performing Loan ratio)
    -- NPL tăng đột biến → nợ xấu gia tăng → rủi ro tín dụng
    ROUND(
        (npl_ratio_pct - AVG(npl_ratio_pct) OVER w_fin)
        / NULLIF(STDDEV(npl_ratio_pct) OVER w_fin, 0),
    4)                                                              AS npl_zscore,

    -- Z-score CAR (Capital Adequacy Ratio)
    -- CAR giảm dưới ngưỡng Basel III (8%) → cảnh báo an toàn vốn
    ROUND(
        (car_pct - AVG(car_pct) OVER w_fin)
        / NULLIF(STDDEV(car_pct) OVER w_fin, 0),
    4)                                                              AS car_zscore,

    -- Z-score ROE (Return on Equity)
    -- ROE biến động mạnh có thể phản ánh thay đổi chiến lược hoặc rủi ro
    ROUND(
        (roe_pct - AVG(roe_pct) OVER w_fin)
        / NULLIF(STDDEV(roe_pct) OVER w_fin, 0),
    4)                                                              AS roe_zscore

FROM base

WINDOW
    -- Cửa sổ 30 ngày giao dịch — dùng cho giá & khối lượng
    w_price AS (
        PARTITION BY ticker
        ORDER BY trade_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ),

    -- Cửa sổ 8 quý (~2 năm) — dùng cho chỉ số tài chính ngân hàng
    -- Vì financial data lặp lại theo ngày trong cùng 1 quý,
    -- rolling rows ở đây hoạt động như rolling 8 lần thay đổi giá trị
    w_fin AS (
        PARTITION BY ticker
        ORDER BY trade_date
        ROWS BETWEEN 547 PRECEDING AND CURRENT ROW  -- ~8 quý * 91 ngày/quý
    )

ORDER BY trade_date DESC, ticker
