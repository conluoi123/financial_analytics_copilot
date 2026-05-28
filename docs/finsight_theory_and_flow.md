# FinSight — Lý Thuyết Cần Nắm & Flow Tổng Thể Trước Khi Code

> Đọc tài liệu này **trước** khi đọc code. Mỗi khái niệm được giải thích theo kiểu "tại sao tồn tại" thay vì chỉ "là gì".

---

## 📐 Flow Tổng Thể — Một Câu Hỏi Đi Qua Hệ Thống

```
User nhập: "NPL của VCB có bất thường không tuần này?"
                │
                ▼
        ┌──────────────┐
        │  FastAPI      │  Xác thực JWT → forward đến LangGraph
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │ LangGraph     │  classify() → intent = "anomaly"
        │ State Machine │
        └──────┬───────┘
               │
               ▼
        ┌──────────────────────────────────────┐
        │ Anomaly Agent                         │
        │  ├─ Fast path: SQL z-score (< 1ms)   │
        │  ├─ Isolation Forest (10ms, joblib)   │
        │  └─ LSTM Autoencoder (50ms, PyTorch)  │
        │  → Ensemble 2/3 votes                │
        └──────┬───────────────────────────────┘
               │ anomalies list
               ▼
        ┌──────────────┐
        │ Narrator      │  LLM viết narrative từ data
        └──────┬───────┘
               │
               ▼
        ┌──────────────┐
        │  FastAPI      │  Return JSON → Frontend
        └──────────────┘

Parallel background pipeline (Dagster, 18:00 hàng ngày):

SOURCE DATA                BRONZE              SILVER              GOLD
vnstock ─────────────────► Delta Lake ────────► dbt staging ──────► dbt marts
World Bank API             (append-only,        (clean, typed,       (z-score,
                           ACID, time travel)    deduped, tested)     join, agg)
                                                      │
                                           GE checkpoint
                                           fail → abort Gold
```

---

## 🗂️ Layer 1 — Data Engineering

### 1.1 Medallion Architecture (Bronze / Silver / Gold)

**Tại sao cần 3 tầng thay vì 1?**

Nguyên tắc: **separation of concerns**.

| Layer      | Câu hỏi trả lời                    | Bất biến                    |
| ---------- | ---------------------------------- | --------------------------- |
| **Bronze** | "Data gốc trông như thế nào?"      | Không bao giờ sửa raw data  |
| **Silver** | "Data sạch và đáng tin cậy không?" | Đã validate, typed, deduped |
| **Gold**   | "Business muốn thấy gì?"           | Pre-aggregated, ML-ready    |

**Mental model:** Bronze là bản sao gốc của sự thật. Silver là sự thật đã được làm sạch. Gold là sự thật được diễn giải theo góc nhìn business.

Nếu bạn chỉ có 1 tầng → khi data source thay đổi format, bạn không biết raw data gốc trông như thế nào nữa. Bronze giải quyết vấn đề này.

---

### 1.2 Delta Lake — ACID trên file system

**Tại sao Parquet thô không đủ?**

Parquet là định dạng file. Nó không có khái niệm "transaction". Nếu pipeline crash giữa chừng khi đang ghi 1000 files → bạn có thể còn 600 files valid + 400 files corrupt → không phân biệt được.

**Delta Lake giải quyết bằng cách:**

```
data/bronze/vn_stocks/
├── _delta_log/              ← Transaction log (JSON)
│   ├── 00000000000000000000.json   ← "Commit 0: add file A, B, C"
│   ├── 00000000000000000001.json   ← "Commit 1: add file D, E"
│   └── ...
├── part-00000-abc.parquet   ← File A
├── part-00001-def.parquet   ← File B
...
```

Mỗi write là 1 atomic commit vào `_delta_log`. Nếu crash → log chưa commit → Delta tự động ignore. Read luôn đọc từ log → consistent view.

**4 tính chất ACID:**

- **Atomicity**: Write thành công hết hoặc không có gì (không bao giờ partial)
- **Consistency**: Schema validation, constraints không bị vi phạm
- **Isolation**: Concurrent reads không thấy incomplete writes
- **Durability**: Một khi committed, data tồn tại dù system crash

**Time travel:** Mỗi commit có version number. `load_as_version(5)` → đọc đúng state tại version 5. Dùng để debug "data hôm qua trông như thế nào."

