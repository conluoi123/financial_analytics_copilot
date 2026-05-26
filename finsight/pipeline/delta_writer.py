from deltalake import write_deltalake, DeltaTable
from pathlib import Path
import pandas as pd
from datetime import datetime

BRONZE_DIR = Path("data/bronze")

def write_bronze(df: pd.DataFrame, source_name: str) -> str:
    """
    Ghi DataFrame vào Bronze layer dạng Delta table.
    """
    if df.empty:
        print(f"⚠️  {source_name}: empty DataFrame — skip write")
        return ""

    path = str(BRONZE_DIR / source_name)

    # Inject metadata columns
    df = df.copy()
    df["_ingested_at"]  = datetime.utcnow().isoformat()
    df["_source"]       = source_name

    write_deltalake(
        path,
        df,
        mode="append",
        schema_mode="merge",      # xử lý schema drift tự động
    )

    dt      = DeltaTable(path)
    version = dt.version()
    print(f"✅ Bronze [{source_name}] v{version} — {len(df)} rows appended")
    return path

def read_bronze(source_name: str, version: int = None) -> pd.DataFrame:
    """
    Đọc Bronze table. version=None → latest. version=N → time travel.
    """
    path = str(BRONZE_DIR / source_name)
    dt   = DeltaTable(path)

    if version is not None:
        dt = dt.load_as_version(version)   # time travel — debug khi data sai

    return dt.to_pandas()

def bronze_history(source_name: str) -> list:
    """Xem toàn bộ transaction log — ai viết gì, lúc nào."""
    dt = DeltaTable(str(BRONZE_DIR / source_name))
    return dt.history()
