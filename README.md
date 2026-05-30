# Financial Analytics Copilot (FinSight)

FinSight is a Financial Analytics Copilot for Vietnamese banking stocks, built with a Medallion data architecture (Bronze/Silver/Gold), ML anomaly detection, and an AI agent layer.

## Project Status (Updated: 2026-05-30)

### Completed

#### 1. Data Ingestion and Bronze Layer
- Integrated market and banking data sources:
  - `vnstock` for OHLCV and bank financial ratios
  - World Bank API for macro indicators
- Added schema validation at ingestion.
- Stored raw data in Delta Lake (`data/bronze/*`) with append-only behavior.

#### 2. Silver Layer
- Built cleaned/typed datasets from Bronze.
- Added deduplication and conformance logic.
- Produced Silver artifacts:
  - `data/silver/market_daily.parquet`
  - `data/silver/financials_quarterly.parquet`
  - `data/silver/macro_yearly.parquet`
  - `data/silver/silver_features.parquet`

#### 3. Gold Layer
- Built modeling-ready datasets:
  - `data/gold/gold_full.parquet`
  - `data/gold/gold_fallback.parquet`
  - `data/gold/gold_latest_snapshot.parquet`
- Built DuckDB marts:
  - `mart_bank_perf`
  - `mart_macro`
  - `mart_anomaly_input`

#### 4. Feature Store
- Implemented `ml/feature_store.py` to read from `mart_anomaly_input`.
- Exported feature set for anomaly models (z-score based features).

### In Progress

#### 5. ML Anomaly Models
- Isolation Forest module is being finalized.
- LSTM Autoencoder module is under debugging (tensor shape alignment and reconstruction output flow).

### Not in Scope for Current Milestone
- Prophet forecasting is intentionally skipped for now.

---

## Next Tasks

### A. Finish Isolation Forest End-to-End
- Finalize training/inference pipeline:
  - train bundle (imputer/scaler/model)
  - prediction output (`anomaly_score`, `is_anomaly_if`)
  - save/load model bundle
- Add simple explainability field (`reason_features`: top contributing z-score features).

### B. Stabilize LSTM Autoencoder
- Fix model output shape to match input feature dimension.
- Ensure `reconstruction_error` is generated for each sequence.
- Move anomaly thresholding logic outside training loop.

### C. Evaluation and Benchmarking
- Compare Isolation Forest vs z-score rule baseline.
- Add walk-forward time split validation.
- Track per-ticker anomaly rate stability over time.

### D. Integration Layer
- Standardize anomaly output schema for downstream consumers:
  - `trade_date`, `ticker`, `anomaly_score`, `is_anomaly`, `reason_features`
- Prepare backend consumption path for anomaly results.

### E. Quality and Testing
- Extend tests for:
  - feature availability and null policy
  - shape consistency for LSTM tensors
  - model I/O (save/load)
- Keep running:
  - `pytest -q tests`
  - `python scripts/check_pipeline_quality.py`

---

## Recommended Run Order

```bash
python -m scripts.run_bronze
python -m scripts.run_silver
python -m scripts.run_gold
python -m ml.feature_store
python -m ml.anomaly.isolation_forest
python -m ml.anomaly.lstm_autoencoder
pytest -q tests
python scripts/check_pipeline_quality.py
```

---

## Current Risks
- Financial coverage is lower than market coverage, causing sparse joins.
- Quarterly financial metrics mapped to daily rows can create missing spans.
- LSTM pipeline is sensitive to feature-shape and sequence handling.

## Short-Term Success Criteria
- Isolation Forest runs end-to-end on current feature store.
- LSTM Autoencoder trains and returns valid reconstruction errors.
- Both models output a consistent anomaly schema that backend can consume.