**Schema evolution:** `schema_mode=merge` → khi source thêm cột mới, Delta tự add cột đó (với giá trị NULL cho records cũ) thay vì crash.

---

### 1.3 dbt — SQL-based Transform với Lineage

**Tại sao không dùng Pandas script?**

Vấn đề của Pandas script: không có dependency tracking, không có testing built-in, không có lineage.

```python
# Pandas approach — không biết script nào phụ thuộc script nào
df1 = transform_stocks(raw)
df2 = transform_financials(raw)
df3 = join(df1, df2)  # Nếu df2 fail, df3 vẫn có thể chạy với stale data
```

**dbt giải quyết:**

```sql
-- mart_bank_perf.sql
SELECT * FROM {{ ref('stg_stocks') }}  -- ref() tạo dependency graph
JOIN  {{ ref('stg_financials') }} ...  -- dbt biết phải chạy staging trước
```

`ref()` không chỉ là string reference. dbt compile nó thành dependency graph (DAG). Nếu `stg_financials` fail → `mart_bank_perf` không chạy.

**Materialization:**

- `view` (Silver): SQL được execute mỗi khi query → luôn fresh, không tốn storage
- `table` (Gold): SQL được execute 1 lần, kết quả lưu vào bảng → query nhanh hơn, tốn storage

**dbt tests:** Khai báo constraint trong YAML, dbt generate SQL test tự động:

```yaml
- name: ticker
  tests:
    - not_null
    - accepted_values:
        values: ["VCB", "BID"]
# dbt generates: SELECT count(*) FROM stg_stocks WHERE ticker NOT IN ('VCB','BID')
```

---

### 1.3b Thực tế phỏng vấn: Python Prototype vs dbt Production

Trong quá trình xây dựng dự án thực tế, bạn sẽ thường thấy **2 pipeline chạy song song**:
1. **Pipeline "Cây nhà lá vườn" (Python thuần):** Dùng Pandas đọc Bronze → ghi thẳng ra file Parquet (ví dụ: `silver_builder.py`). Dùng để *Prototype* nhanh, test logic nối bảng, xem mặt mũi data. Nhược điểm: khó scale, không test tự động, không có lineage SQL.
2. **Pipeline "Chuẩn Industry / NAB" (dbt + DuckDB):** Dịch toàn bộ logic Pandas sang SQL. dbt đọc trực tiếp từ thư mục Bronze (thông qua `warehouse.py`), chạy SQL tạo Silver views, test data bằng YAML, rồi tiếp tục chạy SQL tạo Gold tables lưu thẳng vào DuckDB.

**Tại sao phải làm cả hai mà không vào thẳng dbt?**
- **Data Reconciliation (Đối soát dữ liệu):** Để chứng minh câu SQL của bạn viết đúng, bạn phải so sánh output của DuckDB (dbt) với output của thư mục Parquet (Python). Nếu khớp 100% → chuyển đổi thành công. Đây là kỹ năng cực kỳ quan trọng trong ngành tài chính.
- **Điểm cộng "Flexing" khi phỏng vấn:** Khi được hỏi *"Tại sao không dùng Python cho lẹ?"*, câu trả lời ăn điểm tuyệt đối là: *"Lúc đầu em dùng Python thuần để prototype nhanh. Nhưng khi lượng data lớn và team cần quản lý chất lượng tự động, em nhận ra script Python rất khó bảo trì. Nên em quyết định refactor toàn bộ Silver và Gold layer sang dbt. Nhờ vậy em áp dụng được Data Quality Test tự động và Lineage rõ ràng."* Khả năng nhìn ra "nỗi đau" của architecture cũ và chủ động migrate sang tool chuẩn là tư duy của một kỹ sư thực thụ.

---

### 1.4 DuckDB — OLAP trong Process

**OLTP vs OLAP — hai mental model khác nhau:**

|            | OLTP (PostgreSQL, MySQL) | OLAP (DuckDB, ClickHouse)     |
| ---------- | ------------------------ | ----------------------------- |
| Workload   | Nhiều transactions nhỏ   | Ít queries lớn                |
| Tối ưu cho | INSERT/UPDATE nhanh      | SELECT với aggregation        |
| Storage    | Row-oriented             | Column-oriented               |
| Ví dụ      | "Thêm 1 giao dịch"       | "AVG NIM của VCB trong 2 năm" |

**Tại sao DuckDB cho project này?**

