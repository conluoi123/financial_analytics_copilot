import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Building2, Activity, LineChart, AlertTriangle, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTicker, setSelectedTicker] = useState('VCB');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard?ticker=${selectedTicker}&t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.error) {
          setErrorMsg(result.error);
        } else {
          setData(result);
          setErrorMsg(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg(err.message);
        setLoading(false);
      });
  }, [selectedTicker]);

  const exportPDF = () => {
    if (!data?.financials) return;
    
    const doc = new jsPDF();
    doc.text('Financial Indicators Report', 14, 15);
    
    const tableData = data.financials.map((row: any) => [
      row.bank,
      row.closePrice?.toFixed(2) || '0.00',
      (row.volume / 1000000).toFixed(2) + 'M',
      (row.pctChange > 0 ? '+' : '') + (row.pctChange?.toFixed(2) || '0.00') + '%',
      (row.volatility?.toFixed(2) || '0.00') + '%',
      (row.nim?.toFixed(2) || '0.00') + '%',
      (row.casaRatio?.toFixed(2) || '0.00') + '%'
    ]);

    autoTable(doc, {
      head: [['BANK', 'CLOSE', 'VOLUME', 'PCT CHANGE', 'VOLATILITY', 'NIM (%)', 'CASA RATIO']],
      body: tableData,
      startY: 20,
    });

    doc.save('financial_indicators.pdf');
  };

  if (errorMsg) {
    return (
      <div className="p-6 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-[#ff516a] flex flex-col items-center bg-[rgba(255,81,106,0.1)] p-6 rounded border border-[rgba(255,81,106,0.2)]">
          <AlertTriangle className="size-8 mb-4" />
          <p className="font-['Space_Grotesk'] text-lg font-bold mb-2">API Error</p>
          <p className="text-sm">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-[#c0c1ff] flex flex-col items-center">
          <Activity className="size-8 animate-pulse mb-4" />
          <p className="font-['Space_Grotesk'] text-lg">Fetching data from DuckDB...</p>
        </div>
      </div>
    );
  }

  const { kpis, financials, chartData } = data || {};

  const kpiCards = [
    {
      title: 'BANKS TRACKED',
      value: 5,
      subtitle: 'Active VN Ecosystem',
      trend: 'up',
      icon: 'building',
      color: '#C0C1FF',
    },
    {
      title: 'TOTAL VOLUME',
      value: `${((kpis?.totalVolume || 0) / 1000000).toFixed(1)}M`,
      subtitle: 'Market Liquidity',
      trend: 'up',
      icon: 'activity',
      color: '#4EDEA3',
    },
    {
      title: 'AVG MARKET TREND',
      value: `${(kpis?.avgPctChange || 0) > 0 ? '+' : ''}${(kpis?.avgPctChange || 0).toFixed(2)}%`,
      subtitle: 'Latest Quarter',
      trend: (kpis?.avgPctChange || 0) >= 0 ? 'up' : 'down',
      icon: 'trending-up',
      color: (kpis?.avgPctChange || 0) >= 0 ? '#4EDEA3' : '#FFB2B7',
    },
    {
      title: 'ANOMALIES (30D)',
      value: kpis?.anomalies || 0,
      subtitle: 'Detected by ML',
      trend: (kpis?.anomalies || 0) > 5 ? 'down' : 'up',
      icon: 'alert',
      color: (kpis?.anomalies || 0) > 5 ? '#FFB2B7' : '#4EDEA3',
    },
  ];

  // Scale chart data to fit SVG (height: 320, padding: 40 top/bottom)
  const prices = chartData?.map((d: any) => d.y) || [0];
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  
  const scaleY = (y: number) => {
    if (maxPrice === minPrice) return 160;
    const normalized = (y - minPrice) / (maxPrice - minPrice);
    return 320 - 40 - (normalized * 240); // Invert Y and fit between 40 and 280
  };

  return (
    <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpiCards.map((card, index) => (
            <div
              key={index}
              className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-4 shadow-[0px_0px_20px_0px_rgba(192,193,255,0.08)]"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[#c7c4d7] text-[12px] tracking-[0.6px] uppercase font-['JetBrains_Mono'] flex items-center gap-1 group relative cursor-help">
                  {card.title}
                  <Info className="size-3 text-[#c7c4d7] opacity-70" />
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none shadow-xl">
                    {card.title === 'BANKS TRACKED' ? 'Số lượng ngân hàng đang theo dõi' : 
                     card.title === 'TOTAL VOLUME' ? 'Tổng khối lượng giao dịch mới nhất' : 
                     card.title === 'AVG MARKET TREND' ? 'Trung bình biến động giá cổ phiếu' : 
                     'Số điểm bất thường phát hiện bằng Isolation Forest'}
                  </span>
                </p>
                {card.icon === 'building' && <Building2 className="size-4 text-[#C0C1FF]" />}
                {card.icon === 'activity' && <Activity className="size-4 text-[#4EDEA3]" />}
                {card.icon === 'trending-up' && <LineChart className="size-4 text-[#4EDEA3]" />}
                {card.icon === 'alert' && <AlertTriangle className="size-4 text-[#FFB2B7]" />}
              </div>
              <div className="text-[#e5e1e4] text-[48px] font-bold leading-[48px] tracking-[-0.96px] font-['JetBrains_Mono'] mb-2">
                {card.value}
              </div>
              <div className="flex items-center gap-1">
                {card.trend === 'up' ? (
                  <TrendingUp className="size-3" style={{ color: card.color }} />
                ) : (
                  <TrendingDown className="size-3" style={{ color: card.color }} />
                )}
                <p className="text-[12px] font-['JetBrains_Mono']" style={{ color: card.color }}>
                  {card.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Stock Price Analysis */}
        <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#c0c1ff] w-1 h-6 rounded-full" />
              <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
                Stock Price Analysis ({selectedTicker} - Last 50 Days)
              </h2>
            </div>
            {/* Ticker Selector */}
            <div className="bg-[#1c1b1d] border border-[rgba(70,69,84,0.3)] rounded-[4px] p-1 flex gap-2">
              {['VCB', 'BID', 'CTG', 'MBB', 'TCB'].map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => setSelectedTicker(ticker)}
                  className={`px-3 py-1 rounded-[2px] text-[12px] font-medium transition-colors ${
                    selectedTicker === ticker
                      ? 'bg-[#c0c1ff] text-[#1000a9]'
                      : 'text-[#c7c4d7] hover:bg-[rgba(70,69,84,0.2)]'
                  }`}
                >
                  {ticker}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart */}
          <div className="relative h-[320px] transition-opacity duration-300" style={{ opacity: loading ? 0.5 : 1 }}>
            <svg className="w-full h-full" viewBox="0 0 100 320" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#C0C1FF" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#C0C1FF" stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Grid lines */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="0"
                  y1={64 + i * 64}
                  x2="100"
                  y2={64 + i * 64}
                  stroke="rgba(70,69,84,0.1)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {chartData && chartData.length > 0 && (
                <>
                  {/* Area fill */}
                  <path
                    d={`M 0,${scaleY(chartData[0].y)} ${chartData.map((d: any, i: number) => `L ${(i / (chartData.length - 1)) * 100},${scaleY(d.y)}`).join(' ')} L 100,320 L 0,320 Z`}
                    fill="url(#gradient)"
                  />

                  {/* Line */}
                  <path
                    d={`M 0,${scaleY(chartData[0].y)} ${chartData.map((d: any, i: number) => `L ${(i / (chartData.length - 1)) * 100},${scaleY(d.y)}`).join(' ')}`}
                    fill="none"
                    stroke="#C0C1FF"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              )}
            </svg>

            {/* Time labels (first and last date) */}
            {chartData && chartData.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-[10px] text-[#c7c4d7] font-['JetBrains_Mono']">
                <span>{chartData[0].x}</span>
                <span>{chartData[chartData.length - 1].x}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial Indicators */}
        <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#c0c1ff] w-1 h-6 rounded-full" />
              <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
                Financial Indicators (Latest Quarter)
              </h2>
            </div>
            <button 
              onClick={exportPDF}
              className="text-[#c0c1ff] text-[12px] flex items-center gap-2 hover:underline bg-[rgba(192,193,255,0.1)] px-3 py-1.5 rounded transition-colors hover:bg-[rgba(192,193,255,0.2)]"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Report
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#1c1b1d] border-b border-[rgba(70,69,84,0.3)]">
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      BANK
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      CLOSE
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      VOLUME
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      PCT CHANGE
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      VOLATILITY
                      <Info className="size-3 text-[#9d9ba0]" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal">
                        Mức độ biến động giá (hiện tại tính minh họa 0.00%)
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      NIM (%)
                      <Info className="size-3 text-[#9d9ba0]" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal">
                        Net Interest Margin: Biên lãi ròng
                      </div>
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">
                    <div className="group relative inline-flex items-center gap-1 cursor-help">
                      CASA RATIO
                      <Info className="size-3 text-[#9d9ba0]" />
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal">
                        Tỷ lệ tiền gửi không kỳ hạn
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {financials?.map((row: any, i: number) => (
                  <tr key={row.code} className="border-b border-[rgba(70,69,84,0.1)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded flex items-center justify-center text-[10px] font-bold ${
                          i === 0 ? 'bg-[#4EDEA3]' : i === 1 ? 'bg-[#C0C1FF]' : i === 2 ? 'bg-[#8083FF]' : i === 3 ? 'bg-[#4EDEA3]' : 'bg-[#FF516A]'
                        }`}>
                          {row.code}
                        </div>
                        <span className="text-[#e5e1e4] text-[12px]">{row.bank}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.closePrice?.toFixed(2) || '0.00'}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{(row.volume / 1000000).toFixed(2)}M</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-[12px] text-[10px] font-bold ${
                        (row.pctChange || 0) > 0 
                          ? 'bg-[rgba(78,222,163,0.1)] text-[#4EDEA3] border border-[rgba(78,222,163,0.2)]'
                          : (row.pctChange || 0) < 0 
                          ? 'bg-[rgba(255,81,106,0.1)] text-[#FF516A] border border-[rgba(255,81,106,0.2)]'
                          : 'bg-[rgba(192,193,255,0.1)] text-[#C0C1FF] border border-[rgba(192,193,255,0.2)]'
                      }`}>
                        {(row.pctChange || 0) > 0 ? '+' : ''}{row.pctChange?.toFixed(2) || '0.00'}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.volatility?.toFixed(2) || '0.00'}%</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.nim?.toFixed(2) || '0.00'}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.casaRatio?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Copilot Observation */}
        <div className="mt-6 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[rgba(192,193,255,0.2)] border border-[rgba(192,193,255,0.3)] rounded-[12px] size-10 flex items-center justify-center shrink-0">
              <svg className="size-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#C0C1FF" />
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#C0C1FF" strokeWidth="2" />
              </svg>
            </div>
            <div>
              <h3 className="text-[#e5e1e4] text-[16px] font-medium mb-2">Copilot Observation</h3>
              <p className="text-[#c7c4d7] text-[14px] leading-relaxed">
                Thanh khoản thị trường đạt mức {((kpis?.totalVolume || 0) / 1000000).toFixed(1)} triệu đơn vị.
                Xu hướng trung bình toàn ngành {((kpis?.avgPctChange || 0) > 0 ? 'tăng' : 'giảm')} {(kpis?.avgPctChange || 0).toFixed(2)}% trong quý gần nhất.
                Mô hình Machine Learning phát hiện {kpis?.anomalies} phiên giao dịch có biến động bất thường cần lưu ý.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
