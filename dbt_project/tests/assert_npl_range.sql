-- Custom singular test
-- dbt chạy query này và expect 0 rows trả về
-- Nếu có row nào → test FAIL

-- ref ở đây có tác dụng lấy table được build từ model stg_stock.sql

-- cần test ở pha này vì mức độ test này phức tạp hơn, cần một case đặc thù riêng cho những test khó này 
SELECT
    ticker,
    period,
    npl_ratio_pct
FROM {{ ref('stg_financials') }}
WHERE npl_ratio_pct > 30