Queries của project (AVG, STDDEV, WINDOW FUNCTION, JOIN across 5 tickers) là OLAP queries. DuckDB columnar storage đọc chỉ những columns cần thiết → 10-100x nhanh hơn PostgreSQL trên cùng query. Zero-server, in-process → không cần manage database server riêng.

**Window functions** (quan trọng cho z-score):

```sql
AVG(close_price) OVER (
    PARTITION BY ticker          -- tính riêng cho mỗi ticker
    ORDER BY trade_date
    ROWS BETWEEN 29 PRECEDING    -- 30 ngày rolling window
         AND CURRENT ROW
)
```

---

### 1.5 Dagster — Asset-centric Orchestration

**Task-centric (Airflow/Prefect) vs Asset-centric (Dagster):**

```
# Task-centric thinking:
"Chạy extract() → transform() → load() theo thứ tự"

# Asset-centric thinking:
"bronze_vn_stocks là data asset.
 silver_staging phụ thuộc vào bronze_vn_stocks.
 gold_marts phụ thuộc vào silver_staging."
```

Asset-centric quan trọng vì:

- Dagster biết "asset này đã được materialize chưa?" và "fresh đến khi nào?"
- Có thể backfill riêng 1 asset mà không re-run toàn bộ pipeline
- UI hiện lineage graph (Bronze→Silver→Gold→ML) trực quan

**Software-defined assets:**

```python
@asset(deps=[bronze_vn_stocks, bronze_vn_financials])
def silver_staging() -> None: ...
# Dagster tự biết silver_staging cần bronze data → chạy bronze assets trước
```

---

## 🤖 Layer 2 — Machine Learning Algorithms

### 2.1 Isolation Forest — Anomaly Detection

**Ý tưởng core:** Anomaly dễ bị "cô lập" hơn normal points.

```
Normal point:  cần nhiều lần split mới cô lập được (path length dài)
Anomaly point: chỉ cần vài lần split là cô lập được (path length ngắn)
```

**Thuật toán:**

1. Random chọn 1 feature và 1 split value trong range của feature đó
2. Split data thành 2 nhánh
3. Lặp lại đệ quy → tạo thành Binary Tree
4. Path length = số lần split để cô lập 1 điểm

**Anomaly score:**

```
score(x) = 2^(- E[h(x)] / c(n))

h(x) = path length của điểm x
c(n) = average path length của random BST với n samples
```

Điểm càng gần -1 → càng bất thường. Điểm gần 0 → bình thường.

**`n_estimators=200`:** Train 200 random trees, lấy average path length → ổn định hơn.

**`contamination=0.05`:** Kỳ vọng 5% data là anomaly. Dùng để set threshold cho `predict()` (trả -1 hoặc 1). `score_samples()` luôn trả continuous score dù contamination là gì.

**Tại sao cần Standardization trước IF?**
IF dùng random split range → feature có scale lớn hơn (volume=1,000,000) sẽ dominate feature scale nhỏ (pct_change=3.5). StandardScaler chuẩn hóa mean=0, std=1 cho tất cả features.

---

### 2.2 LSTM — Long Short-Term Memory

**Tại sao RNN thông thường không đủ?**

RNN thông thường bị **vanishing gradient**: khi backpropagation qua nhiều time steps, gradient nhân lên nhiều lần → gradient gần 0 → model không học được long-range dependency.

**LSTM giải quyết bằng Cell State (băng chuyền thông tin):**

```
            forget gate    input gate    output gate
               │               │              │
Cell state ───►[✕]──────────►[+]──────────────────────► Cell state t+1
                              ▲
                         [tanh] * [σ]
                          new info
```

**3 gates của LSTM:**

1. **Forget gate** `f_t = σ(W_f · [h_{t-1}, x_t] + b_f)`: Quyết định bao nhiêu information từ cell state cũ cần quên (0 = quên hết, 1 = giữ tất cả)
2. **Input gate** `i_t = σ(W_i · [h_{t-1}, x_t] + b_i)`: Quyết định update gì vào cell state mới
3. **Output gate** `o_t = σ(W_o · [h_{t-1}, x_t] + b_o)`: Quyết định output từ cell state hiện tại

**Mental model cho LSTM Autoencoder:**

- **Encoder**: Compress sequence 20 ngày → vector bottleneck (hidden state cuối)
- **Decoder**: Reconstruct lại sequence từ bottleneck

