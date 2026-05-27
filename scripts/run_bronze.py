from datetime import date

from finsight.pipeline.extractors.financials import FinancialsExtractor
from finsight.pipeline.extractors.market import MarketExtractor
from finsight.pipeline.extractors.world_bank import WorldBankExtractor
from finsight.pipeline.writers.bronze_writer import write_bronze


def run_all() -> None:
    today = date.today()

    print("1. Dang keo du lieu co phieu (Market)...")
    market_df = MarketExtractor().run(today)
    if not market_df.empty:
        write_bronze(market_df, "vn_stocks")

    print("\n2. Dang keo du lieu BCTC (Financials)...")
    fin_df = FinancialsExtractor().run(today)
    if not fin_df.empty:
        write_bronze(fin_df, "vn_financials")

    print("\n3. Dang keo du lieu vi mo (World Bank)...")
    wb_df = WorldBankExtractor().run(today)
    if not wb_df.empty:
        write_bronze(wb_df, "world_bank")

    print("\n[OK] Da hoan tat keo du lieu cho ca 3 nguon")


if __name__ == "__main__":
    run_all()
