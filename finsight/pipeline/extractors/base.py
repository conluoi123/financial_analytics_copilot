from abc import ABC, abstractmethod
from datetime import date
from pathlib import Path
import pandas as pd
from pydantic import BaseModel, ValidationError
from typing import Type

class BaseExtractor(ABC):
    source_name: str               # subclass override
    schema: Type[BaseModel]        # Pydantic model — subclass override

    def extract(self, run_date: date) -> pd.DataFrame:
        raise NotImplementedError

    def validate_schema(self, df: pd.DataFrame) -> pd.DataFrame:
        """Validate từng row theo Pydantic schema. Drop row lỗi, log warning."""
        valid_rows = []
        errors     = []
        for i, row in df.iterrows():
            try:
                self.schema(**row.to_dict())
                valid_rows.append(row)
            except ValidationError as e:
                errors.append({"row": i, "error": str(e)})
        if errors:
            print(f"⚠️  {self.source_name}: {len(errors)} rows failed schema — dropped")
        return pd.DataFrame(valid_rows).reset_index(drop=True)

    def run(self, run_date: date) -> pd.DataFrame:
        """Entry point: extract → validate → return clean DataFrame."""
        df = self.extract(run_date)
        return self.validate_schema(df)
