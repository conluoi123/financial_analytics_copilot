from pathlib import Path

import pandas as pd

from finsight.pipeline.writers.bronze_writer import read_bronze

SILVER_DIR = Path("data/silver")
FINANCIAL_METRICS = ["nim", "npl_ratio", "car", "casa_ratio", "roe", "roa"]
MACRO_METRICS = ["inflation_pct", "lending_rate_pct", "gdp_growth_pct", "npl_to_gdp_pct"]


def ensure_silver_dir() -> None:
    SILVER_DIR.mkdir(parents=True, exist_ok=True)


def build_silver_market() -> pd.DataFrame:
    df = read_bronze("vn_stocks")
    if df.empty:
        return df

    df = df.copy()
    df["trade_date"] = pd.to_datetime(df["trade_date"], errors="coerce")
    df["_ingested_at"] = pd.to_datetime(df.get("_ingested_at"), errors="coerce")
    df = df.dropna(subset=["trade_date", "ticker"]).sort_values("_ingested_at")
    df = df.drop_duplicates(subset=["ticker", "trade_date"], keep="last")

    df["year"] = df["trade_date"].dt.year.astype(int)
    df["quarter"] = df["trade_date"].dt.quarter.astype(int)
    df["month"] = df["trade_date"].dt.month.astype(int)

    cols = [
        "trade_date", "ticker", "bank_name", "year", "quarter", "month",
        "open", "high", "low", "close", "volume", "pct_change", "_ingested_at",
    ]
    out = df[[c for c in cols if c in df.columns]].sort_values(["ticker", "trade_date"]).reset_index(drop=True)
    out.to_parquet(SILVER_DIR / "market_daily.parquet", index=False)
    return out


def build_silver_financials() -> pd.DataFrame:
    df = read_bronze("vn_financials")
    if df.empty:
        return df

    df = df.copy()
    df["_ingested_at"] = pd.to_datetime(df.get("_ingested_at"), errors="coerce")
    for col in ["year", "quarter"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna(subset=["ticker", "period", "year", "quarter"]).sort_values("_ingested_at")
    df = df.drop_duplicates(subset=["ticker", "period"], keep="last")

    for metric in FINANCIAL_METRICS:
        if metric in df.columns:
            df[metric] = pd.to_numeric(df[metric], errors="coerce")

    cols = ["ticker", "period", "year", "quarter", *FINANCIAL_METRICS, "_ingested_at"]
    out = df[[c for c in cols if c in df.columns]].sort_values(["ticker", "year", "quarter"]).reset_index(drop=True)
    out.to_parquet(SILVER_DIR / "financials_quarterly.parquet", index=False)
    return out


def build_silver_macro() -> pd.DataFrame:
    df = read_bronze("world_bank")
    if df.empty:
        return df

    df = df.copy()
    df["_ingested_at"] = pd.to_datetime(df.get("_ingested_at"), errors="coerce")
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")

    df = df.dropna(subset=["indicator_name", "year", "value"]).sort_values("_ingested_at")
    df = df.drop_duplicates(subset=["indicator_name", "year"], keep="last")

    wide = df.pivot_table(index="year", columns="indicator_name", values="value", aggfunc="last").reset_index().rename_axis(None, axis=1)
    wide["year"] = wide["year"].astype(int)
    wide = wide.sort_values("year").reset_index(drop=True)
    wide.to_parquet(SILVER_DIR / "macro_yearly.parquet", index=False)
    return wide


def build_silver_features(market_df: pd.DataFrame, financials_df: pd.DataFrame, macro_df: pd.DataFrame) -> pd.DataFrame:
    if market_df.empty:
        return market_df

    features = market_df.copy()
    if not financials_df.empty:
        fin = financials_df.copy()
        fin["year"] = fin["year"].astype(int)
        fin["quarter"] = fin["quarter"].astype(int)
        features = features.merge(fin.drop(columns=["_ingested_at"], errors="ignore"), on=["ticker", "year", "quarter"], how="left")

    if not macro_df.empty:
        macro = macro_df.copy()
        macro["year"] = macro["year"].astype(int)
        features = features.merge(macro, on="year", how="left")

    features = features.sort_values(["ticker", "trade_date"]).reset_index(drop=True)
    features.to_parquet(SILVER_DIR / "silver_features.parquet", index=False)
    return features


def run_silver() -> dict[str, pd.DataFrame]:
    ensure_silver_dir()
    market_df = build_silver_market()
    financials_df = build_silver_financials()
    macro_df = build_silver_macro()
    features_df = build_silver_features(market_df, financials_df, macro_df)
    return {
        "market_daily": market_df,
        "financials_quarterly": financials_df,
        "macro_yearly": macro_df,
        "silver_features": features_df,
    }


def summarize_coverage(features_df: pd.DataFrame) -> dict[str, float]:
    if features_df.empty:
        return {"financial_coverage": 0.0, "macro_coverage": 0.0}

    fin_cols = [c for c in FINANCIAL_METRICS if c in features_df.columns]
    macro_cols = [c for c in MACRO_METRICS if c in features_df.columns]

    financial_coverage = features_df[fin_cols].notna().any(axis=1).mean() * 100 if fin_cols else 0.0
    macro_coverage = features_df[macro_cols].notna().any(axis=1).mean() * 100 if macro_cols else 0.0

    return {"financial_coverage": float(financial_coverage), "macro_coverage": float(macro_coverage)}
