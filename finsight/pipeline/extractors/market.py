import pandas as pd
from datetime import date, timedelta
from pydantic import BaseModel, field_validator
from vnstock import Vnstock
from .base import BaseExtractor

try:
    # vnstock new API (recommended)
    from vnstock.api.quote import Quote
except Exception:
    Quote = None
    # Backward-compatible fallback for older envs
    from vnstock import Vnstock

VN_BANK_TICKERS = {
    "VCB": "Vietcombank",
    "BID": "BIDV",
    "CTG": "VietinBank",
    "MBB": "MB Bank",
    "TCB": "Techcombank",
}
'''
    Lấy dữ liệu giá cổ phiếu ngân hàng Việt Nam trong một năm gần nhất. 
    Chuẩn hóa dữ liệu thành Dataframe. 
    Kiểm tra schema bằng Pydantic 
    Trả về dữ liệu sạch cho pipeline. 
'''
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
        # Lấy từ đầu năm 2018 để đồng bộ với dữ liệu báo cáo tài chính và vĩ mô
        start   = "2018-01-01"
        end     = run_date.strftime("%Y-%m-%d")
        records = []

        for ticker, bank_name in VN_BANK_TICKERS.items():
            try:
                if Quote is not None:
                    quote = Quote(symbol=ticker, source="VCI")
                    hist = quote.history(start=start, end=end, interval="1D")
                else:
                    stock = Vnstock().stock(symbol=ticker, source="VCI")
                    hist = stock.quote.history(start=start, end=end, interval="1D")

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