Nếu model được train trên "normal" data → reconstruction error thấp với normal sequences. Sequence bất thường → model không reconstruct được tốt → reconstruction error cao → flag as anomaly.

**Reconstruction error:**

```python
error = mean((reconstructed - original)^2)  # MSE per sequence
# Threshold = mean(training errors) + 3 * std(training errors)
# → Anomaly nếu error > threshold
```

---

### 2.3 Prophet — Bayesian Time Series Forecasting

**Ý tưởng core:** Decompose time series thành các components có ý nghĩa:

```
y(t) = trend(t) + seasonality(t) + holidays(t) + noise(t)
```

**Trend component:**

```
k(t) = k + a(t)ᵀδ   (piecewise linear)
```

Prophet tự động tìm changepoints (điểm thay đổi trend) bằng sparse prior (L1 regularization). `changepoint_prior_scale=0.05` → conservative, ít changepoints.

**Seasonality component (Fourier series):**

```
s(t) = Σ [a_n*cos(2πnt/P) + b_n*sin(2πnt/P)]
```

`fourier_order=3` → dùng 3 pairs của sin/cos để approximate seasonal pattern. Cao hơn = flexible hơn nhưng dễ overfit.

**Tại sao Prophet phù hợp với quarterly NIM/NPL?**

- Chỉ cần 8+ data points (8 quarters = 2 năm)
- Handle missing quarters (không phải mọi ngân hàng report đúng hạn)
- 95% CI tự động → không cần bootstrap riêng
- Quarterly banking cycle (Q1 thường thấp NPL vì banks mới clean portfolio) được capture qua `add_seasonality(period=91.25)`

**Walk-forward validation vs Cross-validation:**

```
Standard k-fold (SAI cho time series):
Train: [1,3,5,7,9], Test: [2,4,6,8,10]  ← Future leak vào training!

Walk-forward (đúng):
Fold 1: Train [1..8],  Test [9,10,11,12]
Fold 2: Train [1..10], Test [11,12,13,14]  ← Expanding window
Fold 3: Train [1..12], Test [13,14,15,16]
```

---

### 2.4 LSTM Price Forecasting

**Sequence-to-sequence vs Many-to-one:**

```
Many-to-one (project này):
[day1, day2, ..., day30] → [day31, day32, ..., day37]

Input: SEQ_LEN=30, Output: PRED_LEN=7
Architecture: LSTM → FC layer → 7 outputs
```

**Feature engineering tại sao cần RSI, MACD?**

Raw OHLCV không đủ để capture market regime:

- **RSI-14**: Đo overbought/oversold. RSI > 70 → overbought (giá có thể drop). RSI < 30 → oversold (giá có thể bounce). Formula: `100 - 100/(1 + RS)` với `RS = avg_gain_14 / avg_loss_14`
- **MACD**: EMA12 - EMA26. Khi MACD cross signal line (EMA9 của MACD) → trend change signal

**Gradient clipping:** `clip_grad_norm_(model.parameters(), 1.0)` → nếu gradient norm > 1 thì scale xuống. Ngăn exploding gradient (ngược với vanishing gradient).

**`ReduceLROnPlateau`:** Nếu validation loss không giảm sau `patience=10` epochs → chia learning rate cho 10. Tránh stuck tại local minima.

**MinMaxScaler cho price:** `[0, 1]` range. Quan trọng: phải fit scaler trên training set, chỉ `transform()` trên validation/test. Nếu fit trên full data → future data leak vào normalization.

**Hai scaler riêng biệt cho feature và target:**

```python
feature_scaler = MinMaxScaler()  # Cho input features (OHLCV + indicators)
target_scaler  = MinMaxScaler()  # Cho target (close_price)
# Inverse transform khi predict: target_scaler.inverse_transform(pred_scaled)
```

---

### 2.5 PSI — Population Stability Index

**Ý tưởng:** So sánh "shape" của distribution giữa 2 thời điểm.

**Formula:**

```
PSI = Σ [(Actual% - Expected%) × ln(Actual% / Expected%)]
```

**Cách tính:**

1. Chia expected distribution thành 10 bins (percentile-based)
2. Đếm % actual points trong mỗi bin
3. Tính PSI per bin, sum lại

