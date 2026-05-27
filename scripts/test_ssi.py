import requests
import pandas as pd
import io

def get_ssi_financial_ratios(ticker: str):
    url = f"https://fiin-fundamental.ssi.com.vn/FinancialStatement/DownloadFinancialRatio?language=en&Ticker={ticker}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    }
    
    print(f"Đang tải dữ liệu {ticker} từ SSI...")
    res = requests.get(url, headers=headers)
    if res.status_code == 200:
        # Bỏ qua 7 dòng header thừa của file Excel SSI
        df = pd.read_excel(io.BytesIO(res.content), skiprows=7)
        return df
    else:
        print(f"Lỗi: {res.status_code}")
        return pd.DataFrame()

if __name__ == "__main__":
    df = get_ssi_financial_ratios("TCB")
    print(f"\nSSI trả về {df.shape[0]} chỉ số, với {df.shape[1]} cột (bao gồm hàng chục năm/quý lịch sử)!")
    print("\nCác cột thời gian lấy được:")
    print(df.columns.tolist()[:10], "...")
