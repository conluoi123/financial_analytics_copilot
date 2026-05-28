-- bản chất silver ko xử lí dữ liệu rồi lưu lại vào ổ cứng để bảo toàn tính bất biến dữ liệu. Silver chỉ như một cái filter để làm dữ liệu sạch hơn khi áp vào thôi. 

-- vì vậy ở tầng gold (tức marts) nó sẽ dùng filter này kết hợp với join bảng để lưu nhưng table sạch vào. Vẫn là finsightdb


-- bản chất bảng này có tác dụng 
WITH daily_stocks AS (
    SELECT * FROM {{ ref('stg_stocks') }}
),

quarterly_financials AS (
    SELECT * FROM {{ ref('stg_financials') }}
)

SELECT
    s.trade_date,
    s.ticker,
    s.bank_name,
    s.close_price,
    s.volume,
    s.pct_change,
    
    -- Lấy thông tin tài chính của QUÝ TƯƠNG ỨNG với ngày giao dịch
    -- Ví dụ: ngày 2024-02-15 sẽ lấy data tài chính của 2024-Q1
    f.nim_pct,
    f.npl_ratio_pct,
    f.car_pct,
    f.casa_ratio_pct,
    f.roe_pct,
    f.roa_pct,

    -- Tính P/B (Price-to-Book) giả định nếu có book value, tạm thời dùng indicator này
    -- cho thấy sự tương quan giữa giá và nợ xấu
    ROUND(s.close_price / NULLIF(f.npl_ratio_pct, 0), 2) AS price_to_npl_ratio
    
FROM daily_stocks s
LEFT JOIN quarterly_financials f 
    ON s.ticker = f.ticker
    -- Trick quan trọng: Đổi trade_date (ngày) thành định dạng "YYYY-QQ" để JOIN
    -- Ví dụ: '2024-02-15' -> Năm 2024, Quý 1 -> '2024-Q1'
    AND f.period = CAST(YEAR(s.trade_date) AS VARCHAR) || '-Q' || CAST(QUARTER(s.trade_date) AS VARCHAR)

-- Lọc những ngày có giá trị hợp lệ để ML model học tốt hơn
WHERE s.trade_date >= '2020-01-01'
ORDER BY s.trade_date DESC, s.ticker
