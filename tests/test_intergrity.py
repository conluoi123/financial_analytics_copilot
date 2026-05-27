# tests/test_integrity.py
import pandas as pd

def test_market_unique_key():
    df = pd.read_parquet("data/silver/market_daily.parquet")
    assert df.duplicated(["ticker","trade_date"]).sum() == 0

def test_financial_unique_key():
    df = pd.read_parquet("data/silver/financials_quarterly.parquet")
    assert df.duplicated(["ticker","period"]).sum() == 0