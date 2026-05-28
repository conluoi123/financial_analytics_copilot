-- Phần sql này có tác dụng 
-- 1. Lấy dữ liệu raw từ bronze layer 
-- 2. Ép kiểu dữ liệu chuẩn 
-- 3. Loại bỏ duplicate 
-- 4. Tạo dataset để đưa lên silver layer. 


WITH source AS (
    SELECT * FROM {{ source('bronze', 'vn_stocks') }}
),

typed AS (
    SELECT
        CAST(trade_date AS DATE)             AS trade_date,
        UPPER(ticker)                        AS ticker,
        bank_name,
        ROUND(CAST(open  AS DOUBLE), 2)      AS open_price,
        ROUND(CAST(high  AS DOUBLE), 2)      AS high_price,
        ROUND(CAST(low   AS DOUBLE), 2)      AS low_price,
        ROUND(CAST(close AS DOUBLE), 2)      AS close_price,
        CAST(volume AS BIGINT)               AS volume,
        ROUND(CAST(pct_change AS DOUBLE), 3) AS pct_change,
        _ingested_at
    FROM source
    WHERE close > 0
      AND volume >= 0
      AND trade_date IS NOT NULL
),

-- Loại bỏ duplicate — giữ bản ghi ingested muộn nhất
deduped AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY trade_date, ticker
            ORDER BY _ingested_at DESC
        ) AS rn
    FROM typed
)

SELECT * EXCLUDE (rn)
FROM deduped
WHERE rn = 1
