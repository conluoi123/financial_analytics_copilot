import pandas as pd
from datetime import date
from pydantic import BaseModel, field_validator
from vnstock3 import Vnstock
from .base import BaseExtractor

VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

'''
    - Vòng lặp qua danh sách các ngân hàng 
    - Gọi APi từ vnstock3. Sử dụng nguồn "VCI" để lấy báo cáo tài chính theo quý(quarter)
    - Lọc dữ liệu, nếu dữ liệu trước 2018 bỏ qua 
    - Chuẩn hóa dữ liệu: sử dụng _safe_float để đảm bảo an toàn. 
'''

class FinancialRecord(BaseModel):
    ticker:      str
    period:      str   
    year:        int
    quarter:     int
    nim:         float | None   
    npl_ratio:   float | None   
    car:         float | None   
    casa_ratio:  float | None   
    roe:         float | None   
    roa:         float | None   

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
