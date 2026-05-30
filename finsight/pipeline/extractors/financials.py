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
    source_name = "vn_financials"
    schema      = FinancialRecord

    def _safe_float(self, val) -> float:
        if val is None or pd.isna(val): 
            return 0.0 
        try: 
            return float(val)
        except Exception: 
            return 0.0 

    def extract(self, run_date: date) -> pd.DataFrame:
        records = []
        # Lấy 5 ngân hàng lớn
        VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]

        from vnstock.api.financial import Finance

        for ticker in VN_BANK_TICKERS:
            try:
                # Sử dụng API mới của vnstock và nguồn KBS để lấy dữ liệu mới nhất
                f = Finance(source="kbs", symbol=ticker, period="quarter", get_all=True)
                df = f.ratio(lang="en")

                if df.empty or "item_id" not in df.columns:
                    print(f"[DEBUG] {ticker}: empty or missing item_id")
                    continue

                df = df.set_index("item_id")
                period_cols = [c for c in df.columns if "-Q" in str(c)]

                df_periods = df[period_cols].T

                for period_str, row in df_periods.iterrows():
                    # Xử lý các suffix lạ của KBS ví dụ: "2025-Q4_1"
                    clean_period = str(period_str).split("_")[0]
                    year_str, q_str = clean_period.split("-Q")
                    year = int(year_str)
                    quarter = int(q_str)

                    records.append({
                        "ticker": ticker,
                        "period": clean_period,
                        "year": year,
                        "quarter": quarter,
                        # Map đúng item_id của KBS. Những cái KBS thiếu (NPL, CASA) thì gán 0.0
                        "nim": self._safe_float(row.get("net_interest_margin_nim")),
                        "npl_ratio": 0.0, 
                        "car": self._safe_float(row.get("equity_total_assets")), # Dùng tỷ lệ vốn CSH/Tổng TS làm proxy
                        "casa_ratio": 0.0,
                        "roe": self._safe_float(row.get("roe")),
                        "roa": self._safe_float(row.get("roa")),
                    })

            except Exception as e:
                print(f"⚠️  {ticker} financials error: {e}")

        # Trả về Dataframe, tự động xóa các dòng trùng (ví dụ 2025-Q4 và 2025-Q4_1)
        final_df = pd.DataFrame(records)
        if not final_df.empty:
            final_df = final_df.drop_duplicates(subset=["ticker", "period"], keep="last")
            
        return final_df