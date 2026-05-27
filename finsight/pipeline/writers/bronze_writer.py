from datetime import datetime
from pathlib import Path

import pandas as pd
from deltalake import DeltaTable, write_deltalake

BRONZE_DIR = Path("data/bronze")


def write_bronze(df: pd.DataFrame, source_name: str) -> str:
    """Write a dataframe to Bronze layer as Delta table."""
    if df.empty:
        print(f"[WARN] {source_name}: empty DataFrame, skip write")
        return ""

    path = str(BRONZE_DIR / source_name)

    out = df.copy()
    out["_ingested_at"] = datetime.utcnow().isoformat()
    out["_source"] = source_name

    write_deltalake(path, out, mode="append", schema_mode="merge")

    dt = DeltaTable(path)
    version = dt.version()
    print(f"[OK] Bronze [{source_name}] v{version} - {len(out)} rows appended")
    return path


def read_bronze(source_name: str, version: int | None = None) -> pd.DataFrame:
    """Read Bronze table at latest version or specific version."""
    path = str(BRONZE_DIR / source_name)
    dt = DeltaTable(path)
    if version is not None:
        dt = dt.load_as_version(version)
    return dt.to_pandas()


def bronze_history(source_name: str) -> list:
    """Read transaction history of a Bronze Delta table."""
    dt = DeltaTable(str(BRONZE_DIR / source_name))
    return dt.history()