**Tại sao KL divergence thay vì simple mean/std comparison?**
KL divergence (và PSI là variant của nó) capture toàn bộ shape change của distribution, không chỉ shift. Nếu distribution bimodal → mean có thể unchanged nhưng shape hoàn toàn khác.

**Thresholds:**

- PSI < 0.1: Distribution stable → model vẫn valid
- 0.1 ≤ PSI < 0.2: Moderate change → monitor closely
- PSI ≥ 0.2: Significant shift → retrain required

---

## 🧠 Layer 3 — LLM Agent

### 3.1 LangGraph — State Machine cho Agent

**Tại sao State Machine thay vì simple function chain?**

Với function chain: `extract → classify → answer`. Không thể handle:

- Retry logic khi SQL fail (loop lại classify với error message)
- Branching (khác nhau cho anomaly vs forecast vs query)
- Shared state giữa các nodes

LangGraph dùng **typed state dict** được pass qua các nodes:

```python
class AgentState(TypedDict):
    question:  str        # Input gốc
    intent:    str        # Sau classify node
    sql:       str | None # Sau query node
    anomalies: list | None # Sau anomaly node
    narrative: str | None # Sau narrator node
```

**Conditional edges:**

```python
builder.add_conditional_edges(
    "classify",
    lambda s: s["intent"],  # Routing function
    {"query": "query", "anomaly": "anomaly", ...}
)
```

---

### 3.2 NL → SQL — Semantic Layer

**Tại sao không cho LLM query thẳng DB?**

LLM không biết: column names, data types, business rules (NIM > 0 là positive, NPL > 3% là warning). Semantic layer cung cấp context này.

```
User: "NPL của VCB có cao không?"
       │
       ▼
SQL_PROMPT system message có chứa:
- Schema của mart_bank_perf (column names + descriptions)
- Business rules: "npl_ratio_pct > 3 is warning, > 5 is critical"
- Thresholds: "Basel III CAR minimum = 8%"
       │
       ▼
LLM generate SQL với đầy đủ context
```

**Retry logic:** Nếu SQL fail (syntax error hoặc query error) → append error message vào question → retry tối đa 3 lần. LLM học từ error để fix SQL.

---

### 3.3 JWT Authentication

**Tại sao JWT thay vì session-based auth?**

Session-based: server lưu session → stateful → không scale horizontally.
JWT: token chứa claims (user_id, role, exp) → server verify signature → stateless.

**Structure:** `header.payload.signature`

- Header: algorithm (HS256)
- Payload: `{"sub": "u1", "role": "analyst", "exp": 1234567890}`
- Signature: `HMAC_SHA256(base64(header) + "." + base64(payload), SECRET_KEY)`

Verify: recompute signature với SECRET_KEY, so sánh. Nếu khớp → token valid, payload trustworthy.

---

## 🔄 Layer 4 — MLOps

### 4.1 MLflow — Experiment Tracking

**Tại sao cần experiment tracking?**

Sau 10 lần train IF với contamination khác nhau, bạn không nhớ run nào có anomaly_rate tốt nhất. MLflow log tất cả:

- **Params**: Hyperparameters (contamination, n_estimators)
- **Metrics**: Performance (anomaly_rate, mape, val_loss)
- **Artifacts**: Model files (.pkl, .pt)
- **Tags**: Metadata (model_type, ticker)

**Model Registry vs Experiment Tracking:**

- Experiments: "Log mọi thứ khi train"
- Registry: "Promote model nào lên production?"

Registry có stage lifecycle: `None → Staging → Production → Archived`

---

### 4.2 CI/CD cho ML — Khác gì Software CI/CD?

Software CI/CD: test code correctness (unit tests, lint).

**ML CI/CD cần thêm:**

- Test model performance (MAPE gate: nếu MAPE tăng sau code change → fail CI)
- Test data pipeline (feature engineering cho ra output đúng shape, no NaN)
- Integration test (API endpoint trả anomalies list hợp lệ)

**MAPE gate trong CI:**

```python
if mape > 20:
    sys.exit(1)  # CI fail → không merge code
```

Nếu ai đó sửa feature engineering và làm MAPE tăng → CI bắt được ngay.

---

## 📊 Dependency Map — Học Gì Trước

