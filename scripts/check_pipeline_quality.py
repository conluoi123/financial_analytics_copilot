# scripts/check_pipeline_quality.py
import json, pandas as pd
from datetime import datetime

m = pd.read_parquet("data/silver/market_daily.parquet")
f = pd.read_parquet("data/silver/financials_quarterly.parquet")
g = pd.read_parquet("data/gold/gold_fallback.parquet")

report = {
  "generated_at": datetime.utcnow().isoformat(),
  "market_rows": len(m),
  "financial_rows": len(f),
  "gold_rows": len(g),
  "market_date_min": str(m["trade_date"].min()),
  "market_date_max": str(m["trade_date"].max()),
  "market_unique_violations": int(m.duplicated(["ticker","trade_date"]).sum()),
  "financial_unique_violations": int(f.duplicated(["ticker","period"]).sum()),
  "financial_coverage_pct": float(g[["nim","npl_ratio","car","casa_ratio","roe","roa"]].notna().any(axis=1).mean()*100),
}
with open("data/quality_report.json","w",encoding="utf-8") as fp:
    json.dump(report, fp, ensure_ascii=False, indent=2)
print(json.dumps(report, indent=2, ensure_ascii=False))