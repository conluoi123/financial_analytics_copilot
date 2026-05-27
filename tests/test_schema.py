# tests/test_schema.py
import pandas as pd

def test_silver_market_schema():
    df = pd.read_parquet("data/silver/market_daily.parquet")
    required = {"trade_date","ticker","open","high","low","close","volume","year","quarter"}
    assert required.issubset(df.columns)
    assert df["trade_date"].notna().all()