import re
from datetime import date

import pandas as pd
from pydantic import BaseModel, ConfigDict, field_validator

from .base import BaseExtractor

try:
    # Recommended API from vnstock >= 4
    from vnstock.api.financial import Finance
except Exception:
    Finance = None
    from vnstock import Vnstock


VN_BANK_TICKERS = ["VCB", "BID", "CTG", "MBB", "TCB"]


class FinancialRecord(BaseModel):
    ticker: str
    period: str
    year: int
    quarter: int
    nim: float | None
    npl_ratio: float | None
    car: float | None
    casa_ratio: float | None
    roe: float | None
    roa: float | None

    model_config = ConfigDict(extra="ignore")

    @field_validator("npl_ratio")
    @classmethod
    def npl_range(cls, v):
        if v is not None and not (0 <= v <= 30):
            raise ValueError(f"NPL ratio {v} out of range [0,30]")
        return v


class FinancialsExtractor(BaseExtractor):
    source_name = "vn_financials"
    schema = FinancialRecord

    FIELD_ALIASES = {
        "nim": ["nim", "netinterestmargin", "net_interest_margin"],
        "npl_ratio": ["nplratio", "npl", "baddebtpercentage", "bad_debt_percentage"],
        "car": ["car", "capitaladequacyratio", "capital_adequacy_ratio"],
        "casa_ratio": ["casaratio", "casa_ratio"],
        "roe": ["roe"],
        "roa": ["roa"],
    }

    @staticmethod
    def _safe_float(val) -> float | None:
        if pd.isna(val) or val is None:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _norm(col: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(col).lower())

    def _pick_value(self, row: pd.Series, key: str) -> float | None:
        aliases = self.FIELD_ALIASES[key]
        row_map = {self._norm(c): c for c in row.index}
        for alias in aliases:
            col = row_map.get(self._norm(alias))
            if col is not None:
                return self._safe_float(row.get(col))
        return None

    @staticmethod
    def _parse_period(period_val, year_val, quarter_val) -> tuple[str | None, int | None, int | None]:
        # Preferred: period like "2024-Q3"
        if period_val is not None and str(period_val).strip():
            m = re.match(r"^\s*(\d{4})\s*[-_/ ]?\s*Q([1-4])\s*$", str(period_val), flags=re.IGNORECASE)
            if m:
                year = int(m.group(1))
                quarter = int(m.group(2))
                return f"{year}-Q{quarter}", year, quarter
            m_year = re.match(r"^\s*(\d{4})\s*$", str(period_val))
            if m_year:
                year = int(m_year.group(1))
                return f"{year}-Q4", year, 4

        # Fallback from separate year/quarter fields
        try:
            y = int(float(year_val)) if year_val is not None and str(year_val).strip() else None
        except Exception:
            y = None
        try:
            q = int(float(quarter_val)) if quarter_val is not None and str(quarter_val).strip() else None
        except Exception:
            q = None

        if y is not None and q in {1, 2, 3, 4}:
            return f"{y}-Q{q}", y, q
        if y is not None:
            return f"{y}-Q4", y, 4
        return None, None, None

    def _extract_finance_frames(self, ticker: str) -> list[pd.DataFrame]:
        frames: list[pd.DataFrame] = []

        try:
            # Bypass vnstock paywall by directly calling KBS internal methods
            from vnstock.explorer.kbs.financial import Finance as KBSFinance
            
            fin = KBSFinance(symbol=ticker)
            
            # Fetch quarterly ratios directly bypassing the decorator
            # report_type="CSTC" (Chỉ số tài chính), period_type=2 (Quarter)
            df_q = fin._fetch_series_data(
                report_type="CSTC",
                period_type=2,
                report_key="Chỉ số tài chính",
                limit=40
            )
            if not df_q.empty:
                frames.append(df_q)
                
            # Fetch yearly ratios
            df_y = fin._fetch_series_data(
                report_type="CSTC",
                period_type=1,
                report_key="Chỉ số tài chính",
                limit=15
            )
            if not df_y.empty:
                frames.append(df_y)
                
            # Also fetch Income Statement just in case aliases are there
            df_kqkd = fin._fetch_series_data(
                report_type="KQKD", period_type=2, report_key="Kết quả kinh doanh", limit=40
            )
            if not df_kqkd.empty:
                frames.append(df_kqkd)
                
        except Exception as e:
            print(f"  [Bypass Error] {ticker}: {e}")

        return [f for f in frames if f is not None and not f.empty]

    def _reshape_legacy_report(self, df: pd.DataFrame) -> pd.DataFrame:
        # Wide format: rows are item_id, columns are periods
        if "item_id" not in df.columns:
            return df

        wide = df.set_index("item_id")
        period_cols = [
            c
            for c in wide.columns
            if re.match(r"^\d{4}-Q[1-4](?:_\d+)?$", str(c))
            or re.match(r"^\d{4}(?:_\d+)?$", str(c))
        ]
        if not period_cols:
            return df

        out = wide[period_cols].T.reset_index().rename(columns={"index": "period"})
        out["period"] = out["period"].astype(str).str.replace(r"_\d+$", "", regex=True)
        return out

    def extract(self, run_date: date) -> pd.DataFrame:
        records: list[dict] = []

        for ticker in VN_BANK_TICKERS:
            try:
                raw_frames = self._extract_finance_frames(ticker)
                if not raw_frames:
                    print(f"??  {ticker} financials: empty")
                    continue

                for raw in raw_frames:
                    df = self._reshape_legacy_report(raw.copy())
                    cols_norm = {self._norm(c): c for c in df.columns}

                    period_col = cols_norm.get("period") or cols_norm.get("reportperiod")
                    year_col = cols_norm.get("year") or cols_norm.get("yearreport")
                    quarter_col = cols_norm.get("quarter") or cols_norm.get("lengthreport")

                    for _, row in df.iterrows():
                        period, year, quarter = self._parse_period(
                            row.get(period_col) if period_col else None,
                            row.get(year_col) if year_col else None,
                            row.get(quarter_col) if quarter_col else None,
                        )
                        if year is None or year < 2018:
                            continue

                        records.append(
                            {
                                "ticker": ticker,
                                "period": period,
                                "year": year,
                                "quarter": quarter,
                                "nim": self._pick_value(row, "nim"),
                                "npl_ratio": self._pick_value(row, "npl_ratio"),
                                "car": self._pick_value(row, "car"),
                                "casa_ratio": self._pick_value(row, "casa_ratio"),
                                "roe": self._pick_value(row, "roe"),
                                "roa": self._pick_value(row, "roa"),
                            }
                        )
            except Exception as e:
                print(f"??  {ticker} financials error: {e}")

        out = pd.DataFrame(records)
        if out.empty:
            return out

        out = out.sort_values(["ticker", "year", "quarter"]).drop_duplicates(
            subset=["ticker", "period"], keep="last"
        )
        return out.reset_index(drop=True)
