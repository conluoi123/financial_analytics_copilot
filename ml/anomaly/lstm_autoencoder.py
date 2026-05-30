import torch
import torch.nn as nn 
import pandas as pd 
import numpy as np
from sklearn.preprocessing import StandardScaler
from torch.utils.data import DataLoader, TensorDataset 

from typing import Tuple 
from ml.feature_store import FEATURES, build_anomaly_features 


class LSTMAutoencoder(nn.Module):
    def __init__(self, seq_len: int, n_features: int, hidden_dim: int = 32): 
        super(LSTMAutoencoder, self).__init__()
        self.seq_len = seq_len 
        self.n_features = n_features
        self.hidden_dim = hidden_dim 

        # Encoder 
        self.encoder = nn.LSTM(
            input_size = n_features, 
            hidden_size = hidden_dim, 
            num_layers = 1, 
            batch_first = True
        )

        # Decoder 
        self.decoder = nn.LSTM(
            input_size= hidden_dim, 
            hidden_size = n_features, 
            num_layers = 1, 
            batch_first = True
        )


    def forward(self, x): 
        _, (hidden, _) = self.encoder(x)
        hidden = hidden.transpose(0,1)
        hidden = hidden.repeat(1, self.seq_len , 1)
        out, _ = self.decoder(hidden)
        return out 
def create_sequences(data: np.ndarray, seq_length: int)-> np.ndarray:
    xs = []
    for i in range(len(data) - seq_length): 
        xs.append(data[i:(i+seq_length)])
    return np.array(xs)

class LSTMAnomalyDetector: 
    def __init__(self, seq_length: int = 30, hidden_dim: int = 32, epochs: int = 5):
        self.seq_length = seq_length 
        self.hidden_dim = hidden_dim 
        self.epochs = epochs 
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None 
        self.scaler = StandardScaler() 
    
    def fit_predict(self, df: pd.DataFrame, ticker: str) -> pd.DataFrame: 
        """
            Train và dự đoán lỗi tái tạo cho 1 cổ phiếu cụ thể 
        """
        df_ticker = df[df["ticker"]==ticker].sort_values("trade_date").copy()
        if len(df_ticker) <= self.seq_length: 
            return df_ticker

        data = df_ticker[FEATURES].fillna(0).values
        data_scaled = self.scaler.fit_transform(data)
        
        # Cắt thành các sequence
        sequences = create_sequences(data_scaled, self.seq_length)
        X_tensor = torch.FloatTensor(sequences)
        
        dataset = TensorDataset(X_tensor, X_tensor)
        dataloader = DataLoader(dataset, batch_size=32, shuffle=False)


        self.model = LSTMAutoencoder(seq_len=self.seq_length, n_features=len(FEATURES), hidden_dim=self.hidden_dim)
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=1e-3)

        # Train loop 
        self.model.train()
        for epoch in range(self.epochs): 
            for batch_x, batch_y in dataloader: 
                optimizer.zero_grad()
                outputs = self.model(batch_x)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
            print(f"Epoch {epoch+1} Loss: {loss.item()}")
            
        self.model.eval()
        with torch.no_grad():
            predictions = self.model(X_tensor)
            loss_per_seq = torch.mean(torch.abs(predictions - X_tensor), dim=[1,2]).numpy()
            padding = [np.nan] * self.seq_length
            reconstruction_errors = padding + list(loss_per_seq)

            # gán lỗi tái tạo vào dataframe
            df_ticker['reconstruction_error'] = reconstruction_errors

            # đánh dấu bất thường nếu vượt qua mu + 2sigma 
            threshold = np.nanmean(reconstruction_errors) + 2 * np.nanstd(reconstruction_errors)
            df_ticker['is_anomaly_lstm'] = df_ticker['reconstruction_error'] > threshold

            return df_ticker 


if __name__ == "__main__":
    df = build_anomaly_features(days=365)
    if not df.empty:
        # Chạy test với một mã VCB
        detector = LSTMAnomalyDetector(seq_length=30, epochs=10)
        res_vcb = detector.fit_predict(df, 'VCB')
        
        anomalies = res_vcb[res_vcb['is_anomaly_lstm'] == True]
        print(f"Phat hien {len(anomalies)} chuoi ngay bat thuong cho VCB")
        print(anomalies[['trade_date', 'close_price', 'reconstruction_error']].tail())
            
        

        

    