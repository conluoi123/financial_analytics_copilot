import pandas as pd
from prophet import Prophet
import logging

from ml.feature_store import build_anomaly_features

# Tắt warning của Prophet cho màn hình terminal gọn gàng
logging.getLogger('prophet').setLevel(logging.ERROR)

class ProphetForecaster:
    def __init__(self):
        self.model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=True,
            yearly_seasonality=True,
            interval_width=0.95 # Độ tin cậy 95%
        )

    def fit_predict(self, df: pd.DataFrame, ticker: str, forecast_days: int = 30) -> pd.DataFrame:
        """
        Dự báo giá cổ phiếu bằng Prophet.
        """
        # Lọc dữ liệu theo cổ phiếu
        df_ticker = df[df['ticker'] == ticker].sort_values('trade_date').copy()
        
        # Prophet yêu cầu 2 cột 'ds' (ngày) và 'y' (giá trị cần dự báo)
        df_prophet = df_ticker[['trade_date', 'close_price']].rename(columns={
            'trade_date': 'ds',
            'close_price': 'y'
        })
        
        # Khởi tạo mô hình mới cho mỗi lần predict để không lưu lại trạng thái cũ
        model = Prophet(daily_seasonality=False, yearly_seasonality=True, interval_width=0.95)
        model.fit(df_prophet)
        
        # Tạo dataframe cho những ngày cần dự báo (bao gồm cả dữ liệu quá khứ để so sánh)
        future = model.make_future_dataframe(periods=forecast_days)
        forecast = model.predict(future)
        
        # Nối kết quả dự báo lại với dữ liệu ban đầu
        # forecast chứa cột: ds, yhat (giá trị dự báo), yhat_lower (cận dưới), yhat_upper (cận trên)
        forecast_merged = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].rename(columns={'ds': 'trade_date'})
        
        # Left join để gắn yhat vào lại bảng df_ticker
        result = pd.merge(df_ticker, forecast_merged, on='trade_date', how='right')
        
        # Phát hiện bất thường trong quá khứ: Nếu giá thực tế vượt ra ngoài dải [yhat_lower, yhat_upper]
        result['is_anomaly_prophet'] = (result['close_price'] > result['yhat_upper']) | (result['close_price'] < result['yhat_lower'])
        
        return result

if __name__ == "__main__":
    df = build_anomaly_features(days=730)
    
    if not df.empty:
        forecaster = ProphetForecaster()
        # Chạy thử với TCB
        res_tcb = forecaster.fit_predict(df, ticker='TCB', forecast_days=10)
        
        print("Prophet Forecast cho TCB:")
        print(res_tcb[['trade_date', 'close_price', 'yhat', 'yhat_lower', 'yhat_upper', 'is_anomaly_prophet']].tail(15))
        
        anomalies = res_tcb[res_tcb['is_anomaly_prophet'] == True]
        print(f"\nPhát hiện {len(anomalies)} điểm giá nằm ngoài khoảng dự đoán của Prophet.")
