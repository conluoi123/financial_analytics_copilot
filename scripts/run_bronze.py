from datetime import date
from finsight.pipeline.extractors.market import MarketExtractor
from finsight.pipeline.extractors.financials import FinancialsExtractor
from finsight.pipeline.extractors.world_bank import WorldBankExtractor
from finsight.pipeline.delta_writer import write_bronze

def run_all():
    today = date.today()
    
    # 1. Kéo dữ liệu chứng khoán
    print("1. Đang kéo dữ liệu cổ phiếu (Market)...")
    market_df = MarketExtractor().run(today)
    if not market_df.empty:
        write_bronze(market_df, "vn_stocks")
        
    # 2. Kéo dữ liệu báo cáo tài chính
    print("\n2. Đang kéo dữ liệu BCTC (Financials)...")
    fin_df = FinancialsExtractor().run(today)
    if not fin_df.empty:
        write_bronze(fin_df, "vn_financials")
        
    # 3. Kéo dữ liệu vĩ mô (World Bank)
    print("\n3. Đang kéo dữ liệu vĩ mô (World Bank)...")
    wb_df = WorldBankExtractor().run(today)
    if not wb_df.empty:
        write_bronze(wb_df, "world_bank")
        
    print("\n✅ Đã hoàn tất kéo dữ liệu cho cả 3 nguồn!")

if __name__ == "__main__":
    run_all()
