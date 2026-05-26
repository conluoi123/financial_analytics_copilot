# FinSight — Hướng Dẫn Triển Khai Chi Tiết

> **Financial Analytics Copilot** · Python + Dagster + dbt + Delta Lake + DuckDB + LangGraph + FastAPI + Next.js
> Target: Intern candidate @ NAB · Timeline: 3 tuần

---

## Mục lục

1. [Kiến trúc tổng thể](#1-kiến-trúc-tổng-thể)
2. [Repo Structure](#2-repo-structure)
3. [Bronze Layer — Ingestion & Raw Storage](#3-bronze-layer)
   - 3.1 Nguồn dữ liệu thực
   - 3.2 BaseExtractor interface (Pydantic schema)
   - 3.3 Market Extractor — vnstock
   - 3.4 Financials Extractor — vnstock quarterly
   - 3.5 World Bank Extractor
   - 3.6 Delta Lake writer
4. [Silver Layer — dbt Transform](#4-silver-layer)
   - 4.1 Tại sao dbt
   - 4.2 dbt project setup
   - 4.3 Staging models
   - 4.4 dbt tests
   - 4.5 Great Expectations checkpoint
5. [Gold Layer — Serving Marts](#5-gold-layer)
   - 5.1 Mart models
   - 5.2 DuckDB + Delta extension
   - 5.3 Semantic layer
6. [Orchestration — Dagster](#6-orchestration)
   - 6.1 Tại sao Dagster
   - 6.2 Asset definitions
   - 6.3 Schedule & sensor
7. [Agent Pipeline — NL → Insight](#7-agent-pipeline)
   - 7.1 NL → SQL agent
   - 7.2 ML Anomaly Detection — Isolation Forest + LSTM Autoencoder
   - 7.3 Root cause analysis
   - 7.4 LangGraph orchestrator
   - 7.5 ML Forecasting — Prophet + LSTM Price Model
8. [Backend API — FastAPI](#8-backend-api)
9. [Frontend — Next.js](#9-frontend)
10. [Observability & Cost Tracking](#10-observability)
11. [Auth & RBAC](#11-auth--rbac)
12. [Setup & Chạy thử](#12-setup--chạy-thử)
13. [Architecture Decision Records](#13-architecture-decision-records)
14. [Câu hỏi phỏng vấn thường gặp](#14-câu-hỏi-phỏng-vấn)
15. [MLOps — Model Registry & Drift Detection](#15-mlops)

---

## 1. Kiến trúc tổng thể

```
┌──────────────────────────────────────────────────────────────┐
│                         SOURCES — real data                  │
│  vnstock (HOSE/HNX) │ World Bank API │ vnstock Financials    │
└──────────┬───────────────────────────────────────────────────┘
           │  BaseExtractor + Pydantic schema validation
┌──────────▼───────────────────────────────────────────────────┐
│  BRONZE LAYER   data/bronze/{source}/                        │
│  Delta Lake — ACID · append-only · time travel · schema evo  │
└──────────┬───────────────────────────────────────────────────┘
           │  dbt Core (DuckDB adapter) — SQL models + ref()
┌──────────▼───────────────────────────────────────────────────┐
│  SILVER LAYER   DuckDB (materialized từ Delta)               │
│  stg_stocks │ stg_macro │ stg_financials                     │
│  typed · deduped · dbt tests · Great Expectations            │
└──────────┬───────────────────────────────────────────────────┘
           │  dbt mart models — aggregation + join
┌──────────▼───────────────────────────────────────────────────┐
│  GOLD LAYER   DuckDB tables                                  │
│  mart_bank_perf │ mart_macro │ mart_anomaly_input            │
│  Semantic layer JSON → AI agent                              │
└──────────┬───────────────────────────────────────────────────┘
           │  Dagster orchestrates toàn bộ pipeline trên
┌──────────▼───────────────────────────────────────────────────┐
│  AGENT LAYER   LangGraph                                     │
│  NL→SQL Agent │ Anomaly Agent │ RCA Agent │ Narrator         │
└──────────┬───────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  API LAYER   FastAPI                                         │
│  /query │ /anomalies │ /rca │ /metrics │ /auth               │
└──────────┬───────────────────────────────────────────────────┘
           │
┌──────────▼───────────────────────────────────────────────────┐
│  FRONTEND   Next.js                                          │
│  Chat UI │ Anomaly Dashboard │ Observability Panel           │
└──────────────────────────────────────────────────────────────┘
```

**Observability chạy xuyên suốt mọi layer:**
data quality results · dbt lineage DAG · Dagster asset graph · token cost · latency · run history

**Medallion architecture:**

| Layer | Platform | Đặc điểm |
|---|---|---|
| Bronze | Delta Lake | Append-only, immutable, full history, ACID, time travel |
| Silver | dbt + DuckDB | SQL transform, lineage tự động, test tích hợp |
| Gold | dbt + DuckDB | Business marts, semantic layer, AI-ready |

---

## 2. Repo Structure

```
finsight/
├── pipeline/                    ← DE layer
│   ├── extractors/
│   │   ├── base.py              ← BaseExtractor + Pydantic schema
│   │   ├── market.py            ← vnstock — daily price OHLCV (real)
│   │   ├── financials.py        ← vnstock — quarterly NIM NPL CAR (real)
│   │   └── world_bank.py        ← World Bank API — macro indicators (real)
│   └── delta_writer.py          ← Delta Lake write helper
│
├── dbt_project/                 ← dbt Core project
│   ├── dbt_project.yml
│   ├── profiles.yml             ← DuckDB adapter
│   ├── models/
│   │   ├── sources.yml          ← khai báo Bronze tables
│   │   ├── staging/             ← Silver layer
│   │   │   ├── stg_stocks.sql
│   │   │   ├── stg_stocks.yml   ← dbt tests
│   │   │   ├── stg_macro.sql
│   │   │   ├── stg_macro.yml
│   │   │   ├── stg_financials.sql
│   │   │   └── stg_financials.yml
│   │   └── marts/               ← Gold layer
│   │       ├── mart_bank_perf.sql
│   │       ├── mart_macro.sql
│   │       └── mart_anomaly_input.sql
│   └── tests/
│       └── assert_npl_range.sql ← custom test
│
├── orchestration/               ← Dagster
│   ├── assets/
│   │   ├── bronze_assets.py
│   │   ├── silver_assets.py
│   │   └── gold_assets.py
│   ├── jobs.py
│   ├── schedules.py
│   └── definitions.py
│
├── backend/                     ← API + Agent layer
│   ├── main.py
│   ├── agents/
│   │   ├── graph.py             ← LangGraph state machine
│   │   ├── nl_to_sql.py
│   │   ├── anomaly_agent.py     ← Ensemble: z-score + IF + LSTM AE
│   │   ├── rca_agent.py
│   │   ├── forecast_agent.py    ← Prophet + LSTM forecast narrative
│   │   └── narrator.py
│   ├── db/
│   │   ├── warehouse.py         ← DuckDB init + Delta extension
│   │   └── query.py
│   ├── semantic/
│   │   ├── schema.json          ← Domain knowledge (Gold schema)
│   │   └── loader.py
│   ├── auth/
│   │   └── jwt.py
│   └── observability/
│       └── logger.py
│
├── ml/                          ← ML layer
│   ├── anomaly/
│   │   ├── isolation_forest.py  ← Isolation Forest trainer + predictor
│   │   ├── lstm_autoencoder.py  ← LSTM Autoencoder (PyTorch)
│   │   └── evaluate.py          ← So sánh ML vs z-score baseline
│   ├── forecasting/
│   │   ├── prophet_forecaster.py ← NPL/NIM trend — 4 quý tới
│   │   └── lstm_price.py        ← Stock price forecast (7 ngày)
│   ├── feature_store.py         ← Feature engineering từ Gold marts
│   ├── model_registry.py        ← MLflow experiment tracking
│   ├── drift_detection.py       ← PSI drift check per feature
│   └── backtesting.py           ← Walk-forward validation
│
├── great_expectations/          ← GE project (tự sinh khi init)
│   ├── checkpoints/
│   └── expectations/
│
├── frontend/                    ← Next.js
│   ├── app/
│   ├── components/
│   └── lib/
│
├── data/
│   ├── bronze/                  ← Delta Lake tables (append-only)
│   │   ├── vn_stocks/           ← _delta_log/ + parquet parts
│   │   ├── vn_financials/
│   │   └── world_bank/
│   ├── finsight.duckdb          ← Silver + Gold (dbt materializes vào đây)
│   └── observability.db         ← API metrics
│
├── docs/adr/
├── .env
├── requirements.txt
└── README.md
```

---

## 3. Bronze Layer

### 3.1 Nguồn dữ liệu thực

Toàn bộ 3 nguồn đều là **real data** — không có synthetic.

| Nguồn | Library | Dữ liệu | Tần suất |
|---|---|---|---|
| **vnstock** | `vnstock3` | Daily OHLCV — VCB BID CTG MBB TCB | Daily |
| **vnstock financials** | `vnstock3` | Quarterly NIM NPL CAR CASA ratio từ BCTC | Quarterly |
| **World Bank API** | `requests` | Inflation GDP lending rate NPL/GDP VN | Annual (update hàng tháng) |

`vnstock` lấy data trực tiếp từ sàn HOSE/HNX/UPCOM và từ báo cáo tài chính niêm yết công khai — đây là **data nội bộ ngân hàng thực** mà guide cũ phải fake bằng synthetic generator. Không cần intern access production DB.

### 3.2 BaseExtractor interface — Pydantic schema validation

Điểm khác biệt với guide cũ: schema được enforce **tại điểm ingestion** bằng Pydantic, không phải validate sau khi đã lưu xuống raw.

```python
# pipeline/extractors/base.py
from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
import pandas as pd
from pydantic import BaseModel, ValidationError
from typing import Type

class BaseExtractor(ABC):
    source_name: str               # subclass override
    schema: Type[BaseModel]        # Pydantic model — subclass override

    def extract(self, run_date: date) -> pd.DataFrame:
        raise NotImplementedError

    def validate_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate từng row theo Pydantic schema. Drop row lỗi, log warning."""
        valid_rows = []
        errors     = []
        for i, row in df.iterrows():
            try:
                self.schema(**row.to_dict())
                valid_rows.append(row)
            except ValidationError as e:
                errors.append({"row": i, "error": str(e)})
        if errors:
            print(f"⚠️  {self.source_name}: {len(errors)} rows failed schema — dropped")
        return pd.DataFrame(valid_rows).reset_index(drop=True)

    def run(self, run_date: date) -> pd.DataFrame:
        """Entry point: extract → validate → return clean DataFrame."""
        df = self.extract(run_date)
        return self.validate_schema(df)
```

`save_raw` không còn ở đây — việc ghi xuống Delta Lake do `DeltaWriter` đảm nhiệm riêng, tách biệt hoàn toàn.

### 3.3 Market Extractor — vnstock daily prices

```python
# pipeline/extractors/market.py
import pandas as pd
from datetime import date, timedelta
from pydantic import BaseModel, field_validator
from vnstock3 import Vnstock
from .base import BaseExtractor

VN_BANK_TICKERS = {
    "VCB": "Vietcombank",
    "BID": "BIDV",
    "CTG": "VietinBank",
    "MBB": "MB Bank",
    "TCB": "Techcombank",
}

class StockRecord(BaseModel):
    trade_date: date
    ticker:     str
    bank_name:  str
    open:       float
    high:       float
    low:        float
    close:      float
    volume:     int
    pct_change: float

    @field_validator("close", "open", "high", "low")
    @classmethod
    def positive_price(cls, v):
        if v <= 0:
            raise ValueError("Price must be positive")
        return round(v, 2)

    @field_validator("volume")
    @classmethod
    def positive_volume(cls, v):
        if v < 0:
            raise ValueError("Volume must be non-negative")
        return v

class MarketExtractor(BaseExtractor):
    source_name = "vn_stocks"
    schema      = StockRecord

    def extract(self, run_date: date) -> pd.DataFrame:
        start   = (run_date - timedelta(days=365)).strftime("%Y-%m-%d")
        end     = run_date.strftime("%Y-%m-%d")
        records = []

        for ticker, bank_name in VN_BANK_TICKERS.items():
            try:
                stock = Vnstock().stock(symbol=ticker, source="VCI")
                hist  = stock.quote.history(start=start, end=end, interval="1D")

                # vnstock3 trả về DataFrame với cột: time, open, high, low, close, volume
                for _, row in hist.iterrows():
                    records.append({
                        "trade_date": pd.to_datetime(row["time"]).date(),
                        "ticker":     ticker,
                        "bank_name":  bank_name,
                        "open":       float(row["open"]),
                        "high":       float(row["high"]),
                        "low":        float(row["low"]),
                        "close":      float(row["close"]),
                        "volume":     int(row["volume"]),
                        "pct_change": round(
                            (float(row["close"]) - float(row["open"]))
                            / float(row["open"]) * 100, 3
                        ),
                    })
            except Exception as e:
                print(f"⚠️  {ticker}: {e}")

        return pd.DataFrame(records)
```

### 3.4 Financials Extractor — vnstock quarterly statements

Đây là phần quan trọng nhất — thay thế hoàn toàn synthetic generator. `vnstock3` lấy BCTC niêm yết công khai từ HoSE, bao gồm income statement, balance sheet, và financial ratios theo quý.

```python
# pipeline/extractors/financials.py
import pandas as pd
from datetime import date
from pydantic import BaseModel, field_validator
from vnstock3 import Vnstock
from .base import BaseExtractor

VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

class FinancialRecord(BaseModel):
    ticker:      str
    period:      str   # "2024-Q1", "2024-Q2", ...
    year:        int
    quarter:     int
    nim:         float | None   # Net Interest Margin (%)
    npl_ratio:   float | None   # Non-performing loan ratio (%)
    car:         float | None   # Capital Adequacy Ratio (%)
    casa_ratio:  float | None   # CASA ratio (%)
    roe:         float | None   # Return on Equity (%)
    roa:         float | None   # Return on Assets (%)

    @field_validator("npl_ratio")
    @classmethod
    def npl_range(cls, v):
        if v is not None and not (0 <= v <= 30):
            raise ValueError(f"NPL ratio {v} out of range [0,30]")
        return v

class FinancialsExtractor(BaseExtractor):
    source_name = "vn_financials"
    schema      = FinancialRecord

    def extract(self, run_date: date) -> pd.DataFrame:
        records = []

        for ticker in VN_BANK_TICKERS:
            try:
                stock  = Vnstock().stock(symbol=ticker, source="VCI")
                ratios = stock.finance.ratio(period="quarter", lang="en")

                # ratios có cột: yearReport, lengthReport (quý), NIM, NPLRatio, CAR, CASARatio, ROE, ROA
                for _, row in ratios.iterrows():
                    year    = int(row.get("yearReport",  0))
                    quarter = int(row.get("lengthReport", 0))
                    if year < 2018:
                        continue
                    records.append({
                        "ticker":    ticker,
                        "period":    f"{year}-Q{quarter}",
                        "year":      year,
                        "quarter":   quarter,
                        "nim":       self._safe_float(row.get("netInterestMargin")),
                        "npl_ratio": self._safe_float(row.get("badDebtPercentage")),
                        "car":       self._safe_float(row.get("capitalAdequacyRatio")),
                        "casa_ratio":self._safe_float(row.get("casaRatio")),
                        "roe":       self._safe_float(row.get("roe")),
                        "roa":       self._safe_float(row.get("roa")),
                    })
            except Exception as e:
                print(f"⚠️  {ticker} financials: {e}")

        return pd.DataFrame(records)

    @staticmethod
    def _safe_float(val) -> float | None:
        try:
            return float(val) if val is not None else None
        except (ValueError, TypeError):
            return None
```

### 3.5 World Bank Extractor

Giữ nguyên logic, thêm Pydantic schema:

```python
# pipeline/extractors/world_bank.py
import requests
import pandas as pd
from datetime import date
from pydantic import BaseModel
from .base import BaseExtractor

INDICATORS = {
    "FP.CPI.TOTL.ZG":   "inflation_pct",
    "FR.INR.LEND":       "lending_rate_pct",
    "NY.GDP.MKTP.KD.ZG": "gdp_growth_pct",
    "FS.AST.NPLL.GD.ZS": "npl_to_gdp_pct",
}

class MacroRecord(BaseModel):
    indicator_code: str
    indicator_name: str
    year:           int
    value:          float

class WorldBankExtractor(BaseExtractor):
    source_name = "world_bank"
    schema      = MacroRecord
    country     = "VN"

    def extract(self, run_date: date) -> pd.DataFrame:
        records = []
        for code, name in INDICATORS.items():
            url = (
                f"https://api.worldbank.org/v2/country/{self.country}"
                f"/indicator/{code}?format=json&per_page=10&mrv=8"
            )
            try:
                data = requests.get(url, timeout=10).json()
                for entry in (data[1] or []):
                    if entry["value"] is not None:
                        records.append({
                            "indicator_code": code,
                            "indicator_name": name,
                            "year":           int(entry["date"]),
                            "value":          float(entry["value"]),
                        })
            except Exception as e:
                print(f"⚠️  {code}: {e}")
        return pd.DataFrame(records)
```

### 3.6 Delta Lake writer

```python
# pipeline/delta_writer.py
from deltalake import write_deltalake, DeltaTable
from pathlib import Path
import pandas as pd
from datetime import datetime

BRONZE_DIR = Path("data/bronze")

def write_bronze(df: pd.DataFrame, source_name: str) -> str:
    """
    Ghi DataFrame vào Bronze layer dạng Delta table.
    - mode=append: không bao giờ overwrite, chỉ append
    - schema_mode=merge: tự động merge schema khi source thêm cột mới
    - partition_by: Hive-style partitioning
    """
    if df.empty:
        print(f"⚠️  {source_name}: empty DataFrame — skip write")
        return ""

    path = str(BRONZE_DIR / source_name)

    # Inject metadata columns
    df = df.copy()
    df["_ingested_at"]  = datetime.utcnow().isoformat()
    df["_source"]       = source_name

    write_deltalake(
        path,
        df,
        mode="append",
        schema_mode="merge",      # xử lý schema drift tự động
    )

    dt      = DeltaTable(path)
    version = dt.version()
    print(f"✅ Bronze [{source_name}] v{version} — {len(df)} rows appended")
    return path

def read_bronze(source_name: str, version: int = None) -> pd.DataFrame:
    """
    Đọc Bronze table. version=None → latest. version=N → time travel.
    """
    path = str(BRONZE_DIR / source_name)
    dt   = DeltaTable(path)

    if version is not None:
        dt = dt.load_as_version(version)   # time travel — debug khi data sai

    return dt.to_pandas()

def bronze_history(source_name: str) -> list:
    """Xem toàn bộ transaction log — ai viết gì, lúc nào."""
    dt = DeltaTable(str(BRONZE_DIR / source_name))
    return dt.history()
```

**Tại sao Delta Lake thay vì Parquet thô:**

| Feature | Parquet thuần | Delta Lake |
|---|---|---|
| ACID transaction | ✗ | ✓ |
| Rollback khi fail | ✗ | ✓ — `restore_version()` |
| Schema evolution | ✗ crash | ✓ — `schema_mode=merge` |
| Time travel | ✗ | ✓ — `load_as_version(N)` |
| Audit log | ✗ | ✓ — `_delta_log/` |
| DuckDB đọc thẳng | ✓ | ✓ — via `delta` extension |

---

## 4. Silver Layer

### 4.1 Tại sao dbt

`dbt` (data build tool) là standard của analytics engineering. Mọi DE role thực tế đều hỏi về nó vì nó giải quyết đúng bài toán transform:

- **SQL-based**: dễ review, dễ audit, không bị lock vào Python runtime
- **`ref()` function**: dependency graph tự động giữa các model
- **Testing built-in**: `not_null`, `unique`, `accepted_values` khai báo trong YAML
- **`dbt docs serve`**: mở browser thấy lineage DAG visual — đây là lineage thực sự
- **Compiled SQL**: bạn biết chính xác query nào chạy xuống DuckDB

### 4.2 dbt project setup

```bash
pip install dbt-duckdb
dbt init finsight
```

```yaml
# dbt_project/profiles.yml
finsight:
  target: dev
  outputs:
    dev:
      type:     duckdb
      path:     "../data/finsight.duckdb"
      threads:  4
```

```yaml
# dbt_project/dbt_project.yml
name: finsight
version: "1.0.0"
profile: finsight

model-paths: ["models"]
test-paths:  ["tests"]

models:
  finsight:
    staging:
      +materialized: view       # Silver là views — lazy evaluation
    marts:
      +materialized: table      # Gold là tables — pre-computed
```

```yaml
# dbt_project/models/sources.yml
# Khai báo Bronze tables — dbt đọc từ DuckDB views trỏ vào Delta
version: 2
sources:
  - name: bronze
    schema: main
    description: "Delta Lake tables exposed via DuckDB delta extension"
    tables:
      - name: vn_stocks
        description: "Daily OHLCV từ vnstock — VCB BID CTG MBB TCB"
      - name: vn_financials
        description: "Quarterly financial ratios từ vnstock — NIM NPL CAR CASA"
      - name: world_bank
        description: "Annual macro indicators từ World Bank API"
```

### 4.3 Staging models (Silver)

```sql
-- dbt_project/models/staging/stg_stocks.sql

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
```

```sql
-- dbt_project/models/staging/stg_financials.sql

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
```

```sql
-- dbt_project/models/staging/stg_macro.sql

WITH source AS (
    SELECT * FROM {{ source('bronze', 'world_bank') }}
),

-- Pivot từ long format (indicator_name, value) sang wide format (1 row per year)
pivoted AS (
    PIVOT source
    ON indicator_name
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
```

### 4.4 dbt tests

```yaml
# dbt_project/models/staging/stg_stocks.yml
version: 2
models:
  - name: stg_stocks
    description: "Cleaned daily stock prices — VN banks"
    columns:
      - name: trade_date
        tests: [not_null]
      - name: ticker
        tests:
          - not_null
          - accepted_values:
              values: ["VCB", "BID", "CTG", "MBB", "TCB"]
      - name: close_price
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: "> 0"
      - name: volume
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= 0"
```

```yaml
# dbt_project/models/staging/stg_financials.yml
version: 2
models:
  - name: stg_financials
    columns:
      - name: ticker
        tests: [not_null]
      - name: period
        tests: [not_null, unique]
      - name: npl_ratio_pct
        tests:
          - dbt_utils.expression_is_true:
              expression: "IS NULL OR (>= 0 AND <= 30)"
              # NPL ratio > 30% là bất thường — flag ngay
```

```sql
-- dbt_project/tests/assert_npl_range.sql
-- Custom test: NPL phải trong khoảng hợp lý
SELECT ticker, period, npl_ratio_pct
FROM {{ ref('stg_financials') }}
WHERE npl_ratio_pct > 30
```

Chạy:

```bash
dbt run          # build toàn bộ Silver models
dbt test         # chạy tất cả tests
dbt docs generate && dbt docs serve  # mở lineage DAG tại localhost:8080
```

### 4.5 Great Expectations checkpoint

Great Expectations chạy như tầng thứ hai — nặng hơn dbt tests nhưng có khả năng track quality theo thời gian và sinh HTML report.

```python
# pipeline/gx_checkpoints.py
import great_expectations as gx
import great_expectations.expectations as gxe

def setup_gx_context():
    context = gx.get_context(mode="file")

    # Data source trỏ vào DuckDB (Silver views)
    ds = context.data_sources.add_or_update_duckdb(
        name="duckdb_silver",
        database_path="data/finsight.duckdb",
    )
    ds.add_table_asset(name="stg_stocks",     table_name="stg_stocks")
    ds.add_table_asset(name="stg_financials", table_name="stg_financials")
    return context

def run_silver_checkpoint():
    context = setup_gx_context()

    # Expectation suite cho stg_stocks
    suite = context.suites.add_or_update(
        gx.ExpectationSuite(name="stg_stocks.critical")
    )
    suite.add_expectation(gxe.ExpectColumnValuesToNotBeNull(column="trade_date"))
    suite.add_expectation(gxe.ExpectColumnValuesToBeInSet(
        column="ticker", value_set=["VCB", "BID", "CTG", "MBB", "TCB"]
    ))
    suite.add_expectation(gxe.ExpectColumnValuesToBeBetween(
        column="pct_change", min_value=-15.0, max_value=15.0
        # circuit breaker: VN market có giới hạn ±7% nhưng để margin
    ))
    suite.add_expectation(gxe.ExpectTableRowCountToBeBetween(
        min_value=100, max_value=5000
    ))

    # Expectation suite cho stg_financials
    suite_fin = context.suites.add_or_update(
        gx.ExpectationSuite(name="stg_financials.critical")
    )
    suite_fin.add_expectation(gxe.ExpectColumnValuesToBeBetween(
        column="npl_ratio_pct", min_value=0, max_value=15
        # > 15% là ngưỡng nguy hiểm theo SBV
    ))
    suite_fin.add_expectation(gxe.ExpectColumnValuesToBeBetween(
        column="car_pct", min_value=8, max_value=50
        # Basel III minimum: 8%
    ))

    # Chạy checkpoint
    result = context.checkpoints.add_or_update(
        gx.Checkpoint(
            name="pre_gold_checkpoint",
            validation_definitions=[
                gx.ValidationDefinition(
                    name="stocks_critical",
                    data=context.data_sources.get("duckdb_silver")
                                .get_asset("stg_stocks")
                                .add_batch_definition_whole_table("whole"),
                    suite=suite,
                ),
            ],
        )
    ).run()

    # Sinh HTML Data Docs
    context.build_data_docs()
    return result.success
```

---

## 5. Gold Layer

### 5.1 Mart models

```sql
-- dbt_project/models/marts/mart_bank_perf.sql
-- Kết hợp stock price + financial ratios — 1 row per (ticker, date)

WITH stock AS (
    SELECT * FROM {{ ref('stg_stocks') }}
),

fin AS (
    SELECT * FROM {{ ref('stg_financials') }}
),

-- Join: mỗi trading day lấy ratio của quý gần nhất
stock_with_quarter AS (
    SELECT
        s.*,
        YEAR(s.trade_date)                          AS year,
        QUARTER(s.trade_date)                       AS quarter,
        YEAR(s.trade_date) * 10 + QUARTER(s.trade_date) AS year_quarter_key
    FROM stock s
),

joined AS (
    SELECT
        s.trade_date,
        s.ticker,
        s.bank_name,
        s.close_price,
        s.volume,
        s.pct_change,
        f.nim_pct,
        f.npl_ratio_pct,
        f.car_pct,
        f.casa_ratio_pct,
        f.roe_pct,
        f.roa_pct,
        -- Flag theo Basel III và SBV thresholds
        CASE WHEN f.npl_ratio_pct > 3  THEN 'warning'
             WHEN f.npl_ratio_pct > 5  THEN 'critical'
             ELSE 'healthy' END                     AS npl_status,
        CASE WHEN f.car_pct < 8 THEN 'below_minimum' ELSE 'adequate' END AS car_status,
        CASE WHEN f.casa_ratio_pct > 40 THEN 'strong'
             WHEN f.casa_ratio_pct > 25 THEN 'moderate'
             ELSE 'weak' END                        AS casa_status
    FROM stock_with_quarter s
    LEFT JOIN fin f
        ON s.ticker = f.ticker
        AND s.year  = f.report_year
        AND s.quarter = f.report_quarter
)

SELECT * FROM joined ORDER BY trade_date DESC, ticker
```

```sql
-- dbt_project/models/marts/mart_macro.sql
-- Cross macro với bank performance — context cho analyst

WITH macro AS (
    SELECT * FROM {{ ref('stg_macro') }}
),

perf AS (
    SELECT
        ticker,
        YEAR(trade_date)                AS year,
        AVG(close_price)                AS avg_price,
        AVG(npl_ratio_pct)              AS avg_npl,
        AVG(nim_pct)                    AS avg_nim
    FROM {{ ref('mart_bank_perf') }}
    GROUP BY ticker, YEAR(trade_date)
)

SELECT
    p.year,
    p.ticker,
    p.avg_price,
    p.avg_npl,
    p.avg_nim,
    m.inflation_pct,
    m.lending_rate_pct,
    m.gdp_growth_pct,
    m.npl_to_gdp_pct,
    -- Derived: NIM spread vs lending rate
    ROUND(p.avg_nim - m.lending_rate_pct, 2) AS nim_spread
FROM perf p
LEFT JOIN macro m ON p.year = m.report_year
ORDER BY p.year DESC, p.ticker
```

```sql
-- dbt_project/models/marts/mart_anomaly_input.sql
-- Chuẩn bị data cho anomaly detection agent — z-score pre-computed

WITH daily AS (
    SELECT
        trade_date,
        ticker,
        close_price,
        volume,
        pct_change
    FROM {{ ref('mart_bank_perf') }}
),

with_stats AS (
    SELECT
        *,
        AVG(close_price) OVER w30 AS ma_30d,
        STDDEV(close_price) OVER w30 AS std_30d,
        AVG(volume) OVER w30        AS avg_vol_30d
    FROM daily
    WINDOW w30 AS (
        PARTITION BY ticker
        ORDER BY trade_date
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    )
)

SELECT
    trade_date,
    ticker,
    close_price,
    volume,
    pct_change,
    ma_30d,
    std_30d,
    ROUND((close_price - ma_30d) / NULLIF(std_30d, 0), 3) AS z_score,
    CASE
        WHEN ABS((close_price - ma_30d) / NULLIF(std_30d, 0)) > 2.5 THEN TRUE
        ELSE FALSE
    END AS is_anomaly
FROM with_stats
ORDER BY trade_date DESC, ticker
```

### 5.2 DuckDB + Delta extension

```python
# backend/db/warehouse.py
import duckdb
from pathlib import Path

DB_PATH    = "data/finsight.duckdb"
BRONZE_DIR = Path("data/bronze")

def get_connection() -> duckdb.DuckDBPyConnection:
    return duckdb.connect(DB_PATH)

def init_warehouse():
    """
    Tạo DuckDB views trỏ thẳng vào Delta tables ở Bronze.
    dbt sẽ dùng các views này làm sources khi chạy models.
    """
    con = get_connection()

    # Load Delta extension — không cần copy data
    con.execute("INSTALL delta; LOAD delta;")

    # Bronze views — dbt sources trỏ vào đây
    con.execute(f"""
        CREATE OR REPLACE VIEW vn_stocks AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/vn_stocks')
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW vn_financials AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/vn_financials')
    """)
    con.execute(f"""
        CREATE OR REPLACE VIEW world_bank AS
        SELECT * FROM delta_scan('{BRONZE_DIR}/world_bank')
    """)

    con.close()
    print("✅ DuckDB warehouse initialized — Bronze views ready for dbt")
```

### 5.3 Semantic layer

AI agent cần context để hiểu domain. Semantic layer cập nhật theo Gold schema thực:

```json
// backend/semantic/schema.json
{
  "tables": {
    "mart_bank_perf": {
      "description": "Daily bank performance — stock price kết hợp với quarterly financial ratios thực từ BCTC niêm yết",
      "columns": {
        "trade_date":      { "type": "DATE" },
        "ticker":          { "type": "VARCHAR", "values": ["VCB", "BID", "CTG", "MBB", "TCB"] },
        "bank_name":       { "type": "VARCHAR" },
        "close_price":     { "type": "DOUBLE", "description": "Giá đóng cửa (VND)" },
        "volume":          { "type": "BIGINT" },
        "pct_change":      { "type": "DOUBLE", "description": "% thay đổi so với mở cửa" },
        "nim_pct":         { "type": "DOUBLE", "description": "Net Interest Margin (%). NIM cao = hiệu quả lending tốt" },
        "npl_ratio_pct":   { "type": "DOUBLE", "description": "Non-performing loan ratio (%). > 3% là đáng lo, > 5% là critical theo SBV" },
        "car_pct":         { "type": "DOUBLE", "description": "Capital Adequacy Ratio (%). Basel III minimum: 8%" },
        "casa_ratio_pct":  { "type": "DOUBLE", "description": "CASA ratio (%). Cao hơn = funding cost rẻ hơn" },
        "roe_pct":         { "type": "DOUBLE" },
        "roa_pct":         { "type": "DOUBLE" },
        "npl_status":      { "type": "VARCHAR", "values": ["healthy", "warning", "critical"] },
        "car_status":      { "type": "VARCHAR", "values": ["adequate", "below_minimum"] }
      }
    },
    "mart_macro": {
      "description": "Macro indicators (World Bank real data) cross với bank performance theo năm",
      "columns": {
        "year":              { "type": "INTEGER" },
        "ticker":            { "type": "VARCHAR" },
        "avg_nim":           { "type": "DOUBLE" },
        "avg_npl":           { "type": "DOUBLE" },
        "inflation_pct":     { "type": "DOUBLE" },
        "lending_rate_pct":  { "type": "DOUBLE" },
        "gdp_growth_pct":    { "type": "DOUBLE" },
        "nim_spread":        { "type": "DOUBLE", "description": "NIM - lending_rate: spread dương = bank profitable trên base rate" }
      }
    },
    "mart_anomaly_input": {
      "description": "Pre-computed z-score cho anomaly detection agent",
      "columns": {
        "trade_date":  { "type": "DATE" },
        "ticker":      { "type": "VARCHAR" },
        "close_price": { "type": "DOUBLE" },
        "z_score":     { "type": "DOUBLE", "description": "Z-score vs 30-day rolling window. |z| > 2.5 = anomaly" },
        "is_anomaly":  { "type": "BOOLEAN" }
      }
    }
  },
  "business_metrics": {
    "npl":        { "description": "Non-performing loan ratio", "table": "mart_bank_perf", "column": "npl_ratio_pct" },
    "nim":        { "description": "Net Interest Margin",       "table": "mart_bank_perf", "column": "nim_pct" },
    "car":        { "description": "Capital Adequacy Ratio",    "table": "mart_bank_perf", "column": "car_pct" },
    "casa":       { "description": "CASA Ratio",                "table": "mart_bank_perf", "column": "casa_ratio_pct" }
  },
  "thresholds": {
    "npl_warning":  3.0,
    "npl_critical": 5.0,
    "car_minimum":  8.0,
    "z_score_alert": 2.5
  }
}
```

---

## 6. Orchestration

### 6.1 Tại sao Dagster

| Tiêu chí | Prefect | Dagster |
|---|---|---|
| Mental model | Task graph | **Asset graph** |
| Lineage | Không có | Built-in — thấy ngay trong UI |
| Data awareness | Không | Freshness check, materialization status |
| dbt integration | Manual | Native `dagster-dbt` library |
| Backfill | Có | Có + partition-aware |
| Câu hỏi phỏng vấn | Ít hỏi hơn | Ngày càng phổ biến ở data-first company |

Prefect nghĩ theo "function nào chạy trước." Dagster nghĩ theo "data asset nào depend vào data asset nào" — đây là mental model đúng cho DE.

### 6.2 Asset definitions

```python
# orchestration/assets/bronze_assets.py
from dagster import asset, OpExecutionContext, DailyPartitionsDefinition
from datetime import date
from pipeline.extractors.market     import MarketExtractor
from pipeline.extractors.financials import FinancialsExtractor
from pipeline.extractors.world_bank import WorldBankExtractor
from pipeline.delta_writer          import write_bronze

daily_partitions = DailyPartitionsDefinition(start_date="2022-01-01")

@asset(
    group_name="bronze",
    partitions_def=daily_partitions,
    description="Daily stock OHLCV cho VCB BID CTG MBB TCB từ vnstock",
)
def bronze_vn_stocks(context: OpExecutionContext) -> None:
    run_date = date.fromisoformat(context.partition_key)
    df       = MarketExtractor().run(run_date)
    write_bronze(df, "vn_stocks")
    context.log.info(f"Bronze stocks: {len(df)} rows for {run_date}")
    context.add_output_metadata({"rows": len(df), "run_date": str(run_date)})

@asset(
    group_name="bronze",
    description="Quarterly financial ratios từ vnstock — NIM NPL CAR CASA",
)
def bronze_vn_financials(context: OpExecutionContext) -> None:
    # Financials là quarterly — chạy bất cứ lúc nào, extractor tự filter
    df = FinancialsExtractor().run(date.today())
    write_bronze(df, "vn_financials")
    context.log.info(f"Bronze financials: {len(df)} rows")
    context.add_output_metadata({"rows": len(df)})

@asset(
    group_name="bronze",
    description="Annual macro indicators từ World Bank API",
)
def bronze_world_bank(context: OpExecutionContext) -> None:
    df = WorldBankExtractor().run(date.today())
    write_bronze(df, "world_bank")
    context.log.info(f"Bronze macro: {len(df)} rows")
```

```python
# orchestration/assets/silver_assets.py
import subprocess
from dagster import asset, AssetExecutionContext
from .bronze_assets import bronze_vn_stocks, bronze_vn_financials, bronze_world_bank
from pipeline.gx_checkpoints import run_silver_checkpoint

@asset(
    group_name="silver",
    deps=[bronze_vn_stocks, bronze_vn_financials, bronze_world_bank],
    description="dbt staging models — clean + type + dedup",
)
def silver_staging(context: AssetExecutionContext) -> None:
    result = subprocess.run(
        ["dbt", "run", "--select", "staging"],
        capture_output=True, text=True, cwd="dbt_project"
    )
    if result.returncode != 0:
        raise RuntimeError(f"dbt run failed:\n{result.stderr}")
    context.log.info(result.stdout)

@asset(
    group_name="silver",
    deps=[silver_staging],
    description="dbt tests + Great Expectations checkpoint",
)
def silver_quality_check(context: AssetExecutionContext) -> None:
    # dbt tests
    test_result = subprocess.run(
        ["dbt", "test", "--select", "staging"],
        capture_output=True, text=True, cwd="dbt_project"
    )
    if test_result.returncode != 0:
        raise RuntimeError(f"dbt tests failed:\n{test_result.stderr}")

    # Great Expectations checkpoint
    gx_passed = run_silver_checkpoint()
    if not gx_passed:
        raise RuntimeError("Great Expectations checkpoint failed — Gold refresh aborted")

    context.log.info("✅ Silver quality checks passed")
```

```python
# orchestration/assets/gold_assets.py
import subprocess
from dagster import asset, AssetExecutionContext
from .silver_assets import silver_quality_check

@asset(
    group_name="gold",
    deps=[silver_quality_check],
    description="dbt mart models — mart_bank_perf mart_macro mart_anomaly_input",
)
def gold_marts(context: AssetExecutionContext) -> None:
    result = subprocess.run(
        ["dbt", "run", "--select", "marts"],
        capture_output=True, text=True, cwd="dbt_project"
    )
    if result.returncode != 0:
        raise RuntimeError(f"dbt marts failed:\n{result.stderr}")
    context.log.info(result.stdout)
    context.log.info("✅ Gold marts refreshed — AI agent ready")
```

### 6.3 Schedule & Dagster definitions

```python
# orchestration/schedules.py
from dagster import ScheduleDefinition
from .jobs import daily_pipeline_job

daily_schedule = ScheduleDefinition(
    job=daily_pipeline_job,
    cron_schedule="0 18 * * 1-5",   # 18:00 mỗi ngày trading (sau khi sàn đóng cửa)
)
```

```python
# orchestration/definitions.py
from dagster import Definitions, load_assets_from_modules
from . import assets
from .schedules import daily_schedule

all_assets = load_assets_from_modules([assets])

defs = Definitions(
    assets=all_assets,
    schedules=[daily_schedule],
)
```

Chạy Dagster UI:

```bash
dagster dev -f orchestration/definitions.py   # localhost:3000
```

Trong UI bạn thấy ngay: asset graph (lineage), materialization history, freshness status của từng layer.

---

## 7. Agent Pipeline

### 7.1 NL → SQL Agent

Cập nhật để query Gold marts thay vì synthetic transactions:

```python
# backend/agents/nl_to_sql.py
from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from backend.semantic.loader import get_schema_context
from backend.db.query import run_query, validate_sql
import re

llm = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)

SQL_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a SQL expert for a Vietnamese banking analytics system.
Generate DuckDB-compatible SQL only. No markdown, no explanation.
Use ONLY the tables and columns described in the schema below.

{schema}

Key rules:
- All data is REAL — from HOSE/HNX filings and World Bank API
- For bank KPIs (NPL NIM CAR CASA): query mart_bank_perf
- For macro cross-analysis: query mart_macro
- For anomaly queries: query mart_anomaly_input (z_score pre-computed)
- Always LIMIT results (max 500 rows)
- VN market operates Monday–Friday; filter weekends if querying by date
"""),
    ("human", "{question}")
])

def execute_nl_query(question: str) -> dict:
    schema = get_schema_context()
    chain  = SQL_PROMPT | llm

    for attempt in range(3):
        response = chain.invoke({"question": question, "schema": schema})
        sql = re.sub(r"```sql|```", "", response.content).strip()

        is_valid, error = validate_sql(sql)
        if is_valid:
            try:
                df = run_query(sql)
                return {
                    "sql":      sql,
                    "data":     df.to_dict(orient="records"),
                    "columns":  df.columns.tolist(),
                    "rows":     len(df),
                    "attempts": attempt + 1,
                }
            except Exception as e:
                return {"error": str(e), "sql": sql}

        question = f"{question}\n\nSQL error: {error}. Fix it."

    return {"error": "Failed after 3 attempts", "sql": None}
```

### 7.2 ML Anomaly Detection — Isolation Forest + LSTM Autoencoder

Hệ thống dùng **ba tầng** phát hiện bất thường, bổ sung cho nhau:

| Tầng | Method | Khi nào chạy | Điểm mạnh |
|---|---|---|---|
| **Fast path** | Z-score (dbt SQL) | Real-time query | Sub-ms, không cần model |
| **Deep path** | Isolation Forest | Batch nightly | Multivariate, complex pattern |
| **Sequential** | LSTM Autoencoder | Batch weekly | Time-series regime change |

**Ensemble rule: flag anomaly khi ≥ 2/3 signals đồng ý** → giảm false positive đáng kể.

#### Feature Engineering

```python
# ml/feature_store.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from backend.db.query import run_query

ANOMALY_FEATURES = [
    "close_price", "volume", "pct_change",
    "ma_30d", "std_30d",
    "nim_pct", "npl_ratio_pct", "car_pct", "roe_pct",
]

def build_anomaly_features(days: int = 365) -> pd.DataFrame:
    """
    Lấy feature matrix từ Gold marts — kết hợp price + financial ratios.
    Forward-fill quarterly ratios (chỉ update 4 lần/năm).
    """
    df = run_query(f"""
        SELECT
            bp.trade_date, bp.ticker, bp.close_price, bp.volume, bp.pct_change,
            ai.ma_30d, ai.std_30d,
            bp.nim_pct, bp.npl_ratio_pct, bp.car_pct, bp.roe_pct
        FROM mart_bank_perf bp
        LEFT JOIN mart_anomaly_input ai USING (trade_date, ticker)
        WHERE bp.trade_date >= CURRENT_DATE - INTERVAL '{days} days'
        ORDER BY ticker, trade_date
    """)

    # Forward-fill quarterly ratios
    df = df.sort_values(["ticker", "trade_date"])
    for col in ["nim_pct", "npl_ratio_pct", "car_pct", "roe_pct"]:
        df[col] = df.groupby("ticker")[col].transform(lambda x: x.ffill())

    return df.reset_index(drop=True)
```

#### Isolation Forest Trainer

```python
# ml/anomaly/isolation_forest.py
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from ml.feature_store import build_anomaly_features, ANOMALY_FEATURES

MODEL_DIR = Path("ml/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

def train_isolation_forest(contamination: float = 0.05) -> dict:
    """
    Train Isolation Forest — 1 model per ticker, 2 năm data.
    contamination=0.05 → kỳ vọng ~5% điểm là anomaly.
    """
    df = build_anomaly_features(days=730)
    results = {}

    for ticker in df["ticker"].unique():
        group = df[df["ticker"] == ticker].copy()
        X = group[ANOMALY_FEATURES].dropna()
        if len(X) < 30:
            continue

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = IsolationForest(
            n_estimators=200,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_scaled)

        artifact = {"model": model, "scaler": scaler, "features": ANOMALY_FEATURES}
        joblib.dump(artifact, MODEL_DIR / f"isolation_forest_{ticker}.pkl")

        preds     = model.predict(X_scaled)
        n_anomaly = (preds == -1).sum()
        results[ticker] = {
            "n_train":      len(X),
            "n_anomaly":    int(n_anomaly),
            "anomaly_rate": round(n_anomaly / len(X) * 100, 2),
        }
        print(f"✅ {ticker}: {n_anomaly}/{len(X)} anomalies ({results[ticker]['anomaly_rate']}%)")

    return results


def predict_anomalies_if(days: int = 90) -> pd.DataFrame:
    """Dùng trained IF để score data mới. Trả về DataFrame với anomaly_score_if."""
    df = build_anomaly_features(days=days)
    all_preds = []

    for ticker in df["ticker"].unique():
        model_path = MODEL_DIR / f"isolation_forest_{ticker}.pkl"
        if not model_path.exists():
            continue

        artifact = joblib.load(model_path)
        model, scaler, features = artifact["model"], artifact["scaler"], artifact["features"]

        group = df[df["ticker"] == ticker].copy()
        X = group[features].dropna()
        if X.empty:
            continue

        X_scaled = scaler.transform(X)
        scores   = model.score_samples(X_scaled)   # thấp hơn = bất thường hơn
        preds    = model.predict(X_scaled)           # -1 = anomaly, 1 = normal

        group.loc[X.index, "anomaly_score_if"] = scores
        group.loc[X.index, "is_anomaly_if"]    = (preds == -1)
        all_preds.append(group)

    if not all_preds:
        return pd.DataFrame()
    return pd.concat(all_preds)[["trade_date", "ticker", "anomaly_score_if", "is_anomaly_if"]].dropna()
```

#### LSTM Autoencoder

```python
# ml/anomaly/lstm_autoencoder.py
"""
LSTM Autoencoder: học pattern "bình thường", flag reconstruction error cao là anomaly.
Dùng PyTorch — CPU đủ cho dataset này.
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from pathlib import Path
from ml.feature_store import build_anomaly_features, ANOMALY_FEATURES
from sklearn.preprocessing import StandardScaler

MODEL_DIR  = Path("ml/models")
SEQ_LEN    = 20  # 20 ngày giao dịch ≈ 1 tháng
N_FEATURES = len(ANOMALY_FEATURES)


class LSTMAutoencoder(nn.Module):
    def __init__(self, n_features: int, hidden_dim: int = 64, n_layers: int = 2):
        super().__init__()
        self.encoder = nn.LSTM(n_features, hidden_dim, n_layers,
                               batch_first=True, dropout=0.2)
        self.decoder = nn.LSTM(hidden_dim, hidden_dim, n_layers,
                               batch_first=True, dropout=0.2)
        self.output_layer = nn.Linear(hidden_dim, n_features)

    def forward(self, x):
        _, (hidden, cell) = self.encoder(x)
        # Repeat bottleneck cho mỗi time step
        decoder_input = hidden[-1].unsqueeze(1).repeat(1, x.size(1), 1)
        decoded, _    = self.decoder(decoder_input)
        return self.output_layer(decoded)


def make_sequences(X: np.ndarray, seq_len: int) -> np.ndarray:
    return np.array([X[i:i+seq_len] for i in range(len(X) - seq_len)])


def train_lstm_autoencoder(ticker: str, epochs: int = 50) -> dict:
    """Train LSTM AE cho 1 ticker. Threshold = mean + 3*std reconstruction error."""
    df = build_anomaly_features(days=730)
    group = df[df["ticker"] == ticker][ANOMALY_FEATURES].dropna()
    if len(group) < SEQ_LEN + 30:
        return {"error": f"Not enough data for {ticker}"}

    scaler = StandardScaler()
    X      = scaler.fit_transform(group.values)
    seqs   = make_sequences(X, SEQ_LEN)

    n_train = int(len(seqs) * 0.8)
    X_train = torch.FloatTensor(seqs[:n_train])
    X_val   = torch.FloatTensor(seqs[n_train:])

    model     = LSTMAutoencoder(N_FEATURES)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        loss = criterion(model(X_train), X_train)
        loss.backward()
        optimizer.step()

        if (epoch + 1) % 10 == 0:
            model.eval()
            with torch.no_grad():
                val_loss = criterion(model(X_val), X_val).item()
            print(f"  Epoch {epoch+1}/{epochs} — train: {loss.item():.6f}, val: {val_loss:.6f}")

    # Threshold = mean + 3*std trên training set
    model.eval()
    with torch.no_grad():
        recon_errors = ((model(X_train) - X_train) ** 2).mean(dim=[1, 2]).numpy()
    threshold = recon_errors.mean() + 3 * recon_errors.std()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_state": model.state_dict(),
        "scaler":      scaler,
        "threshold":   float(threshold),
        "seq_len":     SEQ_LEN,
        "n_features":  N_FEATURES,
        "features":    ANOMALY_FEATURES,
    }, MODEL_DIR / f"lstm_ae_{ticker}.pt")

    return {
        "ticker":    ticker,
        "threshold": round(float(threshold), 6),
        "n_seqs":    len(seqs),
    }


def predict_anomalies_lstm(ticker: str, days: int = 90) -> pd.DataFrame:
    """Score sequences bằng reconstruction error. is_anomaly_lstm nếu > threshold."""
    ckpt_path = MODEL_DIR / f"lstm_ae_{ticker}.pt"
    if not ckpt_path.exists():
        return pd.DataFrame()

    ckpt      = torch.load(ckpt_path, weights_only=False)
    threshold = ckpt["threshold"]
    seq_len   = ckpt["seq_len"]
    features  = ckpt["features"]

    model = LSTMAutoencoder(ckpt["n_features"])
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    df    = build_anomaly_features(days=days + seq_len)
    group = df[df["ticker"] == ticker][features].dropna()
    if len(group) < seq_len:
        return pd.DataFrame()

    X    = ckpt["scaler"].transform(group.values)
    seqs = make_sequences(X, seq_len)

    with torch.no_grad():
        recon_errors = ((model(torch.FloatTensor(seqs)) -
                         torch.FloatTensor(seqs)) ** 2).mean(dim=[1, 2]).numpy()

    # Mỗi error tương ứng với ngày cuối của sequence
    trade_dates = df[df["ticker"] == ticker]["trade_date"].iloc[seq_len:].values
    result = pd.DataFrame({
        "trade_date":      trade_dates[:len(recon_errors)],
        "ticker":          ticker,
        "recon_error":     recon_errors,
        "threshold":       threshold,
        "is_anomaly_lstm": recon_errors > threshold,
    })
    return result
```

#### Ensemble Anomaly Agent — kết hợp 3 signals

```python
# backend/agents/anomaly_agent.py
from backend.db.query import run_query
from ml.anomaly.isolation_forest import predict_anomalies_if
from ml.anomaly.lstm_autoencoder  import predict_anomalies_lstm
import pandas as pd

VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

def run_anomaly_detection(
    threshold: float = 2.5,
    days: int = 90,
    method: str = "ensemble",   # "zscore" | "isolation_forest" | "lstm" | "ensemble"
) -> list:
    """
    Ensemble 3 signals: z-score (fast), Isolation Forest (multivariate), LSTM AE (sequential).
    Anomaly confirmed khi ≥ 2/3 signals đồng ý — giảm false positive.
    """
    # Signal 1: Z-score từ dbt (luôn available, real-time)
    df_zscore = run_query(f"""
        SELECT
            trade_date, ticker,
            close_price, z_score,
            ma_30d AS expected_price,
            ROUND((close_price - ma_30d) / NULLIF(ma_30d, 0) * 100, 1) AS pct_from_normal,
            CASE
                WHEN z_score >  {threshold} THEN 'spike'
                WHEN z_score < -{threshold} THEN 'drop'
            END AS direction
        FROM mart_anomaly_input
        JOIN mart_bank_perf USING (trade_date, ticker)
        WHERE trade_date >= CURRENT_DATE - INTERVAL '{days} days'
        ORDER BY trade_date DESC, ticker
    """)
    df_zscore["is_anomaly_zscore"] = df_zscore["z_score"].abs() > threshold

    if method == "zscore":
        df_out = df_zscore[df_zscore["is_anomaly_zscore"]]
    else:
        # Signal 2: Isolation Forest
        df_if = predict_anomalies_if(days=days)

        # Signal 3: LSTM Autoencoder (per ticker)
        lstm_parts = [predict_anomalies_lstm(ticker=t, days=days) for t in VN_BANK_TICKERS]
        df_lstm    = pd.concat([p for p in lstm_parts if not p.empty]) if lstm_parts else pd.DataFrame()

        # Merge signals
        df_merged = df_zscore.merge(
            df_if[["trade_date", "ticker", "anomaly_score_if", "is_anomaly_if"]],
            on=["trade_date", "ticker"], how="left"
        )
        if not df_lstm.empty:
            df_merged = df_merged.merge(
                df_lstm[["trade_date", "ticker", "recon_error", "is_anomaly_lstm"]],
                on=["trade_date", "ticker"], how="left"
            )
        else:
            df_merged["is_anomaly_lstm"] = False
            df_merged["recon_error"]     = 0.0

        # Ensemble: 2/3 votes
        df_merged["signal_count"] = (
            df_merged["is_anomaly_zscore"].fillna(False).astype(int) +
            df_merged["is_anomaly_if"].fillna(False).astype(int) +
            df_merged["is_anomaly_lstm"].fillna(False).astype(int)
        )
        df_out = df_merged[df_merged["signal_count"] >= 2].sort_values(
            "z_score", key=lambda x: x.abs(), ascending=False
        )

    return [
        {
            "date":             str(r["trade_date"]),
            "ticker":           r["ticker"],
            "price":            round(r["close_price"], 2),
            "expected":         round(r.get("expected_price", r["close_price"]), 2),
            "z_score":          round(r.get("z_score", 0), 2),
            "direction":        r.get("direction", "unknown"),
            "pct_from_normal":  r.get("pct_from_normal", 0),
            "anomaly_score_if": round(r.get("anomaly_score_if", 0), 4),
            "recon_error":      round(r.get("recon_error", 0), 6),
            "signal_count":     int(r.get("signal_count", 1)),
            "method":           method,
        }
        for _, r in df_out.head(50).iterrows()
    ]
```

#### Dagster ML Assets — schedule retrain

```python
# orchestration/assets/ml_assets.py
from dagster import asset, AssetExecutionContext, WeeklyPartitionsDefinition
from .gold_assets import gold_marts
from ml.anomaly.isolation_forest  import train_isolation_forest
from ml.anomaly.lstm_autoencoder  import train_lstm_autoencoder

VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

@asset(
    group_name="ml",
    deps=[gold_marts],
    description="Retrain Isolation Forest — nightly sau khi Gold refresh",
)
def ml_isolation_forest(context: AssetExecutionContext) -> None:
    results = train_isolation_forest(contamination=0.05)
    context.log.info(f"IF training done: {results}")
    context.add_output_metadata({
        "tickers_trained": list(results.keys()),
        "anomaly_rates":   {t: v["anomaly_rate"] for t, v in results.items()},
    })

@asset(
    group_name="ml",
    deps=[gold_marts],
    description="Retrain LSTM Autoencoder — weekly (training nặng hơn IF)",
)
def ml_lstm_autoencoder(context: AssetExecutionContext) -> None:
    results = {}
    for ticker in VN_BANK_TICKERS:
        context.log.info(f"Training LSTM AE for {ticker}...")
        results[ticker] = train_lstm_autoencoder(ticker=ticker, epochs=50)
    context.add_output_metadata({"results": str(results)})
```

**So sánh 3 phương pháp:**

| Tiêu chí | Z-score (dbt) | Isolation Forest | LSTM Autoencoder |
|---|---|---|---|
| Type | Statistical | ML — tree ensemble | ML — deep learning |
| Features | Univariate (price) | Multivariate (9 features) | Sequential 20 ngày |
| Training | Không cần | Nightly retrain | Weekly retrain |
| Interpretability | Cao — threshold rõ | Trung bình — feature importance | Thấp — reconstruction error |
| Latency | Sub-ms (SQL) | ~10ms (joblib) | ~50ms (PyTorch) |
| Best for | Dashboard nhanh | Complex pattern detection | Regime change |

### 7.3 Root Cause Analysis

```python
# backend/agents/rca_agent.py
from langchain_anthropic import ChatAnthropic
from backend.db.query import run_query
from .anomaly_agent import run_anomaly_detection
import json

llm = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)

def run_rca(question: str, anomalies: list = None) -> dict:
    if not anomalies:
        anomalies = run_anomaly_detection()
    if not anomalies:
        return {"summary": "No anomalies detected in the last 90 days."}

    # Lấy anomaly có z_score lớn nhất để phân tích
    worst = max(anomalies, key=lambda x: abs(x["z_score"]))
    ticker = worst["ticker"]
    d      = worst["date"]

    # Cross macro context tại thời điểm anomaly
    macro = run_query(f"""
        SELECT inflation_pct, lending_rate_pct, gdp_growth_pct
        FROM mart_macro
        WHERE ticker = '{ticker}' AND year = YEAR(DATE '{d}')
        LIMIT 1
    """)

    # So sánh với các ngân hàng khác cùng ngày
    sector_compare = run_query(f"""
        SELECT ticker, bank_name, close_price, pct_change, npl_ratio_pct
        FROM mart_bank_perf
        WHERE trade_date = DATE '{d}'
        ORDER BY pct_change ASC
    """)

    prompt = f"""Analyze this Vietnamese banking stock anomaly. Return JSON only.

Anomaly: {ticker} ({worst['bank_name']})
Date: {d}
Direction: {worst['direction']} | Z-score: {worst['z_score']} | {worst['pct_from_normal']}% from 30-day average

Macro context (same year): {macro.to_dict('records')}

Sector comparison on same day: {sector_compare.to_dict('records')}

Return JSON:
{{
  "primary_cause": "...",
  "is_sector_wide": true/false,
  "macro_correlation": "...",
  "top_contributors": ["..."],
  "recommended_actions": ["..."],
  "confidence": "high|medium|low"
}}"""

    response = llm.invoke(prompt)
    try:
        result = json.loads(response.content)
    except Exception:
        result = {"primary_cause": response.content}

    return {
        "anomaly":  worst,
        "macro":    macro.to_dict("records"),
        "sector":   sector_compare.to_dict("records"),
        **result,
    }
```

### 7.4 LangGraph Orchestrator

```python
# backend/agents/graph.py
from typing import TypedDict
from langgraph.graph import StateGraph, END
from .nl_to_sql     import execute_nl_query
from .anomaly_agent import run_anomaly_detection
from .rca_agent     import run_rca
from .narrator      import generate_narrative

class AgentState(TypedDict):
    question:  str
    intent:    str
    sql:       str | None
    data:      list | None
    anomalies: list | None
    rca:       dict | None
    narrative: str | None
    error:     str | None

def classify(state: AgentState) -> AgentState:
    q = state["question"].lower()
    if any(w in q for w in ["why", "tại sao", "cause", "drop", "giảm", "rca"]):
        intent = "rca"
    elif any(w in q for w in ["anomaly", "unusual", "spike", "bất thường", "outlier"]):
        intent = "anomaly"
    else:
        intent = "query"
    return {**state, "intent": intent}

builder = StateGraph(AgentState)
builder.add_node("classify",  classify)
builder.add_node("query",     lambda s: {**s, **execute_nl_query(s["question"])})
builder.add_node("anomaly",   lambda s: {**s, "anomalies": run_anomaly_detection()})
builder.add_node("rca",       lambda s: {**s, "rca": run_rca(s["question"])})
builder.add_node("narrative", lambda s: {**s, "narrative": generate_narrative(s)})

builder.set_entry_point("classify")
builder.add_conditional_edges("classify", lambda s: s["intent"],
    {"query": "query", "anomaly": "anomaly", "rca": "rca"})
for node in ["query", "anomaly", "rca"]:
    builder.add_edge(node, "narrative")
builder.add_edge("narrative", END)

graph = builder.compile()
```

Cập nhật `classify()` để nhận intent `forecast`:

```python
# backend/agents/graph.py — cập nhật classify() và graph
def classify(state: AgentState) -> AgentState:
    q = state["question"].lower()
    if any(w in q for w in ["forecast", "dự báo", "predict", "tương lai", "next quarter", "sắp tới"]):
        intent = "forecast"
    elif any(w in q for w in ["why", "tại sao", "cause", "drop", "giảm", "rca"]):
        intent = "rca"
    elif any(w in q for w in ["anomaly", "unusual", "spike", "bất thường", "outlier"]):
        intent = "anomaly"
    else:
        intent = "query"
    return {**state, "intent": intent}

# Thêm forecast node
builder.add_node("forecast", lambda s: {**s, "forecast": run_forecast(s["question"])})
builder.add_conditional_edges("classify", lambda s: s["intent"],
    {"query": "query", "anomaly": "anomaly", "rca": "rca", "forecast": "forecast"})
builder.add_edge("forecast", "narrative")
```

---

### 7.5 ML Forecasting — Prophet + LSTM Price Model

#### 7.5.1 Prophet — NPL & NIM Trend Forecasting

Prophet (Meta) phù hợp cho **quarterly financial metrics** vì:
- Handle seasonality tự động (Q1/Q4 banking cycle VN)
- Không cần stationarity như ARIMA — không phải ADF test + differencing
- Confidence interval 95% CI built-in — quan trọng cho risk reporting
- Interpretable decomposition: trend + seasonality + changepoints

```python
# ml/forecasting/prophet_forecaster.py
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from prophet import Prophet
from sklearn.metrics import mean_absolute_percentage_error
from backend.db.query import run_query

MODEL_DIR            = Path("ml/models/forecasting")
MODEL_DIR.mkdir(parents=True, exist_ok=True)
METRICS_TO_FORECAST  = ["nim_pct", "npl_ratio_pct", "roe_pct", "car_pct"]
VN_BANK_TICKERS      = ["VCB", "BID", "CTG", "MBB", "TCB"]


def load_quarterly_data() -> pd.DataFrame:
    """Lấy quarterly financial ratios từ Gold mart — aggregate theo quý."""
    return run_query("""
        SELECT
            ticker,
            DATE_TRUNC('quarter', trade_date) AS ds,
            AVG(nim_pct)        AS nim_pct,
            AVG(npl_ratio_pct)  AS npl_ratio_pct,
            AVG(roe_pct)        AS roe_pct,
            AVG(car_pct)        AS car_pct
        FROM mart_bank_perf
        WHERE nim_pct IS NOT NULL
        GROUP BY ticker, DATE_TRUNC('quarter', trade_date)
        ORDER BY ticker, ds
    """)


def train_prophet_models(periods_ahead: int = 4) -> dict:
    """
    Train 1 Prophet model per (ticker, metric).
    Horizon = 4 quarters tới (1 năm) — phù hợp cho annual planning.
    """
    df = load_quarterly_data()
    results = {}

    for ticker in VN_BANK_TICKERS:
        ticker_df = df[df["ticker"] == ticker].copy()
        results[ticker] = {}

        for metric in METRICS_TO_FORECAST:
            prophet_df = ticker_df[["ds", metric]].dropna().rename(columns={metric: "y"})
            prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])

            if len(prophet_df) < 8:   # Cần ít nhất 8 quarters
                results[ticker][metric] = {"error": "insufficient data"}
                continue

            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,   # Quarterly data
                daily_seasonality=False,
                seasonality_mode="multiplicative",
                interval_width=0.95,         # 95% CI
                changepoint_prior_scale=0.05,
            )
            model.add_seasonality(name="quarterly", period=91.25, fourier_order=3)
            model.fit(prophet_df)

            future   = model.make_future_dataframe(periods=periods_ahead, freq="Q")
            forecast  = model.predict(future)

            # Lưu model + forecast
            model_path = MODEL_DIR / f"prophet_{ticker}_{metric}.pkl"
            joblib.dump({"model": model, "forecast": forecast}, model_path)

            # In-sample MAPE
            y_true = prophet_df["y"].values
            y_pred = forecast["yhat"].iloc[:len(y_true)].values
            mape   = mean_absolute_percentage_error(y_true, y_pred) * 100

            results[ticker][metric] = {
                "mape_pct":     round(mape, 2),
                "n_quarters":   len(prophet_df),
                "next_forecast": {
                    "yhat":       round(float(forecast["yhat"].iloc[-1]), 4),
                    "yhat_lower": round(float(forecast["yhat_lower"].iloc[-1]), 4),
                    "yhat_upper": round(float(forecast["yhat_upper"].iloc[-1]), 4),
                },
            }
            print(f"✅ {ticker}/{metric}: MAPE={mape:.1f}%")

    return results


def get_forecast(ticker: str, metric: str) -> dict:
    """Lấy forecast từ trained model — dùng trong API và agent."""
    model_path = MODEL_DIR / f"prophet_{ticker}_{metric}.pkl"
    if not model_path.exists():
        return {"error": "Model not trained yet. Run train_prophet_models() first."}

    artifact = joblib.load(model_path)
    forecast  = artifact["forecast"]

    future_forecast = forecast[forecast["ds"] > pd.Timestamp.now()][
        ["ds", "yhat", "yhat_lower", "yhat_upper"]
    ].head(4)

    return {
        "ticker":  ticker,
        "metric":  metric,
        "periods": [
            {
                "quarter":    str(r["ds"])[:7],
                "forecast":   round(r["yhat"], 4),
                "lower_95ci": round(r["yhat_lower"], 4),
                "upper_95ci": round(r["yhat_upper"], 4),
            }
            for _, r in future_forecast.iterrows()
        ],
    }
```

#### 7.5.2 LSTM Stock Price Forecasting — 7 ngày giao dịch tới

```python
# ml/forecasting/lstm_price.py
"""
LSTM nhiều-sang-một: 30 ngày (features) → 7 ngày tới (giá đóng cửa).
Features: OHLCV + technical indicators (MA5, MA20, RSI14, MACD) + NIM, NPL.
"""
import torch
import torch.nn as nn
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.preprocessing import MinMaxScaler
from backend.db.query import run_query

MODEL_DIR      = Path("ml/models/forecasting")
SEQ_LEN        = 30     # input window: 30 ngày
PRED_LEN       = 7      # output horizon: 7 ngày tới
HIDDEN_DIM     = 128
N_LAYERS       = 2
PRICE_FEATURES = [
    "close_price", "volume", "pct_change",
    "ma_5", "ma_20", "rsi_14", "macd",
    "nim_pct", "npl_ratio_pct",
]


def compute_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Tính technical indicators — DuckDB không có built-in RSI/MACD."""
    df = df.sort_values("trade_date").copy()
    df["ma_5"]  = df["close_price"].rolling(5).mean()
    df["ma_20"] = df["close_price"].rolling(20).mean()

    # RSI-14
    delta = df["close_price"].diff()
    gain  = delta.clip(lower=0).rolling(14).mean()
    loss  = (-delta.clip(upper=0)).rolling(14).mean()
    df["rsi_14"] = 100 - (100 / (1 + gain / loss.replace(0, np.nan)))

    # MACD = EMA12 - EMA26
    ema12 = df["close_price"].ewm(span=12, adjust=False).mean()
    ema26 = df["close_price"].ewm(span=26, adjust=False).mean()
    df["macd"] = ema12 - ema26
    return df


class LSTMPriceModel(nn.Module):
    def __init__(self, n_features: int, hidden_dim: int, n_layers: int, pred_len: int):
        super().__init__()
        self.lstm = nn.LSTM(n_features, hidden_dim, n_layers,
                            batch_first=True, dropout=0.2)
        self.fc   = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(64, pred_len),
        )

    def forward(self, x):
        _, (h, _) = self.lstm(x)
        return self.fc(h[-1])


def load_price_data(ticker: str) -> pd.DataFrame:
    df = run_query(f"""
        SELECT trade_date, close_price, volume, pct_change, nim_pct, npl_ratio_pct
        FROM mart_bank_perf
        WHERE ticker = '{ticker}'
        ORDER BY trade_date
    """)
    df["nim_pct"]       = df["nim_pct"].ffill()
    df["npl_ratio_pct"] = df["npl_ratio_pct"].ffill()
    return compute_technical_indicators(df).dropna()


def train_lstm_price(ticker: str, epochs: int = 100) -> dict:
    df = load_price_data(ticker)
    if len(df) < SEQ_LEN + PRED_LEN + 30:
        return {"error": f"Insufficient data for {ticker}"}

    feature_scaler = MinMaxScaler()
    target_scaler  = MinMaxScaler()
    X_scaled = feature_scaler.fit_transform(df[PRICE_FEATURES].values)
    y_scaled = target_scaler.fit_transform(df[["close_price"]].values).flatten()

    # Sliding window sequences
    X_seqs, y_seqs = [], []
    for i in range(len(X_scaled) - SEQ_LEN - PRED_LEN + 1):
        X_seqs.append(X_scaled[i:i+SEQ_LEN])
        y_seqs.append(y_scaled[i+SEQ_LEN:i+SEQ_LEN+PRED_LEN])
    X_seqs, y_seqs = np.array(X_seqs), np.array(y_seqs)

    n_train = int(len(X_seqs) * 0.8)
    X_train = torch.FloatTensor(X_seqs[:n_train])
    y_train = torch.FloatTensor(y_seqs[:n_train])
    X_val   = torch.FloatTensor(X_seqs[n_train:])
    y_val   = torch.FloatTensor(y_seqs[n_train:])

    model     = LSTMPriceModel(len(PRICE_FEATURES), HIDDEN_DIM, N_LAYERS, PRED_LEN)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=10)

    best_val_loss, best_state = float("inf"), None
    for epoch in range(epochs):
        model.train()
        optimizer.zero_grad()
        loss = criterion(model(X_train), y_train)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)  # gradient clipping
        optimizer.step()

        model.eval()
        with torch.no_grad():
            val_loss = criterion(model(X_val), y_val).item()
        scheduler.step(val_loss)

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state    = {k: v.clone() for k, v in model.state_dict().items()}

        if (epoch + 1) % 20 == 0:
            print(f"  Epoch {epoch+1}/{epochs} — val_loss: {val_loss:.6f}")

    # Tính MAPE trên validation set
    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        val_pred_scaled = model(X_val).numpy()
    val_pred = target_scaler.inverse_transform(val_pred_scaled)
    val_true = target_scaler.inverse_transform(y_val.numpy())
    mape     = float(np.mean(np.abs((val_true - val_pred) / val_true)) * 100)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_state":    best_state,
        "feature_scaler": feature_scaler,
        "target_scaler":  target_scaler,
        "features":       PRICE_FEATURES,
        "seq_len":        SEQ_LEN,
        "pred_len":       PRED_LEN,
        "n_features":     len(PRICE_FEATURES),
        "val_mape":       mape,
    }, MODEL_DIR / f"lstm_price_{ticker}.pt")

    return {"ticker": ticker, "val_mape_pct": round(mape, 2)}


def predict_price(ticker: str) -> dict:
    """Dự báo giá đóng cửa 7 ngày giao dịch tới."""
    ckpt_path = MODEL_DIR / f"lstm_price_{ticker}.pt"
    if not ckpt_path.exists():
        return {"error": "Model not trained. Run train_lstm_price() first."}

    ckpt = torch.load(ckpt_path, weights_only=False)
    model = LSTMPriceModel(ckpt["n_features"], HIDDEN_DIM, N_LAYERS, PRED_LEN)
    model.load_state_dict(ckpt["model_state"])
    model.eval()

    df       = load_price_data(ticker)
    last_seq = ckpt["feature_scaler"].transform(df[ckpt["features"]].values[-SEQ_LEN:])
    x_tensor = torch.FloatTensor(last_seq).unsqueeze(0)

    with torch.no_grad():
        pred_scaled = model(x_tensor).numpy()
    pred_prices = ckpt["target_scaler"].inverse_transform(pred_scaled).flatten()
    last_price  = float(df["close_price"].iloc[-1])

    return {
        "ticker":        ticker,
        "last_price":    round(last_price, 2),
        "forecast_7d":   [round(float(p), 2) for p in pred_prices],
        "pct_change_7d": round((pred_prices[-1] - last_price) / last_price * 100, 2),
        "val_mape_pct":  round(ckpt["val_mape"], 2),
    }
```

#### 7.5.3 Forecast Agent — tích hợp LLM narrative

```python
# backend/agents/forecast_agent.py
from langchain_anthropic import ChatAnthropic
from ml.forecasting.prophet_forecaster import get_forecast
from ml.forecasting.lstm_price         import predict_price
import json

llm = ChatAnthropic(model="claude-sonnet-4-20250514", temperature=0)

VN_BANK_TICKERS     = ["VCB", "BID", "CTG", "MBB", "TCB"]
METRICS_TO_FORECAST = ["nim_pct", "npl_ratio_pct", "roe_pct", "car_pct"]


def run_forecast(question: str, ticker: str = None) -> dict:
    """
    Kết hợp Prophet (quarterly metrics) + LSTM price (7 ngày) + LLM narrative.
    Ví dụ: 'NPL của VCB 4 quý tới sẽ như thế nào?'
    """
    tickers = [ticker] if ticker else VN_BANK_TICKERS
    forecasts = {}

    for t in tickers:
        forecasts[t] = {
            "price_7d": predict_price(t),
            "metrics":  {m: get_forecast(t, m) for m in METRICS_TO_FORECAST},
        }

    prompt = f"""Phân tích dữ liệu forecast ngân hàng VN sau và đưa ra nhận định.

Câu hỏi: {question}

Dữ liệu forecast:
{json.dumps(forecasts, default=str, indent=2)}

Cung cấp:
1. Xu hướng chính (NPL tăng/giảm? NIM được cải thiện?)
2. Risk flags (NPL vượt ngưỡng SBV? CAR gần minimum Basel III?)
3. So sánh giữa các ngân hàng
4. Khuyến nghị monitoring

Trả lời bằng tiếng Việt, cụ thể với số liệu."""

    response = llm.invoke(prompt)
    return {
        "question":  question,
        "forecasts": forecasts,
        "narrative": response.content,
    }
```

**Thêm API endpoint forecast:**

```python
# backend/main.py — bổ sung endpoint
@app.get("/api/forecast/{ticker}/{metric}")
async def forecast(
    ticker: str,
    metric: str = "npl_ratio_pct",
    user=Depends(get_current_user)
):
    from ml.forecasting.prophet_forecaster import get_forecast
    from ml.forecasting.lstm_price         import predict_price
    return {
        "prophet_quarterly": get_forecast(ticker, metric),
        "lstm_7d":           predict_price(ticker),
    }
```

**Model performance expectations:**

| Model | Target | Typical MAPE | Use case |
|---|---|---|---|
| Prophet (NIM) | Quarterly NIM trend | 3–8% | Annual planning, risk reporting |
| Prophet (NPL) | Quarterly NPL trend | 5–12% | Early warning system |
| LSTM Price | Daily close (7d) | 2–6% | Direction signal, not trading |

> ⚠️ MAPE này là in-sample estimate. Validate bằng walk-forward backtest trước khi dùng trong production (xem Section 15).

---

## 8. Backend API

```python
# backend/main.py
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.agents.graph         import graph
from backend.auth.jwt             import get_current_user
from backend.observability.logger import log_request
import time, uuid

app = FastAPI(title="FinSight API", version="2.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"], allow_headers=["*"])

class QueryRequest(BaseModel):
    question: str

@app.post("/api/query")
async def query(req: QueryRequest, user=Depends(get_current_user)):
    rid   = str(uuid.uuid4())
    start = time.time()
    try:
        result  = graph.invoke({"question": req.question, "intent": ""})
        latency = time.time() - start
        log_request({
            "request_id": rid,
            "user_id":    user["id"],
            "question":   req.question,
            "intent":     result.get("intent"),
            "latency_ms": round(latency * 1000),
            "rows":       result.get("rows", 0),
            "has_error":  bool(result.get("error")),
        })
        return {"request_id": rid, "latency_ms": round(latency * 1000), **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anomalies")
async def anomalies(
    threshold: float = 2.5,
    days: int = 90,
    user=Depends(get_current_user)
):
    from backend.agents.anomaly_agent import run_anomaly_detection
    return {"anomalies": run_anomaly_detection(threshold=threshold, days=days)}

@app.get("/api/rca/{ticker}/{date}")
async def rca(ticker: str, date: str, user=Depends(get_current_user)):
    from backend.agents.rca_agent import run_rca
    return run_rca(question=f"Why did {ticker} show anomaly on {date}?")

@app.get("/api/metrics")
async def metrics(user=Depends(get_current_user)):
    from backend.observability.logger import get_metrics_summary
    return get_metrics_summary()

@app.get("/api/health")
def health():
    return {"status": "ok"}
```

**Endpoint list:**

| Method | Path | Mô tả |
|---|---|---|
| POST | `/api/query` | NL query → SQL → insight từ Gold marts |
| GET | `/api/anomalies?threshold=2.5&days=90` | Anomaly list với param tùy chỉnh |
| GET | `/api/rca/{ticker}/{date}` | Root cause cho ticker và ngày cụ thể |
| GET | `/api/metrics` | Observability summary 7 ngày |
| POST | `/api/auth/login` | Lấy JWT token |

---

## 9. Frontend

```
frontend/
├── app/
│   ├── login/page.tsx
│   └── dashboard/
│       ├── page.tsx              ← Chat + KPI cards (NIM NPL CAR CASA realtime)
│       ├── anomalies/page.tsx    ← Timeline + z-score chart per ticker
│       └── observability/page.tsx ← Cost, latency, pipeline health
├── components/
│   ├── ChatPanel.tsx
│   ├── AnomalyChart.tsx          ← Recharts — z-score over time per bank
│   ├── BankKPICard.tsx           ← NIM NPL CAR CASA với threshold badges
│   ├── RCAPanel.tsx
│   └── ObservabilityDash.tsx
└── lib/
    └── api.ts
```

```typescript
// frontend/lib/api.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("token")
  const res   = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  query:     (q: string) =>
    apiFetch("/api/query", { method: "POST", body: JSON.stringify({ question: q }) }),
  anomalies: (threshold = 2.5, days = 90) =>
    apiFetch(`/api/anomalies?threshold=${threshold}&days=${days}`),
  rca:       (ticker: string, date: string) =>
    apiFetch(`/api/rca/${ticker}/${date}`),
  metrics:   () => apiFetch("/api/metrics"),
  login:     (u: string, p: string) =>
    apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
}
```

---

## 10. Observability

```python
# backend/observability/logger.py
import sqlite3
from datetime import datetime

OBS_DB = "data/observability.db"

def init_obs_db():
    con = sqlite3.connect(OBS_DB)
    con.execute("""
        CREATE TABLE IF NOT EXISTS request_logs (
            id                 TEXT PRIMARY KEY,
            timestamp          TEXT,
            user_id            TEXT,
            question           TEXT,
            intent             TEXT,
            latency_ms         INTEGER,
            token_input        INTEGER DEFAULT 0,
            token_output       INTEGER DEFAULT 0,
            estimated_cost_usd REAL    DEFAULT 0,
            rows               INTEGER DEFAULT 0,
            has_error          INTEGER DEFAULT 0
        )
    """)
    con.commit()
    con.close()

def log_request(data: dict):
    # claude-sonnet-4-20250514: $3/M input, $15/M output tokens
    cost = (data.get("token_input",  0) / 1_000_000 * 3 +
            data.get("token_output", 0) / 1_000_000 * 15)
    con  = sqlite3.connect(OBS_DB)
    con.execute("""
        INSERT INTO request_logs VALUES
        (:request_id,:timestamp,:user_id,:question,:intent,
         :latency_ms,:token_input,:token_output,:cost,:rows,:has_error)
    """, {**data, "timestamp": datetime.utcnow().isoformat(), "cost": cost})
    con.commit()
    con.close()

def get_metrics_summary() -> dict:
    con = sqlite3.connect(OBS_DB)
    row = con.execute("""
        SELECT COUNT(*), AVG(latency_ms), SUM(estimated_cost_usd),
               SUM(has_error) * 100.0 / COUNT(*)
        FROM request_logs
        WHERE timestamp >= datetime('now', '-7 days')
    """).fetchone()
    con.close()
    return {
        "total_requests": row[0],
        "avg_latency_ms": round(row[1] or 0),
        "total_cost_usd": round(row[2] or 0, 4),
        "error_rate_pct": round(row[3] or 0, 1),
    }
```

**Data pipeline observability** bổ sung — theo dõi freshness của từng layer:

```python
# orchestration/assets/gold_assets.py — bổ sung metadata
context.add_output_metadata({
    "rows":           row_count,
    "last_trade_date": last_date,
    "tickers":        ["VCB", "BID", "CTG", "MBB", "TCB"],
    "dbt_run_id":     dbt_run_id,
})
```

Dagster UI hiển thị metadata này trực tiếp trên asset node — bạn biết ngay Gold mart chứa data đến ngày nào mà không cần query.

---

## 11. Auth & RBAC

```python
# backend/auth/jwt.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from datetime import datetime, timedelta

SECRET_KEY = "change-in-production"
ALGORITHM  = "HS256"

USERS = {
    "analyst": {"password": "pass123", "role": "analyst", "id": "u1"},
    "admin":   {"password": "admin",   "role": "admin",   "id": "u0"},
}

security = HTTPBearer()

def create_token(user_id: str, role: str) -> str:
    return jwt.encode(
        {"sub": user_id, "role": role,
         "exp": datetime.utcnow() + timedelta(hours=8)},
        SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

---

## 12. Setup & Chạy thử

```bash
# 1. Cài dependencies
pip install \
  vnstock3 requests \
  deltalake \
  dbt-duckdb dbt-utils \
  great-expectations \
  dagster dagster-dbt dagster-webserver \
  fastapi uvicorn duckdb \
  langchain langchain-anthropic langgraph \
  pandas pyarrow pydantic \
  python-jose faker \
  scikit-learn \
  torch \
  prophet \
  mlflow

# 2. Tạo thư mục
mkdir -p data/bronze data/observability docs/adr

# 3. Setup env
cp .env.example .env
# Điền ANTHROPIC_API_KEY vào .env

# 4. Init DuckDB warehouse (tạo Bronze views)
python -c "from backend.db.warehouse import init_warehouse; init_warehouse()"

# 5. Init dbt project
cd dbt_project && dbt deps && cd ..

# 6. Backfill lịch sử — kéo data từ 2022 đến nay
python -c "
from pipeline.extractors.market     import MarketExtractor
from pipeline.extractors.financials import FinancialsExtractor
from pipeline.extractors.world_bank import WorldBankExtractor
from pipeline.delta_writer          import write_bronze
from datetime import date

# Stocks + financials + macro
for extractor, source in [
    (MarketExtractor(),      'vn_stocks'),
    (FinancialsExtractor(),  'vn_financials'),
    (WorldBankExtractor(),   'world_bank'),
]:
    df = extractor.run(date.today())
    write_bronze(df, source)
    print(f'✅ {source}: {len(df)} rows')
"

# 7. Build Silver + Gold qua dbt
cd dbt_project
dbt run
dbt test
dbt docs generate && dbt docs serve &   # lineage DAG tại localhost:8080
cd ..

# 8. Init observability DB
python -c "from backend.observability.logger import init_obs_db; init_obs_db()"

# 9. Chạy backend
uvicorn backend.main:app --reload --port 8000

# 10. Chạy frontend
cd frontend && npm install && npm run dev

# 11. Dagster UI (orchestration)
dagster dev -f orchestration/definitions.py   # localhost:3000
```

**Environment variables:**

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
SECRET_KEY=change-me-in-production
```

---

## 13. Architecture Decision Records

### ADR-001: Delta Lake thay vì Parquet thuần cho Bronze

**Decision:** Delta Lake (`deltalake` Python library) cho toàn bộ Bronze layer.

**Reasoning:** Parquet thuần không có transaction log — pipeline fail giữa chừng dẫn đến partial write không phát hiện được. Delta Lake thêm `_delta_log/` JSON transaction log: ACID, rollback bằng `restore_version()`, time travel để debug, schema evolution tự động bằng `schema_mode=merge`. Không cần Spark — `deltalake` Python library đọc/ghi native.

**Trade-off:** Thêm `_delta_log/` directory, storage overhead nhỏ (~5%). Không phải limitation — đây là feature.

---

### ADR-002: dbt Core thay vì Pandas scripts cho transform

**Decision:** dbt Core với DuckDB adapter cho toàn bộ Silver và Gold layer.

**Reasoning:** Pandas script không có lineage, không có built-in testing, không có dependency tracking giữa các model. dbt giải quyết cả ba: `ref()` tạo dependency graph tự động, test khai báo trong YAML, `dbt docs` sinh lineage DAG visual. SQL-based transform dễ review và audit hơn Python transform. `dbt-duckdb` adapter zero-config — không cần server riêng.

**Trade-off:** Team phải biết SQL tốt. Với data engineering, đây không phải trade-off — đây là requirement.

---

### ADR-003: Dagster thay vì Prefect cho orchestration

**Decision:** Dagster cho pipeline orchestration.

**Reasoning:** Prefect là task orchestrator — nó nghĩ theo "function nào chạy trước function nào." Dagster là asset orchestrator — nó nghĩ theo "data asset nào depend vào data asset nào." Mental model thứ hai đúng hơn cho data pipeline. Dagster có native `dagster-dbt` integration, freshness check per-asset, materialization history, và lineage graph built-in trong UI — không cần tool riêng cho lineage.

**Trade-off:** Airflow phổ biến hơn ở enterprise legacy. Dagster là lựa chọn của data-first companies mới build stack. Cả hai đều có trong job listing.

---

### ADR-004: vnstock thay vì synthetic generator

**Decision:** `vnstock3` library cho VN bank data — loại bỏ hoàn toàn synthetic data.

**Reasoning:** `vnstock3` lấy BCTC niêm yết công khai từ HOSE/HNX — bao gồm quarterly NIM, NPL ratio, CAR, CASA ratio thực của VCB/BID/CTG/MBB/TCB. Đây chính xác là data mà guide cũ phải fake bằng `SyntheticTransactionExtractor`. Dùng data thực eliminate toàn bộ vấn đề về labeled anomaly, controlled distribution, và câu hỏi phỏng vấn khó về độ tin cậy của data.

**Trade-off:** vnstock phụ thuộc vào API bên thứ ba — có thể rate limit hoặc format thay đổi. Pydantic schema validation ở tầng ingestion giúp phát hiện sớm khi format thay đổi.

---

### ADR-005: DuckDB cho serving layer

**Decision:** DuckDB cho Silver và Gold serving, đọc Delta tables qua `delta` extension.

**Reasoning:** Project này là OLAP workload — aggregation, time-series query, cross-join macro × financial ratios. DuckDB columnar storage tối ưu cho loại query này, nhanh hơn PostgreSQL 10-100x trên analytical query. Zero-server, in-process, đọc thẳng Delta Parquet files không cần ETL load. `delta` extension cho phép DuckDB query Delta tables native.

**Trade-off:** Không phù hợp high-concurrency writes (không cần trong project này). Scale lên → MotherDuck (cloud DuckDB) hoặc ClickHouse.

---

### ADR-006: ML Anomaly Detection — Ensemble Strategy

**Decision:** Ensemble 3 signals: Z-score (dbt SQL) + Isolation Forest + LSTM Autoencoder. Flag anomaly khi ≥ 2/3 signals đồng ý.

**Reasoning:** Z-score chỉ xét univariate (price deviation so với rolling mean) — bỏ sót các tình huống: volume spike bình thường nhưng NPL đồng thời tăng mạnh, hoặc pct_change nhỏ nhưng CAR đang gần ngưỡng Basel. Isolation Forest bắt được **multivariate anomaly** — phát hiện combination bất thường trong không gian 9 chiều (price, volume, pct_change, MA30, std30, NIM, NPL, CAR, ROE) mà z-score không thể. LSTM Autoencoder bắt được **regime change** — khi sequential pattern 20 ngày hoàn toàn khác pattern lịch sử, ngay cả khi từng điểm riêng lẻ không bất thường. Ensemble 2/3 votes giảm false positive đáng kể so với từng signal đơn lẻ mà không tăng false negative quá nhiều.

**Trade-off:** Latency tăng từ sub-ms (z-score SQL) lên ~60ms (ensemble full). Giải quyết bằng kiến trúc hai tầng: dashboard dùng fast path (z-score), deep analysis dùng ensemble. Training time IF ~30s/ticker, LSTM ~5min/ticker — chạy Dagster scheduled asset không ảnh hưởng serving.

---

### ADR-007: Forecasting — Prophet cho quarterly metrics, LSTM cho daily price

**Decision:** Prophet (Meta) cho NPL/NIM/CAR/ROE quarterly trend; LSTM nhiều-sang-một cho daily stock price 7 ngày tới.

**Reasoning:**
- **Prophet vs ARIMA cho quarterly data:** ARIMA yêu cầu stationarity test thủ công (ADF, KPSS), differencing, manual seasonality specification. Với chỉ 24–32 quarterly data points, ARIMA dễ overfit và không hội tụ ổn định. Prophet xử lý tự động: trend changepoints, Q1/Q4 VN banking seasonality, missing quarters graceful. Quan trọng nhất: Prophet có 95% CI built-in — critical cho risk reporting (SBV, analyst cần uncertainty range, không chỉ point estimate). Hierarchical prophet có thể extend để forecast cả sector aggregate.
- **LSTM vs statistical model cho daily price:** Daily price có non-linear dependencies: RSI overbought/oversold, MACD crossover, correlation với NPL quarterly report. Các mô hình linear (ARIMA, Exponential Smoothing) không capture được. LSTM với 9 features (OHLCV + technical indicators + financial ratios) học được complex temporal pattern. Gradient clipping + ReduceLROnPlateau scheduler giúp training ổn định trên dataset ~500 ngày.

**Trade-off:** LSTM price MAPE ~2–6% đủ cho direction signal trong RCA context nhưng không đủ để trade algorithmically. Prophet quarterly MAPE ~5–12% phụ thuộc vào macro volatility — năm COVID (2020–2021) sẽ có MAPE cao hơn. Walk-forward backtest với coverage metric (95% CI) giúp quantify uncertainty một cách honest.

---

## 14. Câu hỏi phỏng vấn

**"Data của anh/chị là real hay mock?"**
> "Toàn bộ là real data. Stock prices và financial ratios (NIM, NPL, CAR, CASA) của VCB, BID, CTG, MBB, TCB lấy từ `vnstock3` — đây là data BCTC niêm yết công khai từ HOSE/HNX. Macro indicators lấy từ World Bank API. Không có synthetic data trong pipeline."

**"Tại sao dùng Delta Lake chứ không phải Parquet thư mục?"**
> "Parquet thuần không có transaction log — nếu pipeline viết 60% rồi crash, bạn không biết data ở trạng thái nào. Delta Lake thêm `_delta_log/` JSON log: mọi write là atomic, rollback bằng `restore_version()`, time travel để debug data lịch sử, schema evolution tự động khi source thêm cột. Không cần Spark — `deltalake` Python library đủ dùng."

**"Tại sao dùng dbt chứ không phải viết Python transform?"**
> "dbt giải quyết 3 vấn đề mà Pandas script không giải quyết được: dependency tracking giữa models bằng `ref()`, testing tích hợp trong YAML, và lineage DAG tự động từ `dbt docs`. SQL-based transform cũng dễ review và audit hơn Python transform. Với DuckDB adapter, không cần server riêng."

**"Pipeline fail ở Silver thì Gold có bị refresh không?"**
> "Không. Trong Dagster, `silver_quality_check` asset phải materialized thành công thì `gold_marts` asset mới chạy — đây là asset dependency explicit. Nếu dbt tests fail hoặc Great Expectations checkpoint fail, pipeline abort trước khi refresh Gold. Serving layer không bao giờ nhận data không qua quality check."

**"Lineage của anh/chị track ở đâu?"**
> "Hai nơi, bổ sung nhau: dbt lineage DAG từ `dbt docs serve` — thấy dependency graph từng SQL model, column-level lineage nếu dùng dbt v1.6+. Dagster asset graph — thấy Bronze → Silver → Gold → Agent layer trong một UI, kèm materialization history và freshness status."

**"Scale lên 100 user thì sao?"**
> "FastAPI async, DuckDB connection pool, Gold mart tables pre-computed nên query nhanh. Với 100 concurrent analytical users, DuckDB in-process có thể bottleneck — lúc đó migrate Bronze lên S3, DuckDB sang MotherDuck (cloud DuckDB, serverless) hoặc ClickHouse. dbt models và Dagster assets không cần đổi — chỉ đổi connection string."

**"Tại sao không dùng Airflow?"**
> "Airflow cần Postgres + Docker Compose riêng, task-centric không phải asset-centric. Dagster có mental model phù hợp hơn với DE: bạn khai báo data assets và dependencies, Dagster lo orchestration. Airflow phổ biến hơn ở legacy enterprise, Dagster đang là lựa chọn của modern data stack. Biết cả hai là tốt nhất."

**"ML anomaly detection của anh/chị khác gì z-score trong dbt?"**
> "Z-score trong dbt là univariate — chỉ xét price deviation so với 30-day rolling mean, không biết volume hay NPL đang ở mức nào. Isolation Forest là multivariate unsupervised — dùng 9 features (price, volume, pct_change, MA30, std30, NIM, NPL, CAR, ROE) để học distribution bình thường, bắt được complex pattern mà z-score bỏ sót. LSTM Autoencoder học sequential pattern 20 ngày — nó biết 'sequence này khác hoàn toàn với pattern bình thường'. Hệ thống ensemble 2/3 votes để giảm false positive của từng signal đơn lẻ."

**"Tại sao dùng Prophet thay vì ARIMA cho NPL forecast?"**
> "ARIMA yêu cầu stationarity — phải ADF test, differencing thủ công, không handle multiple seasonality. Prophet xử lý tất cả tự động. Quan trọng hơn: Prophet có 95% confidence interval built-in — rất cần thiết cho risk reporting trong ngân hàng (SBV muốn thấy uncertainty range, không chỉ point estimate). Với quarterly data chỉ ~24–32 data points, Prophet hoạt động tốt hơn ARIMA và ít hyper-parameter tuning hơn."

**"Walk-forward validation là gì, tại sao không dùng random split?"**
> "Time series data không thể random split vì future data sẽ leak vào training set — model học từ tương lai, MAPE trên test set sẽ ảo. Walk-forward validation (expanding window): train [0, t], test [t, t+horizon], rồi train [0, t+1], test [t+1, t+2]... Lặp 4 lần với horizon 4 quarters. Kết quả phản ánh đúng điều kiện deploy thực tế — model chỉ thấy past data khi predict future."

**"Drift detection làm gì trong pipeline?"**
> "PSI (Population Stability Index) so sánh feature distribution của training window (2022–2023) với 90 ngày gần nhất. PSI > 0.2 = distribution đã thay đổi đáng kể — model đang score data khác hoàn toàn với data nó được train, predictions không còn reliable. Dagster asset chạy PSI check weekly. Nếu phát hiện drift trên bất kỳ feature nào, pipeline tự trigger retrain. Đây là minimum viable MLOps — không cần MLflow gateway."

**"Model của anh/chị được track và version như thế nào?"**
> "MLflow với SQLite backend — zero-server, phù hợp cho project solo. Mỗi training run log parameters (contamination, n_estimators, seq_len), metrics (anomaly_rate, val_mape, val_loss), và artifact path. Có thể so sánh các run để chọn best model. Production model được Dagster asset materialize mỗi khi retrain — kết hợp Dagster materialization history + MLflow experiment = full audit trail."

---

## 15. MLOps — Model Registry & Drift Detection

### 15.1 MLflow Experiment Tracking

```python
# ml/model_registry.py
import mlflow
from pathlib import Path

MLFLOW_TRACKING_URI = "sqlite:///data/mlflow.db"
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)


def log_isolation_forest_run(ticker: str, result: dict) -> str:
    """Log IF training run vào MLflow — params + metrics + artifact path."""
    with mlflow.start_run(run_name=f"IF_{ticker}") as run:
        mlflow.set_tags({"model_type": "IsolationForest", "ticker": ticker})
        mlflow.log_params({"contamination": 0.05, "n_estimators": 200})
        mlflow.log_metrics({
            "n_train":      result["n_train"],
            "anomaly_rate": result["anomaly_rate"],
        })
        mlflow.log_artifact(str(Path("ml/models") / f"isolation_forest_{ticker}.pkl"))
        return run.info.run_id


def log_prophet_run(ticker: str, metric: str, result: dict) -> str:
    """Log Prophet training run."""
    with mlflow.start_run(run_name=f"Prophet_{ticker}_{metric}") as run:
        mlflow.set_tags({"model_type": "Prophet", "ticker": ticker, "metric": metric})
        mlflow.log_metrics({"mape_pct": result["mape_pct"], "n_quarters": result["n_quarters"]})
        return run.info.run_id


def log_lstm_price_run(ticker: str, result: dict) -> str:
    """Log LSTM price model run."""
    with mlflow.start_run(run_name=f"LSTM_Price_{ticker}") as run:
        mlflow.set_tags({"model_type": "LSTM_Price", "ticker": ticker})
        mlflow.log_params({"seq_len": 30, "pred_len": 7, "hidden_dim": 128, "n_layers": 2})
        mlflow.log_metric("val_mape_pct", result["val_mape_pct"])
        return run.info.run_id
```

Chạy MLflow UI:

```bash
mlflow ui --backend-store-uri sqlite:///data/mlflow.db --port 5000
# → localhost:5000: experiment history, metric comparison, model registry
```

### 15.2 Data Drift Detection — PSI

```python
# ml/drift_detection.py
"""
Population Stability Index (PSI) — đo drift giữa training distribution vs current.
PSI < 0.1 : no significant change
0.1 ≤ PSI < 0.2 : moderate change — monitor closely
PSI ≥ 0.2 : significant change — retrain required
"""
import numpy as np
import pandas as pd
from backend.db.query import run_query


def compute_psi(expected: np.ndarray, actual: np.ndarray, bins: int = 10) -> float:
    """PSI giữa expected (training) và actual (current) distribution."""
    eps = 1e-8
    breakpoints     = np.percentile(expected, np.linspace(0, 100, bins + 1))
    breakpoints[0]  -= 1e-10
    breakpoints[-1] += 1e-10

    exp_pct = np.clip(np.histogram(expected, bins=breakpoints)[0] / len(expected), eps, None)
    act_pct = np.clip(np.histogram(actual,   bins=breakpoints)[0] / len(actual),   eps, None)

    return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))


def run_drift_check() -> dict:
    """
    So sánh distribution của key features:
    training window (2022–2023) vs recent window (90 ngày cuối).
    """
    df = run_query("""
        SELECT trade_date, ticker, close_price, volume, pct_change,
               nim_pct, npl_ratio_pct, car_pct
        FROM mart_bank_perf
        WHERE trade_date >= '2022-01-01'
        ORDER BY trade_date
    """)

    cutoff     = df["trade_date"].max() - pd.Timedelta(days=90)
    df_train   = df[df["trade_date"] < cutoff]
    df_current = df[df["trade_date"] >= cutoff]

    features = ["close_price", "volume", "pct_change", "nim_pct", "npl_ratio_pct"]
    results  = {}

    for feature in features:
        train_vals   = df_train[feature].dropna().values
        current_vals = df_current[feature].dropna().values
        if len(train_vals) < 10 or len(current_vals) < 10:
            continue

        psi   = compute_psi(train_vals, current_vals)
        level = "stable" if psi < 0.1 else ("monitor" if psi < 0.2 else "retrain_required")
        results[feature] = {"psi": round(psi, 4), "status": level}

    needs_retrain = any(v["status"] == "retrain_required" for v in results.values())
    return {"features": results, "needs_retrain": needs_retrain}
```

### 15.3 Walk-Forward Backtesting

```python
# ml/backtesting.py
"""
Walk-forward validation cho Prophet — tránh data leakage hoàn toàn.
Train trên [0, t], test trên [t, t+horizon], lặp lại n_splits lần.
"""
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_percentage_error
from backend.db.query import run_query


def backtest_prophet(ticker: str, metric: str,
                     n_splits: int = 4, horizon: int = 4) -> dict:
    """Walk-forward backtest — n_splits folds, mỗi fold test horizon quarters."""
    from prophet import Prophet

    df = run_query(f"""
        SELECT DATE_TRUNC('quarter', trade_date) AS ds, AVG({metric}) AS y
        FROM mart_bank_perf
        WHERE ticker = '{ticker}' AND {metric} IS NOT NULL
        GROUP BY DATE_TRUNC('quarter', trade_date)
        ORDER BY ds
    """)
    df["ds"] = pd.to_datetime(df["ds"])
    df = df.dropna()

    if len(df) < n_splits * horizon + 8:
        return {"error": "Insufficient data for backtesting"}

    fold_results = []
    for fold in range(n_splits):
        train_end = len(df) - (n_splits - fold) * horizon
        train_df  = df.iloc[:train_end]
        test_df   = df.iloc[train_end:train_end + horizon]
        if len(train_df) < 8:
            continue

        model = Prophet(yearly_seasonality=True, interval_width=0.95)
        model.fit(train_df)
        future   = model.make_future_dataframe(periods=horizon, freq="Q")
        forecast = model.predict(future)

        y_pred = forecast["yhat"].iloc[-horizon:].values
        y_true = test_df["y"].values
        lower  = forecast["yhat_lower"].iloc[-horizon:].values
        upper  = forecast["yhat_upper"].iloc[-horizon:].values

        # Coverage: % giá trị thực nằm trong CI 95%
        coverage = float(np.mean((y_true >= lower) & (y_true <= upper)) * 100)

        fold_results.append({
            "fold":            fold + 1,
            "mape_pct":        round(mean_absolute_percentage_error(y_true, y_pred) * 100, 2),
            "coverage_95ci":   round(coverage, 1),
        })

    return {
        "ticker":       ticker,
        "metric":       metric,
        "n_splits":     n_splits,
        "horizon":      horizon,
        "folds":        fold_results,
        "avg_mape_pct": round(np.mean([f["mape_pct"] for f in fold_results]), 2),
        "avg_coverage": round(np.mean([f["coverage_95ci"] for f in fold_results]), 1),
        # avg_coverage nên gần 95% — nếu thấp hơn nhiều = model overconfident
    }
```

### 15.4 Dagster ML Assets — full schedule

```python
# orchestration/assets/ml_assets.py — bổ sung Prophet + drift check
from dagster import asset, AssetExecutionContext, WeeklyPartitionsDefinition
from .gold_assets import gold_marts
from ml.anomaly.isolation_forest      import train_isolation_forest
from ml.anomaly.lstm_autoencoder      import train_lstm_autoencoder
from ml.forecasting.prophet_forecaster import train_prophet_models
from ml.drift_detection               import run_drift_check
from ml.model_registry                import log_prophet_run, log_isolation_forest_run

VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

@asset(
    group_name="ml",
    deps=[gold_marts],
    description="Retrain Prophet forecasting models — monthly",
)
def ml_prophet_forecasts(context: AssetExecutionContext) -> None:
    results = train_prophet_models()
    for ticker, metrics in results.items():
        for metric, r in metrics.items():
            if "mape_pct" in r:
                run_id = log_prophet_run(ticker, metric, r)
                context.log.info(f"{ticker}/{metric}: MAPE={r['mape_pct']}%, run_id={run_id}")
    context.add_output_metadata({"tickers": VN_BANK_TICKERS})

@asset(
    group_name="ml",
    deps=[gold_marts],
    description="PSI drift check — nếu drift > 0.2 thì log warning",
)
def ml_drift_check(context: AssetExecutionContext) -> None:
    drift_result = run_drift_check()
    if drift_result["needs_retrain"]:
        context.log.warning(f"⚠️ Feature drift detected! {drift_result['features']}")
    else:
        context.log.info(f"✅ No significant drift. {drift_result['features']}")
    context.add_output_metadata({
        "needs_retrain": drift_result["needs_retrain"],
        "features":      str(drift_result["features"]),
    })
```

**Tổng hợp ML artifact paths:**

```
ml/models/
├── isolation_forest_{ticker}.pkl     ← Trained nightly
├── lstm_ae_{ticker}.pt               ← Trained weekly
└── forecasting/
    ├── prophet_{ticker}_{metric}.pkl ← Trained monthly
    └── lstm_price_{ticker}.pt        ← Trained monthly
```

**MLOps maturity của project này:**

| Tiêu chí | Status |
|---|---|
| Model versioning | ✅ MLflow experiment tracking |
| Automated retraining | ✅ Dagster scheduled assets |
| Drift detection | ✅ PSI weekly check |
| Backtesting | ✅ Walk-forward validation |
| Model serving | ✅ FastAPI endpoints |
| **CI/CD pipeline** | ✅ GitHub Actions — mục 15.5 |
| **Model Registry staging** | ✅ MLflow Staging → Production — mục 15.6 |
| A/B testing | ⚠️ Không có — extension nếu cần |
| Feature store (centralized) | ⚠️ Hiện là file `ml/feature_store.py` — scale lên Feast |
| GPU training | ⚠️ CPU only — đủ cho dataset kích thước này |
| Cloud deployment | ⚠️ Local / MotherDuck — extend sang SageMaker |

> ℹ️ Project đạt **MLOps Maturity Level 2** theo Google MLOps framework: automated training pipeline + CI/CD + model registry staging lifecycle.

---

### 15.5 GitHub Actions — ML CI/CD Pipeline

Mỗi commit vào `main` hoặc PR đều trigger workflow kiểm tra toàn bộ ML pipeline: unit tests, feature sanity check, backtest MAPE threshold, drift check. Không có test pass → không merge.

```yaml
# .github/workflows/ml_ci.yml
name: ML CI Pipeline

on:
  push:
    branches: [main, develop]
    paths:
      - 'ml/**'
      - 'backend/agents/**'
      - 'orchestration/assets/ml_assets.py'
  pull_request:
    branches: [main]

jobs:
  # -----------------------------------------------------------------------
  # Job 1: Unit tests — feature engineering + model helpers
  # -----------------------------------------------------------------------
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run unit tests
        run: pytest ml/tests/ -v --tb=short --cov=ml --cov-report=term-missing
        env:
          PYTHONPATH: .

  # -----------------------------------------------------------------------
  # Job 2: Model validation — backtest MAPE và CI coverage
  # -----------------------------------------------------------------------
  model-validation:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Seed DuckDB with fixture data
        run: python ml/tests/fixtures/seed_duckdb.py
        env:
          PYTHONPATH: .

      - name: Train + backtest Prophet models
        run: |
          python - <<'EOF'
          from ml.forecasting.prophet_forecaster import train_prophet_models
          from ml.backtesting import backtest_prophet
          import sys

          train_prophet_models()

          TICKERS  = ['VCB', 'BID']
          METRICS  = ['npl_ratio_pct', 'nim_pct']
          failures = []

          for ticker in TICKERS:
              for metric in METRICS:
                  result = backtest_prophet(ticker, metric, n_splits=3, horizon=2)
                  if 'error' in result:
                      print(f'SKIP {ticker}/{metric}: {result["error"]}')
                      continue
                  mape     = result['avg_mape_pct']
                  coverage = result['avg_coverage']
                  print(f'{ticker}/{metric}: MAPE={mape}%, Coverage={coverage}%')
                  if mape > 20:
                      failures.append(f'{ticker}/{metric} MAPE={mape}% > 20%')
                  if coverage < 70:
                      failures.append(f'{ticker}/{metric} Coverage={coverage}% < 70%')

          if failures:
              print('FAILED:', failures)
              sys.exit(1)
          print('All model validation checks passed.')
          EOF
        env:
          PYTHONPATH: .

      - name: Run PSI drift check (warn only, not fail)
        run: |
          python -c "
          from ml.drift_detection import run_drift_check
          result = run_drift_check()
          print('Drift results:', result['features'])
          if result['needs_retrain']:
              print('WARNING: drift detected — schedule retrain')
          "
        env:
          PYTHONPATH: .

  # -----------------------------------------------------------------------
  # Job 3: Integration test — API endpoint health check
  # -----------------------------------------------------------------------
  api-integration:
    runs-on: ubuntu-latest
    needs: model-validation
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install dependencies
        run: pip install -r requirements.txt httpx

      - name: Start FastAPI server (background)
        run: |
          uvicorn backend.main:app --port 8000 &
          sleep 5
        env:
          PYTHONPATH: .
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Test health endpoint
        run: curl -f http://localhost:8000/api/health

      - name: Test anomaly endpoint with test token
        run: |
          TOKEN=$(python -c "
          from backend.auth.jwt import create_token
          print(create_token('ci_user', 'analyst'))
          ")
          curl -f -H "Authorization: Bearer $TOKEN" \
               "http://localhost:8000/api/anomalies?threshold=2.5&days=30"
        env:
          PYTHONPATH: .
```

**Unit test examples — `ml/tests/`:**

```python
# ml/tests/test_feature_store.py
import pandas as pd
import numpy as np
import pytest
from unittest.mock import patch
from ml.feature_store import build_anomaly_features, ANOMALY_FEATURES

SAMPLE_DATA = pd.DataFrame({
    "trade_date":    pd.date_range("2024-01-01", periods=60, freq="B"),
    "ticker":        ["VCB"] * 60,
    "close_price":   np.random.uniform(80_000, 100_000, 60),
    "volume":        np.random.randint(1_000_000, 10_000_000, 60),
    "pct_change":    np.random.uniform(-5, 5, 60),
    "ma_30d":        np.random.uniform(80_000, 100_000, 60),
    "std_30d":       np.random.uniform(1_000, 5_000, 60),
    "nim_pct":       [3.5] * 60,
    "npl_ratio_pct": [1.8] * 60,
    "car_pct":       [12.0] * 60,
    "roe_pct":       [15.0] * 60,
})

@patch("ml.feature_store.run_query", return_value=SAMPLE_DATA.copy())
def test_build_anomaly_features_columns(mock_query):
    df = build_anomaly_features(days=60)
    for col in ANOMALY_FEATURES:
        assert col in df.columns, f"Missing: {col}"

@patch("ml.feature_store.run_query", return_value=SAMPLE_DATA.copy())
def test_quarterly_forward_fill(mock_query):
    data = SAMPLE_DATA.copy()
    data.loc[5:10, "nim_pct"] = np.nan
    mock_query.return_value = data
    df = build_anomaly_features(days=60)
    assert df["nim_pct"].isna().sum() == 0


# ml/tests/test_psi.py
from ml.drift_detection import compute_psi
import numpy as np

def test_psi_identical_distributions():
    x = np.random.normal(0, 1, 500)
    assert compute_psi(x, x) < 0.05          # gần 0

def test_psi_different_distributions():
    x = np.random.normal(0, 1, 500)
    y = np.random.normal(3, 1, 500)           # shift 3 sigma
    assert compute_psi(x, y) > 0.2            # phải detect drift


# ml/tests/test_lstm_autoencoder.py
import torch
from ml.anomaly.lstm_autoencoder import LSTMAutoencoder, make_sequences
import numpy as np

def test_autoencoder_output_shape():
    model  = LSTMAutoencoder(n_features=9, hidden_dim=32, n_layers=1)
    x      = torch.randn(4, 20, 9)
    output = model(x)
    assert output.shape == (4, 20, 9)

def test_make_sequences_length():
    X    = np.random.randn(50, 9)
    seqs = make_sequences(X, seq_len=20)
    assert seqs.shape == (30, 20, 9)          # 50 - 20 = 30 sequences
```

**Cấu trúc test directory:**

```
ml/tests/
├── __init__.py
├── fixtures/
│   └── seed_duckdb.py        ← Tạo DuckDB test với 120 ngày data
├── test_feature_store.py
├── test_psi.py
├── test_lstm_autoencoder.py
└── test_isolation_forest.py
```

---

### 15.6 MLflow Model Registry — Staging → Production Lifecycle

Model sau khi train được đăng ký vào **MLflow Model Registry** với vòng đời `None → Staging → Production`. Staging là "sandbox kiểm tra", Production là model mà API đang serve.

```python
# ml/model_registry.py — bổ sung registry lifecycle
import mlflow
from mlflow.tracking import MlflowClient
from ml.backtesting import backtest_prophet

MLFLOW_TRACKING_URI = "sqlite:///data/mlflow.db"
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
client = MlflowClient()


def register_model(run_id: str, model_name: str, artifact_path: str) -> int:
    """
    Đăng ký model vào MLflow Model Registry với stage=None.
    Trả về version mới.
    """
    model_uri    = f"runs:/{run_id}/{artifact_path}"
    model_detail = mlflow.register_model(model_uri, model_name)
    version      = model_detail.version
    print(f"✅ Registered {model_name} v{version} (None stage)")
    return version


def promote_to_staging(model_name: str, version: int) -> None:
    """Chuyển model lên Staging — đang được test."""
    client.transition_model_version_stage(
        name=model_name, version=str(version), stage="Staging"
    )
    print(f"➡️  {model_name} v{version} → Staging")


def promote_to_production(model_name: str, version: int,
                          archive_existing: bool = True) -> None:
    """Chuyển model lên Production. Archive version cũ tự động."""
    if archive_existing:
        for mv in client.search_model_versions(f"name='{model_name}'"):
            if mv.current_stage == "Production":
                client.transition_model_version_stage(
                    name=model_name, version=mv.version, stage="Archived"
                )
                print(f"📦 Archived {model_name} v{mv.version}")

    client.transition_model_version_stage(
        name=model_name, version=str(version), stage="Production"
    )
    print(f"✅ {model_name} v{version} → Production")


def validate_and_promote_prophet(
    ticker: str,
    metric: str,
    version: int,
    mape_threshold: float = 15.0,
    coverage_threshold: float = 75.0,
) -> bool:
    """
    Chạy backtest trên Staging model.
    Pass → promote Production tự động.
    Fail → archive, giữ Production cũ.
    """
    model_name = f"prophet_{ticker}_{metric}"
    print(f"🔍 Validating {model_name} v{version}...")

    result = backtest_prophet(ticker, metric, n_splits=4, horizon=4)
    if "error" in result:
        print(f"❌ Backtest error: {result['error']}")
        return False

    mape     = result["avg_mape_pct"]
    coverage = result["avg_coverage"]
    print(f"   MAPE={mape}% (≤{mape_threshold}%), Coverage={coverage}% (≥{coverage_threshold}%)")

    # Tag metrics vào model version để xem trong MLflow UI
    client.set_model_version_tag(model_name, str(version), "avg_mape_pct", str(mape))
    client.set_model_version_tag(model_name, str(version), "avg_coverage",  str(coverage))

    if mape <= mape_threshold and coverage >= coverage_threshold:
        promote_to_production(model_name, version)
        return True
    else:
        client.transition_model_version_stage(
            name=model_name, version=str(version), stage="Archived"
        )
        print(f"⚠️  {model_name} v{version} FAILED — keeping previous Production")
        return False
```

**Dagster asset tích hợp full registry lifecycle:**

```python
# orchestration/assets/ml_assets.py — Prophet với registry
@asset(
    group_name="ml",
    deps=[gold_marts],
    description="Train → Register → Validate → Promote Prophet models",
)
def ml_prophet_with_registry(context: AssetExecutionContext) -> None:
    from ml.forecasting.prophet_forecaster import train_prophet_models
    from ml.model_registry import (
        log_prophet_run, register_model,
        promote_to_staging, validate_and_promote_prophet,
    )

    results  = train_prophet_models()
    promotions = {}

    for ticker, metrics in results.items():
        for metric, r in metrics.items():
            if "mape_pct" not in r:
                continue

            model_name = f"prophet_{ticker}_{metric}"

            # 1. Log experiment run
            run_id = log_prophet_run(ticker, metric, r)

            # 2. Register version mới (stage=None)
            version = register_model(
                run_id,
                model_name=model_name,
                artifact_path=f"ml/models/forecasting/prophet_{ticker}_{metric}.pkl",
            )

            # 3. Staging
            promote_to_staging(model_name, version)

            # 4. Backtest → Production nếu pass
            passed = validate_and_promote_prophet(
                ticker, metric, version,
                mape_threshold=15.0,
                coverage_threshold=75.0,
            )
            promotions[f"{ticker}/{metric}"] = {
                "version": version, "promoted": passed, "mape": r["mape_pct"],
            }

    context.log.info(f"Registry promotions: {promotions}")
    context.add_output_metadata({"promotions": str(promotions)})
```

**MLflow Model Registry — view trong UI:**

```
MLflow Model Registry (localhost:5000/models):
┌─────────────────────┬─────────┬────────────┬──────────────┐
│ Model Name          │ Version │ Stage      │ MAPE Tag     │
├─────────────────────┼─────────┼────────────┼──────────────┤
│ prophet_VCB_npl_... │ v3      │ Production │ MAPE=7.2%   │
│ prophet_VCB_npl_... │ v2      │ Archived   │ MAPE=9.1%   │
│ prophet_BID_nim_... │ v2      │ Production │ MAPE=6.8%   │
│ prophet_BID_nim_... │ v1      │ Archived   │ MAPE=11.3%  │
└─────────────────────┴─────────┴────────────┴──────────────┘
```

**Cập nhật `.github/workflows/` trong repo structure:**

```
finsight/
├── .github/
│   └── workflows/
│       └── ml_ci.yml              ← Trigger khi sửa ml/** hoặc agents/**
├── ml/
│   ├── tests/
│   │   ├── fixtures/
│   │   │   └── seed_duckdb.py
│   │   ├── test_feature_store.py
│   │   ├── test_psi.py
│   │   ├── test_lstm_autoencoder.py
│   │   └── test_isolation_forest.py
│   ...
```

**So sánh trước và sau khi thêm CI/CD + Registry:**

| Khía cạnh | Trước | Sau |
|---|---|---|
| Deploy model mới | Tay — copy file `.pkl` | Tự động sau backtest pass |
| Kiểm tra regression | Không có | `pytest` + MAPE gate trong CI |
| Rollback model xấu | Không có | `Archived` stage — promote lại v1 lệnh |
| Audit trail | MLflow run history | Registry version + stage transition history |
| MLOps level | Level 1 | **Level 2** |

