from vnstock import Finance
import pandas as pd
import re

def is_period_col(c: str) -> bool:
    return bool(re.match(r"^\d{4}-Q[1-4](_\d+)?$", str(c))) or bool(re.match(r"^\d{4}(_\d+)?$", str(c)))

def normalize_wide_finance(df: pd.DataFrame, source: str, symbol: str, report_name: str) -> pd.DataFrame:
    id_cols = [c for c in ["item", "item_en", "item_id"] if c in df.columns]
    period_cols = [c for c in df.columns if is_period_col(c)]

    long_df = df.melt(
        id_vars=id_cols,
        value_vars=period_cols,
        var_name="report_period_raw",
        value_name="value"
    )

    # Chuẩn hóa kỳ: 2025-Q4_1 -> 2025-Q4
    long_df["report_period"] = long_df["report_period_raw"].astype(str).str.replace(r"_\d+$", "", regex=True)

    # Nếu trùng (item_id + report_period) thì giữ bản xuất hiện đầu tiên
    dedup_keys = [c for c in ["item_id", "item"] if c in long_df.columns] + ["report_period"]
    long_df = long_df.sort_values(dedup_keys).drop_duplicates(subset=dedup_keys, keep="first")

    long_df["source"] = source
    long_df["symbol"] = symbol
    long_df["report_name"] = report_name

    # Sắp xếp cho dễ đọc
    sort_cols = ["report_period"] + ([c for c in ["item_id","item"] if c in long_df.columns])
    long_df = long_df.sort_values(sort_cols).reset_index(drop=True)

    return long_df

symbol = "TCB"

# Bypass API cho test script
from vnstock.explorer.kbs.financial import Finance as KBSFinance

# VCI (bị giới hạn 4 kỳ ở bản miễn phí, chỉ lấy 1 dòng code minh họa)
vci = Finance(source="VCI", symbol=symbol)
df_vci_wide = vci.income_statement(period="quarter", lang="vi")
df_vci_long = normalize_wide_finance(df_vci_wide, "VCI", symbol, "income_statement")

print("VCI wide:", df_vci_wide.shape, "-> long:", df_vci_long.shape)
print(df_vci_long.head())

# KBS (Sử dụng bypass để lấy full data 10 năm)
kbs_bypass = KBSFinance(symbol=symbol)
df_kbs_wide = kbs_bypass._fetch_series_data(
    report_type="KQKD", period_type=2, report_key="Kết quả kinh doanh", limit=40
)
df_kbs_long = normalize_wide_finance(df_kbs_wide, "KBS_Bypass", symbol, "income_statement")

print("KBS Bypass wide:", df_kbs_wide.shape, "-> long:", df_kbs_long.shape)
print(df_kbs_long.head())