import pandas as pd 
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler 

from typing import Tuple 
from ml.feature_store import FEATURES, build_anomaly_features


class IsolationForestDetector: 
    def __init__(self, contamination: float=0.05, random_state: int = 42): 
        '''
            Khởi tạo Isolation Forest 
            Args: 
                contamination: tỷ lệ bất thường dự kiến 
                random_state: đặt seed để tái tạo kq 
        '''
        self.contamination = contamination
        self.random_state = random_state
        self.scaler = StandardScaler() 
        self.model = IsolationForest(
            contamination=contamination,
            random_state=random_state,
            n_jobs = -1 
        )

    def fit_predict(self, df: pd.DataFrame) -> pd.DataFrame: 
        """
            Scale features, huấn luyện mô hình và dự đoán bất thường 
            Args: 
                df: DataFrame đầu vào chứa các cột nằm trong Features
            Returns: 
                DataFrame thêm hai cột mới: 'anomaly_score' và 'is_anomaly' 
        """

        x = df[FEATURES].copy()
        X = x.fillna(0)
        X_scaled = self.scaler.fit_transform(X)
        preds = self.model.fit_predict(X_scaled)
        scores = self.model.decision_function(X_scaled)
        df_result = df.copy()
        df_result['is_anomaly'] = preds 
        df_result['anomaly_score'] = scores

        return df_result

if __name__ == "__main__": 
    print("Lấy dữ liệu từ feature store...")
    df_features = build_anomaly_features(days=365)
    if df_features.empty: 
        print("Không có dữ liệu features nào để train mô hình. Kiểm tra lại pipe line!")
    else: 
        print(f"Data shape: {df_features.shape}")

        # Khởi tạo mô hình Isolation Forest 
        detector = IsolationForestDetector(contamination=0.05)
        df_result = detector.fit_predict(df_features)

        anomaly_count = (df_result['is_anomaly']== -1).sum()
        normal_count = (df_result['is_anomaly']==1).sum()

        print("\n Isolation Forest \n")
        print(f"Total records: {len(df_result)}")
        print(f"Normal records: {normal_count}")
        print(f"Anomaly records: {anomaly_count}")

        print("\nTop 5 điểm dữ liệu bất thường nhất:")
        anomalies = df_result[df_result['is_anomaly'] == -1]
        anomalies = anomalies.sort_values(by='anomaly_score')
        
        columns_to_show = ['trade_date', 'ticker', 'close_price', 'anomaly_score'] + FEATURES
        print(anomalies[columns_to_show].head())
    