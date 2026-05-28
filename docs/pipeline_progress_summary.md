# Data Pipeline Progress Summary

## 1. Scope Completed
- Implemented end-to-end data pipeline with 3 layers:
  - Bronze: extract + append to Delta tables
  - Silver: clean, deduplicate, conform, join-ready features
  - Gold: modeling-ready datasets (full/fallback/latest)
- Added basic validation tests and quality-check flow.

## 2. Current Pipeline Structure
- `finsight/pipeline/extractors/`
  - `market.py`
  - `financials.py`
  - `world_bank.py`
- `finsight/pipeline/writers/`
  - `bronze_writer.py`
- `finsight/pipeline/transforms/`
  - `silver_builder.py`
  - `gold_builder.py`
- Compatibility wrappers kept:
  - `finsight/pipeline/delta_writer.py`
  - `finsight/pipeline/silver.py`
  - `finsight/pipeline/gold.py`
- Entrypoints:
  - `scripts/run_bronze.py`
  - `scripts/run_silver.py`
  - `scripts/run_gold.py`
  - `scripts/run_pipeline.py` (user-added)

## 3. Bronze Layer Status
### Sources
- `vn_stocks` (market)
- `vn_financials` (finance ratios)
- `world_bank` (macro indicators)

### Storage
- Delta tables under `data/bronze/<source_name>`.

### Notable behavior
- Financial source is rate-limited in guest mode.
- Added retry/backoff and safer request pacing.
- Financial schema rows failing validation are dropped (logged).

## 4. Silver Layer Status
Built outputs:
- `data/silver/market_daily.parquet`
- `data/silver/financials_quarterly.parquet`
- `data/silver/macro_yearly.parquet`
- `data/silver/silver_features.parquet`

Silver logic includes:
- Type normalization (`datetime`, numeric coercion)
- Key deduplication:
  - market: `ticker + trade_date`
  - financials: `ticker + period`
  - macro: `indicator_name + year`
- Feature join by:
  - market + financials: `ticker + year + quarter`
  - macro by `year`

## 5. Gold Layer Status
Built outputs:
- `data/gold/gold_full.parquet`
  - Rows with at least one financial metric present
- `data/gold/gold_fallback.parquet`
  - All rows, used as robust baseline training dataset
- `data/gold/gold_latest_snapshot.parquet`
  - Latest row per ticker (for current inference/reporting)

Additional market features generated:
- `ret_1d`
- `ret_5d`
- `volatility_20d`
- `volume_chg_5d`

## 6. Validation and Quality
### Tests
- `pytest -q tests` => `3 passed`
- Current tests cover:
  - Schema presence
  - Uniqueness keys
  - Basic business rules

### Quality check
- Added `scripts/check_pipeline_quality.py` (user-added)
- Produces quality report from silver/gold artifacts.

## 7. Latest Observed Data Snapshot
From latest successful run:
- Silver:
  - market_daily: `10777` rows
  - financials_quarterly: `19` rows
  - macro_yearly: `9` rows
  - silver_features: `10777` rows
- Coverage:
  - financial coverage: `10.66%`
  - macro coverage: `84.04%`
- Gold:
  - gold_full: `1149` rows
  - gold_fallback: `10777` rows
  - gold_latest_snapshot: `5` rows

## 8. Root Cause Findings (Financial Coverage)
- Financial data availability is inconsistent due to source/API behavior and plan limits.
- Mapping mismatch was identified and debugged using `item_id` and transposed columns.
- Current valid metric keys observed include:
  - `net_interest_margin`, `npl`, `car`, `casa_ratio`, `roe`, `roa`.

## 9. Important Fixes Already Applied
- Refactored pipeline into clear layers (extractors/writers/transforms).
- Added backward-compatible wrappers for old imports.
- Fixed encoding issue by rewriting modules as UTF-8.
- Implemented Silver/Gold as reusable pipeline modules, scripts as thin runners.

## 10. Known Gaps / Risks
- Financial coverage remains limited; `gold_full` is much smaller than fallback.
- Quarterly financial data joined to daily market data leads to sparse matches without propagation.
- Need cautious handling of missing values (`None` vs `0.0`) to avoid false signals.

## 11. Recommended Next Steps
1. Finalize financial extractor mapping and null policy:
   - Never default missing metrics to `0.0`.
2. Improve financial-to-daily alignment in Gold:
   - Apply controlled forward fill by ticker for quarterly metrics.
3. Keep two-model strategy:
   - Main model on `gold_fallback`
   - Comparative model on `gold_full`
4. Add stronger tests:
   - Freshness checks
   - Join coverage thresholds
   - Drift checks over time

## 12. Run Commands
```bash
python -m scripts.run_bronze
python -m scripts.run_silver
python -m scripts.run_gold
pytest -q tests
python scripts/check_pipeline_quality.py
```

---
_Last updated: 2026-05-28_
