from pathlib import Path

import pandas as pd

from finsight.pipeline.transforms.silver_builder import FINANCIAL_METRICS

SILVER_DIR = Path("data/silver")
GOLD_DIR = Path("data/gold")


def ensure_gold_dir() -> None:
    GOLD_DIR.mkdir(parents=True, exist_ok=True)


def _add_market_features(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df

    out = df.sort_values(["ticker", "trade_date"]).copy()
    out["ret_1d"] = out.groupby("ticker")["close"].pct_change()
    out["ret_5d"] = out.groupby("ticker")["close"].pct_change(5)
    out["volatility_20d"] = out.groupby("ticker")["ret_1d"].rolling(20).std().reset_index(level=0, drop=True)
    out["volume_chg_5d"] = out.groupby("ticker")["volume"].pct_change(5)
    return out


def build_gold() -> dict[str, pd.DataFrame]:
    ensure_gold_dir()
    silver_path = SILVER_DIR / "silver_features.parquet"
    if not silver_path.exists():
        raise FileNotFoundError(f"Missing silver dataset: {silver_path}")

    df = pd.read_parquet(silver_path)
    if df.empty:
        empty = df.copy()
        empty.to_parquet(GOLD_DIR / "gold_full.parquet", index=False)
        empty.to_parquet(GOLD_DIR / "gold_fallback.parquet", index=False)
        empty.to_parquet(GOLD_DIR / "gold_latest_snapshot.parquet", index=False)
        return {"gold_full": empty, "gold_fallback": empty, "gold_latest_snapshot": empty}

    df["trade_date"] = pd.to_datetime(df["trade_date"], errors="coerce")
    df = df.dropna(subset=["ticker", "trade_date"]).sort_values(["ticker", "trade_date"]).reset_index(drop=True)
    featured = _add_market_features(df)

    fin_cols = [c for c in FINANCIAL_METRICS if c in featured.columns]
    has_financial = featured[fin_cols].notna().any(axis=1) if fin_cols else pd.Series(False, index=featured.index)

    gold_full = featured[has_financial].copy()
    gold_fallback = featured.copy()
    latest_idx = featured.groupby("ticker")["trade_date"].idxmax()
    latest_snapshot = featured.loc[latest_idx].sort_values("ticker").reset_index(drop=True)

    gold_full.to_parquet(GOLD_DIR / "gold_full.parquet", index=False)
    gold_fallback.to_parquet(GOLD_DIR / "gold_fallback.parquet", index=False)
    latest_snapshot.to_parquet(GOLD_DIR / "gold_latest_snapshot.parquet", index=False)

    return {
        "gold_full": gold_full,
        "gold_fallback": gold_fallback,
        "gold_latest_snapshot": latest_snapshot,
    }
