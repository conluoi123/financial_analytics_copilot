# tests/test_business_rules.py
import pandas as pd

def test_prices_positive():
    df = pd.read_parquet("data/silver/market_daily.parquet")
    assert (df["open"] > 0).all()
    assert (df["high"] > 0).all()
    assert (df["low"] > 0).all()
    assert (df["close"] > 0).all()

def test_quarter_range():
    df = pd.read_parquet("data/silver/financials_quarterly.parquet")
    assert df["quarter"].between(1,4).all()