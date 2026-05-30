from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from langchain_core.messages import HumanMessage
import duckdb

from backend.agent.graph import app as agent_app

app = FastAPI(title="FinSight API")

# Allow CORS for local React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        # Construct input for the agent
        inputs = {"messages": [HumanMessage(content=req.message)]}
        
        # Run graph
        final_message = ""
        for event in agent_app.stream(inputs, stream_mode="values"):
            message = event["messages"][-1]
            if message.type == "ai" and not message.tool_calls:
                content = message.content
                if isinstance(content, list):
                    # Trích xuất text từ mảng (thường do Gemini trả về)
                    final_message = "\n".join([
                        item.get("text", "") for item in content 
                        if isinstance(item, dict) and "text" in item
                    ])
                else:
                    final_message = str(content)
                
        return ChatResponse(response=final_message)
    except Exception as e:
        return ChatResponse(response="", error=str(e))

@app.get("/api/dashboard")
async def dashboard_endpoint(ticker: str = "VCB"):
    try:
        con = duckdb.connect("data/finsight.duckdb", read_only=True)
        
        # 1. Lấy dữ liệu quý gần nhất cho bảng Financial Indicators
        fin_query = """
            SELECT 
                bank_name as bank, 
                ticker as code, 
                COALESCE(close_price, 0.0) as closePrice,
                COALESCE(volume, 0.0) as volume,
                COALESCE(pct_change, 0.0) * 100 as pctChange,
                0.0 as volatility,
                COALESCE(nim_pct, 0.0) as nim, 
                COALESCE(npl_ratio_pct, 0.0) as nplRatio,
                COALESCE(casa_ratio_pct, 0.0) as casaRatio 
            FROM mart_bank_perf 
            WHERE trade_date = (SELECT MAX(trade_date) FROM mart_bank_perf)
            ORDER BY ticker
        """
        financials = con.execute(fin_query).df().to_dict(orient='records')
        
        # 2. Tính toán KPIs
        total_volume = sum(row.get('volume', 0) for row in financials)
        avg_pct = sum(row.get('pctChange', 0) for row in financials) / len(financials) if financials else 0.0
        
        # Đếm số dòng có biến động bất thường (z_score > 3 hoặc < -3) trong 30 ngày qua
        anomaly_query = """
            SELECT count(*) 
            FROM mart_anomaly_input 
            WHERE (z_score > 3 OR z_score < -3) 
              AND trade_date >= CURRENT_DATE - INTERVAL 30 DAY
        """
        try:
            anomalies_count = con.execute(anomaly_query).fetchone()[0]
        except Exception:
            anomalies_count = 0
            
        kpis = {
            "totalVolume": total_volume,
            "avgPctChange": avg_pct,
            "anomalies": anomalies_count
        }
        
        # 3. Lấy dữ liệu biểu đồ (Chart Data) - Giá theo Ticker trong 50 ngày gần nhất
        # Validate ticker để tránh SQL injection (chỉ lấy 5 mã)
        safe_ticker = ticker if ticker in ["VCB", "BID", "CTG", "MBB", "TCB"] else "VCB"
        
        chart_query = f"""
            SELECT strftime(trade_date, '%m-%d') as x, close_price as y 
            FROM mart_bank_perf 
            WHERE ticker = '{safe_ticker}' 
            ORDER BY trade_date DESC 
            LIMIT 50
        """
        # Đảo ngược mảng để vẽ từ cũ tới mới
        chart_data = con.execute(chart_query).df().to_dict(orient='records')
        chart_data.reverse()
        
        con.close()
        
        return {
            "kpis": kpis,
            "financials": financials,
            "chartData": chart_data
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/api/analytics")
async def analytics_endpoint():
    try:
        con = duckdb.connect("data/finsight.duckdb", read_only=True)
        # Lấy các điểm bất thường có Z-score > 3 hoặc < -3
        query = """
            SELECT 
                strftime(trade_date, '%Y-%m-%d') as date,
                ticker,
                CASE 
                    WHEN abs(volume_zscore) > abs(pct_change_zscore) THEN 'Volume Surge'
                    WHEN pct_change_zscore < -3 THEN 'Price Crash'
                    WHEN pct_change_zscore > 3 THEN 'Price Surge'
                    ELSE 'Volatility Spike'
                END as feature,
                ROUND(abs(z_score), 2) as aiScore,
                CASE 
                    WHEN abs(z_score) > 5 THEN 'CRITICAL'
                    WHEN abs(z_score) > 4 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END as severity
            FROM mart_anomaly_input
            WHERE abs(z_score) > 3
            ORDER BY trade_date DESC, abs(z_score) DESC
            LIMIT 50
        """
        anomalies = con.execute(query).df().to_dict(orient='records')
        con.close()
        # Gắn ID giả cho React map
        for i, row in enumerate(anomalies):
            row['id'] = str(i)
        return {"anomalies": anomalies}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/api/banks")
async def banks_endpoint():
    try:
        con = duckdb.connect("data/finsight.duckdb", read_only=True)
        # 1. Lấy thông tin cơ bản
        info_query = """
            SELECT 
                ticker as code,
                bank_name as name,
                COALESCE(nim_pct, 0.0) as nim,
                COALESCE(npl_ratio_pct, 0.0) as npl,
                COALESCE(casa_ratio_pct, 0.0) as car,
                COALESCE(pct_change, 0.0) * 100 as trend
            FROM mart_bank_perf
            WHERE trade_date = (SELECT MAX(trade_date) FROM mart_bank_perf)
            ORDER BY ticker
        """
        banks = con.execute(info_query).df().to_dict(orient='records')
        
        # 2. Lấy trend data (10 phiên gần nhất) và gắn status
        for i, bank in enumerate(banks):
            bank['id'] = str(i)
            # Status
            if abs(bank['trend']) > 5:
                bank['status'] = 'ALERT'
            elif abs(bank['trend']) > 2:
                bank['status'] = 'WATCH'
            else:
                bank['status'] = 'NORMAL'
                
            # Trend Data
            trend_q = f"""
                SELECT close_price FROM mart_bank_perf 
                WHERE ticker = '{bank['code']}' 
                ORDER BY trade_date DESC LIMIT 10
            """
            trend_df = con.execute(trend_q).df()
            prices = trend_df['close_price'].tolist()
            prices.reverse()
            bank['trendData'] = prices
            
        con.close()
        return {"banks": banks}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.server:app", host="0.0.0.0", port=8000, reload=True)