```
Bắt buộc hiểu trước khi code:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BRONZE LAYER:
  └─ ACID transaction concept
  └─ Parquet format basics
  └─ Delta Lake = Parquet + _delta_log
  └─ Pydantic schema validation

SILVER LAYER:
  └─ SQL window functions (PARTITION BY, ROWS BETWEEN)
  └─ dbt ref() và dependency graph
  └─ Data quality testing (not_null, accepted_values)

GOLD LAYER:
  └─ Z-score formula: (x - mean) / std
  └─ Rolling window statistics
  └─ Star schema / mart concept

ML LAYER:
  └─ Isolation Forest: random tree + path length
  └─ LSTM: gates concept (forget/input/output)
  └─ Autoencoder: encode → bottleneck → decode
  └─ Prophet: additive decomposition
  └─ StandardScaler vs MinMaxScaler (khi dùng cái nào)
  └─ Walk-forward validation (không phải k-fold)
  └─ PSI formula

AGENT LAYER:
  └─ LLM prompting (system vs user message)
  └─ State machine concept
  └─ JWT structure (header.payload.signature)

MLOPS:
  └─ Experiment vs Registry
  └─ Stage lifecycle (None→Staging→Production→Archived)
  └─ CI/CD pipeline: trigger → jobs → steps
```

---

## 🎯 Câu Hỏi Tự Kiểm Tra Trước Khi Code

**DE Layer:**

- [ ] ACID là gì? Tại sao Parquet thô không đủ cho Bronze?
- [ ] Time travel trong Delta Lake hoạt động như thế nào?
- [ ] `ref()` trong dbt làm gì khác so với chỉ hard-code table name?
- [ ] Tại sao Silver dùng `view`, Gold dùng `table`?
- [ ] Window function: giải thích `ROWS BETWEEN 29 PRECEDING AND CURRENT ROW`

**ML Layer:**

- [ ] Tại sao path length ngắn = anomaly trong Isolation Forest?
- [ ] Forget gate trong LSTM quyết định điều gì?
- [ ] LSTM Autoencoder: tại sao reconstruction error cao = anomaly?
- [ ] Prophet decompose time series thành mấy components?
- [ ] Tại sao time series KHÔNG thể dùng random k-fold?
- [ ] PSI = 0.25 nghĩa là gì? Hành động gì cần làm?
- [ ] Tại sao cần 2 scaler riêng (feature + target) trong LSTM price?

**Agent Layer:**

- [ ] State machine: tại sao dùng thay vì simple if-else?
- [ ] Semantic layer giải quyết vấn đề gì mà LLM không tự biết?
- [ ] JWT: server verify token mà không cần query database như thế nào?

**MLOps:**

- [ ] Experiment tracking khác gì Model Registry?
- [ ] Tại sao ML CI/CD cần MAPE gate mà software CI/CD không cần?
- [ ] Rollback model trong MLflow Registry làm thế nào?

---

## 🗺️ Đọc Code Theo Thứ Tự Nào

```
1. pipeline/extractors/base.py      → Hiểu pattern BaseExtractor
2. pipeline/extractors/market.py    → Concrete extractor (vnstock)
3. pipeline/delta_writer.py         → Delta write logic
4. dbt_project/models/staging/      → SQL transform (stg_stocks.sql)
5. dbt_project/models/marts/        → Gold aggregation
6. ml/feature_store.py              → Feature engineering
7. ml/anomaly/isolation_forest.py   → IF trainer
8. ml/anomaly/lstm_autoencoder.py   → LSTM AE
9. ml/forecasting/prophet_forecaster.py → Prophet
10. backend/agents/anomaly_agent.py → Ensemble logic
11. backend/agents/graph.py         → LangGraph state machine
12. backend/main.py                 → API endpoints
13. orchestration/assets/           → Dagster assets (orchestration)
14. ml/model_registry.py            → MLflow lifecycle
```

> **Tip:** Khi đọc code, luôn hỏi "data này ở đâu ra?" và "output này đi đâu?" để hiểu flow. Đừng đọc từng dòng code trước khi hiểu context.

| Chỉ số       | Ý nghĩa                                   |
| ------------ | ----------------------------------------- |
| `nim`        | Net Interest Margin, biên lãi ròng        |
| `npl_ratio`  | Tỷ lệ nợ xấu                              |
| `car`        | Capital Adequacy Ratio, tỷ lệ an toàn vốn |
| `casa_ratio` | Tỷ lệ tiền gửi không kỳ hạn               |
| `roe`        | Lợi nhuận trên vốn chủ sở hữu             |
| `roa`        | Lợi nhuận trên tổng tài sản               |
