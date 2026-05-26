import requests
import pandas as pd
from datetime import date
from pydantic import BaseModel
from .base import BaseExtractor

INDICATORS = {
    "FP.CPI.TOTL.ZG":   "inflation_pct",
    "FR.INR.LEND":       "lending_rate_pct",
    "NY.GDP.MKTP.KD.ZG": "gdp_growth_pct",
    "FS.AST.NPLL.GD.ZS": "npl_to_gdp_pct",
}

class MacroRecord(BaseModel):
    indicator_code: str
    indicator_name: str
    year:           int
    value:          float

class WorldBankExtractor(BaseExtractor):
    source_name = "world_bank"
    schema      = MacroRecord
    country     = "VN"

    def extract(self, run_date: date) -> pd.DataFrame:
        records = []
        for code, name in INDICATORS.items():
            url = (
                f"https://api.worldbank.org/v2/country/{self.country}"
                f"/indicator/{code}?format=json&per_page=10&mrv=8"
            )
            try:
                data = requests.get(url, timeout=10).json()
                if len(data) > 1 and isinstance(data[1], list):
                    for entry in data[1]:
                        if entry["value"] is not None:
                            records.append({
                            "indicator_code": code,
                            "indicator_name": name,
                            "year":           int(entry["date"]),
                            "value":          float(entry["value"]),
                        })
            except Exception as e:
                print(f"⚠️  {code}: {e}")
        return pd.DataFrame(records)
