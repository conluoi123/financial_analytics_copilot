# scripts/run_pipeline.py
from datetime import date

from scripts.run_bronze import run_all as run_bronze
from finsight.pipeline.transforms.silver_builder import run_silver, summarize_coverage
from finsight.pipeline.transforms.gold_builder import build_gold


def run_pipeline() -> None:
    print("=== STEP 1: BRONZE ===")
    run_bronze()

    print("\n=== STEP 2: SILVER ===")
    silver_out = run_silver()
    print(f"[OK] Silver market_daily: {len(silver_out['market_daily'])} rows")
    print(f"[OK] Silver financials_quarterly: {len(silver_out['financials_quarterly'])} rows")
    print(f"[OK] Silver macro_yearly: {len(silver_out['macro_yearly'])} rows")
    print(f"[OK] Silver silver_features: {len(silver_out['silver_features'])} rows")

    cov = summarize_coverage(silver_out["silver_features"])
    print(f"     Financial coverage: {cov['financial_coverage']:.2f}%")
    print(f"     Macro coverage: {cov['macro_coverage']:.2f}%")

    print("\n=== STEP 3: GOLD ===")
    gold_out = build_gold()
    print(f"[OK] Gold full: {len(gold_out['gold_full'])} rows")
    print(f"[OK] Gold fallback: {len(gold_out['gold_fallback'])} rows")
    print(f"[OK] Gold latest snapshot: {len(gold_out['gold_latest_snapshot'])} rows")

    print("\n=== DONE ===")
    print(f"Pipeline completed at: {date.today().isoformat()}")


if __name__ == "__main__":
    run_pipeline()