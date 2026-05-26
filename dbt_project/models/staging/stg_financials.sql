WITH source AS (
    SELECT * FROM {{ source('bronze', 'vn_financials') }}
),

typed AS (
    SELECT
        UPPER(ticker)              AS ticker,
        period,
        CAST(year    AS INTEGER)   AS report_year,
        CAST(quarter AS INTEGER)   AS report_quarter,
        -- NIM thường được report dạng %, giữ nguyên
        CAST(nim        AS DOUBLE) AS nim_pct,
        CAST(npl_ratio  AS DOUBLE) AS npl_ratio_pct,
        CAST(car        AS DOUBLE) AS car_pct,
        CAST(casa_ratio AS DOUBLE) AS casa_ratio_pct,
        CAST(roe        AS DOUBLE) AS roe_pct,
        CAST(roa        AS DOUBLE) AS roa_pct,
        _ingested_at
    FROM source
    WHERE year >= 2018
      AND quarter BETWEEN 1 AND 4
),

deduped AS (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY ticker, period
            ORDER BY _ingested_at DESC
        ) AS rn
    FROM typed
)

SELECT * EXCLUDE (rn)
FROM deduped
WHERE rn = 1
