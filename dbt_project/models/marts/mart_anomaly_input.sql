-- bảng này là nguyên liệu cho AI. để nó phát hiện được sự bất thường 

-- Gọi thẳng vào bảng Gold vừa tạo (mart_bank_perf)
-- Sự xếp chồng: Bronze -> Silver -> Gold (bank_perf) -> Gold (anomaly)
WITH base AS (
    SELECT * FROM {{ ref('mart_bank_perf') }}
)

SELECT
    trade_date,
    ticker,
    close_price,
    pct_change,
    volume,
    npl_ratio_pct,
    
    -- Tính Z-Score 30 ngày (Rolling Z-Score)
    -- Giúp phát hiện: "Hôm nay giá thay đổi 5% là bình thường hay bất thường so với 1 tháng qua?"
    ROUND(
        (pct_change - AVG(pct_change) OVER w) 
        / NULLIF(STDDEV(pct_change) OVER w, 0), 
    4) AS pct_change_zscore

FROM base
-- Định nghĩa cái khung cửa sổ 30 ngày cho AI tính toán
WINDOW w AS (
    PARTITION BY ticker 
    ORDER BY trade_date 
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
)
ORDER BY trade_date DESC, ticker

