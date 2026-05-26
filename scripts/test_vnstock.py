from vnstock import Vnstock
import traceback

def test():
    try:
        print("Testing Market Extractor (Stock History)...")
        stock = Vnstock().stock(symbol='VCB', source='VCI')
        hist = stock.quote.history(start='2024-01-01', end='2024-01-10', interval='1D')
        print(f"Market data rows: {len(hist)}")
        
        print("\nTesting Financials Extractor (Ratios)...")
        ratios = stock.finance.ratio(period="quarter", lang="en")
        print(f"Ratios columns: {list(ratios.columns)}")
        print(f"Ratios rows: {len(ratios)}")
        
    except Exception as e:
        print(f"\nCRITICAL ERROR:")
        traceback.print_exc()

if __name__ == "__main__":
    test()
