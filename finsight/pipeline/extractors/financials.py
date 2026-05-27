import pandas as pd
from datetime import date
from pydantic import BaseModel, field_validator
from vnstock import Vnstock
from .base import BaseExtractor

try:
    from pydantic import ConfigDict
except ImportError:
    ConfigDict = None





class FinancialRecord(BaseModel):
    ticker: str
    period: str
    year: int
    quarter: int
    nim: float
    npl_ratio: float
    car: float
    casa_ratio: float
    roe: float
    roa: float

    if ConfigDict:
        model_config = ConfigDict(extra='ignore')
    else:
        class Config:
            extra = 'ignore'


class FinancialsExtractor(BaseExtractor):
    """
    Kéo dữ liệu BCTC (Quý) cho 5 ngân hàng.
    """
    name        = "vn_financials"
    schema      = FinancialRecord

    def _safe_float(self, val) -> float:
        if pd.isna(val) or val is None: return 0.0
        try: return float(val)
        except: return 0.0

    def extract(self, run_date: date) -> pd.DataFrame:
        records = []
        # Lấy 5 ngân hàng lớn
        VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

        for ticker in VN_BANK_TICKERS:
            try:
                # Vnstock 4.0.4 dùng source VCI
                stock = Vnstock().stock(symbol=ticker, source="VCI")
                # Lấy dữ liệu với orient='report' theo docs
                df = stock.finance.ratio(period="quarter", lang="en")
                
                if df.empty or 'item_id' not in df.columns:
                    continue
                    
                # Xoay ngược bảng (Transpose)
                df = df.set_index('item_id')
                period_cols = [c for c in df.columns if '-Q' in str(c)]
                df_periods = df[period_cols].T
                
                for period_str, row in df_periods.iterrows():
                    year_str, q_str = str(period_str).split('-Q')
                    year = int(year_str)
                    quarter = int(q_str)
                    
                    if year < 2018:
                        continue
                        
                    records.append({
                        "ticker":    ticker,
                        "period":    period_str,
                        "year":      year,
                        "quarter":   quarter,
                        # Các chỉ số ngân hàng VCI không cấp, gán 0.0 để giữ Data Quality Schema
                        "nim":       self._safe_float(row.get("net_interest_margin", 0.0)),
                        "npl_ratio": self._safe_float(row.get("npl", 0.0)),
                        "car":       self._safe_float(row.get("car", 0.0)),
                        "casa_ratio": self._safe_float(row.get("casa_ratio", 0.0)),
                        "roe":       self._safe_float(row.get("roe", 0.0)),
                        "roa":       self._safe_float(row.get("roa", 0.0)),
                    })
                    
            except Exception as e:
                print(f"⚠️  {ticker} financials error: {e}")

        return pd.DataFrame(records)