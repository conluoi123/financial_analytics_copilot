-- 


WITH source AS (
    SELECT * FROM {{ source('bronze', 'world_bank') }}
),

-- Pivot từ long format (indicator_name, value) sang wide format (1 row per year)
pivoted AS (
    PIVOT source
    ON indicator_name IN (
        'inflation_pct',
        'lending_rate_pct', 
        'gdp_growth_pct',
        'npl_to_gdp_pct'
    )
    USING FIRST(value)
    GROUP BY year
),

typed AS (
    SELECT
        CAST(year AS INTEGER)                  AS report_year,
        CAST(inflation_pct    AS DOUBLE)       AS inflation_pct,
        CAST(lending_rate_pct AS DOUBLE)       AS lending_rate_pct,
        CAST(gdp_growth_pct   AS DOUBLE)       AS gdp_growth_pct,
        CAST(npl_to_gdp_pct   AS DOUBLE)       AS npl_to_gdp_pct
    FROM pivoted
    WHERE year >= 2018
)

SELECT * FROM typed
ORDER BY report_year
