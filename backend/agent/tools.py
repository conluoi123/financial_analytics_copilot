# Các công cụ hỗ trợ AI (Machine Learning, SQL)

import duckdb 
from langchain_core.tools import tool 
from ml.feature_store import build_anomaly_features
from ml.anomaly.isolation_forest import IsolationForestDetector

@tool 
def query_duckdb_tool(query: str) -> str: 
    '''
        Sử dụng công cụ này để truy vấn CSDL DuckDB 
        Arg: một câu lệnh SQL hợp lệ 
        Bảng truyvaans: mart_bank_perf 
        Returns: kết quả bảng dạng markdown 
    '''
    try: 
        con = duckdb.connect("data/finsight.duckdb", read_only = True)
        df = con.execute(query).df()
        con.close()
        if df.empty: 
            return "Không có dữ liệu nào trả về"
        return df.to_markdown()
    except Exception as e: 
        return f"Có lỗi khi truy vấn DuckDB: {str(e)}" 

@tool 
def check_anomaly_tool(ticker: str) -> str: 
    '''
        Sử dụng tool này khi người dùng hỏi cổ phiếu có gì bất thường
        Args: mã cổ phiếu 
        Returns" trả về danh sách 5 ngày có điểm bất thường cao nhất 
    '''
    try: 
        df_features = build_anomaly_features(days=365)
        if df_features.empty: 
            return "Lỗi lấy dữ liệu"
        detector = IsolationForestDetector(contamination=0.05)
        df_result = detector.fit_predict(df_features)
        df_ticker = df_result[df_result['ticker']== ticker.upper()]
        anomalies = df_ticker[df_ticker['is_anomaly'] == -1].sort_values(by='anomaly_score')
        if anomalies.empty:
            return f"Không phát hiện điểm bất thường nào cho mã {ticker}."
            
        report = f"Phát hiện {len(anomalies)} ngày bất thường cho {ticker}.\nTop 5 ngày dị thường nhất:\n"
        report += anomalies[['trade_date', 'close_price', 'anomaly_score']].head(5).to_markdown()
        return report
    except Exception as e:
        return f"Lỗi ML: {str(e)}"