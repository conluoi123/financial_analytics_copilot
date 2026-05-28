-- để theo dõi được kinh tế vĩ mô thay đổi (lạm phát, GDP) thì giá cổ phiếu ngân hàng thay đổi ra sao? 

WITH macro AS (
    SELECT * FROM {{ ref('stg_macro') }}
),

yearly_stocks AS (
    -- Tính giá trung bình của TOÀN BỘ ngân hàng theo từng năm
    SELECT
        CAST(YEAR(trade_date) AS INTEGER) AS report_year,
        ROUND(AVG(close_price), 2) AS avg_close_price
    FROM {{ ref('stg_stocks') }}
    GROUP BY 1
)

SELECT
    m.report_year,
    m.inflation_pct,
    m.lending_rate_pct,
    m.gdp_growth_pct,
    m.npl_to_gdp_pct,
    y.avg_close_price
FROM macro m
LEFT JOIN yearly_stocks y ON m.report_year = y.report_year
ORDER BY m.report_year DESC
