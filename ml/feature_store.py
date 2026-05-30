'''
    Feature Store: cầu nối giữa Duck và Ml models 
    Cung cấp hàm build_anomaly_features() - input chuẩn cho Ì và LSTM AE 

    Ở đây xác định trước các đặc trưng này vì theo Domain của Tài chính thì: 
        - NPL = Nợ xấu / Tổng dư nợ -> Cho biết ngân hàng đang có nhieeuf khách hàng ko trả được nợ 
        - CAR (Capital Adequacy Ratio): tỷ lệ an toàn vốn -> xem ngân hàng có đủ vốn để chống đỡ rủi ro hay ko 
        - NIM (Net Interest Margin): nếu NIm giảm tức là ngân hàng cho chay nhưng kiếm được ít tiền hơn. 
        - Volume giao dịch: nếu số Volume tăng bất thường -> chỉ có thể là do ngày đó có sự kiện gì lớn 
        
'''


import duckdb 
import pandas as pd 
from pathlib import Path 

# Tính toán đường dẫn tuyệt đối đến thư mục gốc của project
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PATH = PROJECT_ROOT / "data" / "finsight.duckdb"

FEATURES = [
    "pct_change_zscore", 
    "volume_zscore", 
    "nim_zscore", 
    "npl_zscore", 
    "car_zscore", 
    "roe_zscore", 
    "z_score"
]

def build_anomaly_features(days: int = 730) -> pd.DataFrame:
    '''
        Query mart_anomaly_input từ DuckDB 
        Lấy dữ liệu 2 năm gần nhất 
        
        Sử dụng LSTM Autoencoder để bự báo sự bất thường 


        Returns: 
            Dataframe với các cột: trade_date, ticker, ANOMALY_FEATURES và feature_values 
        
    
    '''
    con = duckdb.connect(str(PATH), read_only=True)
    df = con.execute(f"""   
        SELECT 
            trade_date, 
            ticker, 
            close_price, 
            ma_30d, 
            {','.join(FEATURES)}
        FROM mart_anomaly_input
        WHERE trade_date >= CURRENT_DATE - INTERVAL '{days} days'
        ORDER BY ticker, trade_date
    """).df()  

    con.close()

    # giữ lại các rows mà thỏa 4 đặc trưng 
    threshold = 3
    df = df.dropna(subset=FEATURES, thresh=threshold)

    return df 


# test function 
if __name__ == "__main__": 
    df = build_anomaly_features(days=365)
    print(f"Shape: {df.shape}")
    print(f"Tickers: {df.ticker.nunique()}")
    print(f"Date range: {df.trade_date.min()} to {df.trade_date.max()}")
    print(f"Missing values:\n {df[FEATURES].isna().sum()}")
    print(f"\nSample: \n {df.head(5)}")

