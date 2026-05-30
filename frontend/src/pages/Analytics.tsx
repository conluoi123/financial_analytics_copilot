import { useState, useEffect } from 'react';
import { Filter, Download, Activity, X, TrendingUp, TrendingDown, AlertTriangle, BarChart2 } from 'lucide-react';

export function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  useEffect(() => {
    fetch(`/api/analytics?t=${new Date().getTime()}`)
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
  }, []);

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

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-[#c0c1ff] flex flex-col items-center">
          <Activity className="size-8 animate-pulse mb-4" />
          <p className="font-['Space_Grotesk'] text-lg">Scanning for anomalies in DuckDB...</p>
        </div>
      </div>
    );
  }

  const anomalyData = data.anomalies || [];
  const totalAnomalies = anomalyData.length;
  const criticalCount = anomalyData.filter((a: any) => a.severity === 'CRITICAL').length;
  const highCount = anomalyData.filter((a: any) => a.severity === 'HIGH').length;
  const mediumCount = anomalyData.filter((a: any) => a.severity === 'MEDIUM').length;

  const filteredData = filterSeverity === 'ALL'
    ? anomalyData
    : anomalyData.filter((a: any) => a.severity === filterSeverity);

  const severityMeta: Record<string, { color: string; bg: string; border: string; label: string }> = {
    CRITICAL: { color: '#ff516a', bg: 'rgba(255,81,106,0.1)', border: 'rgba(255,81,106,0.3)', label: 'Nghiêm trọng' },
    HIGH:     { color: '#ffb4ab', bg: 'rgba(255,180,171,0.1)', border: 'rgba(255,180,171,0.3)', label: 'Cao' },
    MEDIUM:   { color: '#8083ff', bg: 'rgba(128,131,255,0.1)', border: 'rgba(128,131,255,0.3)', label: 'Trung bình' },
  };

  const featureDesc: Record<string, string> = {
    'Volume Surge':     'Khối lượng giao dịch tăng đột biến so với trung bình. Có thể là tín hiệu mua/bán lớn từ tổ chức.',
    'Price Crash':      'Giá giảm mạnh trong ngắn hạn. Rủi ro cao, cần kiểm tra thông tin bất lợi từ thị trường.',
    'Price Surge':      'Giá tăng nóng vượt ngưỡng thông thường. Có thể là mua đuổi hoặc thông tin tích cực đột xuất.',
    'Volatility Spike': 'Biến động giá trong phiên ở mức bất thường. Tâm lý thị trường không ổn định.',
  };

  return (
    <div className="p-6 relative">
      {/* Detail Panel Overlay */}
      {selectedAnomaly && (
        <div
          className="fixed inset-0 z-50 flex"
          onClick={() => setSelectedAnomaly(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm" />

          {/* Side Panel */}
          <div
            className="relative ml-auto h-full w-[420px] bg-[#18181b] border-l border-[#3f3f46] flex flex-col overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#3f3f46]">
              <div>
                <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px] mb-1">Anomaly Detail</p>
                <h2 className="text-[#e5e1e4] text-[20px] font-bold font-['Space_Grotesk']">
                  {selectedAnomaly.ticker}
                  <span className="ml-2 text-[#c0c1ff] text-[14px] font-normal">#{selectedAnomaly.id}</span>
                </h2>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="text-[#c7c4d7] hover:text-[#e5e1e4] hover:bg-[rgba(70,69,84,0.3)] p-2 rounded-lg transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Severity Badge */}
            <div className="px-6 py-4 border-b border-[rgba(70,69,84,0.3)]">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold"
                style={{
                  backgroundColor: severityMeta[selectedAnomaly.severity]?.bg,
                  color: severityMeta[selectedAnomaly.severity]?.color,
                  border: `1px solid ${severityMeta[selectedAnomaly.severity]?.border}`,
                }}
              >
                <AlertTriangle className="size-3.5" />
                {selectedAnomaly.severity} — {severityMeta[selectedAnomaly.severity]?.label}
              </span>
            </div>

            {/* Core Stats */}
            <div className="p-6 border-b border-[rgba(70,69,84,0.3)]">
              <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px] mb-3">Chi tiết sự kiện</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[rgba(32,31,34,0.8)] border border-[rgba(70,69,84,0.2)] rounded p-3">
                  <p className="text-[#9d9ba0] text-[10px] uppercase mb-1">Ngày</p>
                  <p className="text-[#e5e1e4] text-[14px] font-['JetBrains_Mono'] font-bold">{selectedAnomaly.date}</p>
                </div>
                <div className="bg-[rgba(32,31,34,0.8)] border border-[rgba(70,69,84,0.2)] rounded p-3">
                  <p className="text-[#9d9ba0] text-[10px] uppercase mb-1">Mã CK</p>
                  <p className="text-[#c0c1ff] text-[14px] font-['JetBrains_Mono'] font-bold">{selectedAnomaly.ticker}</p>
                </div>
                <div className="bg-[rgba(32,31,34,0.8)] border border-[rgba(70,69,84,0.2)] rounded p-3">
                  <p className="text-[#9d9ba0] text-[10px] uppercase mb-1">Loại bất thường</p>
                  <p className="text-[#e5e1e4] text-[13px]">{selectedAnomaly.feature}</p>
                </div>
                <div className="bg-[rgba(32,31,34,0.8)] border border-[rgba(70,69,84,0.2)] rounded p-3">
                  <p className="text-[#9d9ba0] text-[10px] uppercase mb-1">AI Score (Z-Score)</p>
                  <p
                    className="text-[14px] font-['JetBrains_Mono'] font-bold"
                    style={{ color: severityMeta[selectedAnomaly.severity]?.color }}
                  >
                    {selectedAnomaly.aiScore}σ
                  </p>
                </div>
              </div>
            </div>

            {/* Z-Score Visual */}
            <div className="p-6 border-b border-[rgba(70,69,84,0.3)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px]">Mức độ Z-Score</p>
                <p className="text-[#c7c4d7] text-[11px] font-['JetBrains_Mono']">{selectedAnomaly.aiScore}σ / 8σ max</p>
              </div>
              <div className="h-3 bg-[#353437] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((selectedAnomaly.aiScore / 8) * 100, 100)}%`,
                    background: `linear-gradient(90deg, ${severityMeta[selectedAnomaly.severity]?.color}80, ${severityMeta[selectedAnomaly.severity]?.color})`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#6b7280] font-['JetBrains_Mono']">
                <span>0σ Normal</span>
                <span>3σ Threshold</span>
                <span>5σ Critical</span>
                <span>8σ Extreme</span>
              </div>
            </div>

            {/* Interpretation */}
            <div className="p-6 border-b border-[rgba(70,69,84,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="size-4 text-[#c0c1ff]" />
                <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px]">Phân tích & Giải thích</p>
              </div>
              <p className="text-[#e5e1e4] text-[13px] leading-relaxed">
                {featureDesc[selectedAnomaly.feature] || 'Biến động bất thường được mô hình Isolation Forest phát hiện.'}
              </p>
            </div>

            {/* AI Recommendation */}
            <div className="p-6">
              <div className="bg-[rgba(192,193,255,0.05)] border-l-2 border-l-[#c0c1ff] border border-[rgba(192,193,255,0.1)] rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#C0C1FF" />
                    <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#C0C1FF" strokeWidth="2" />
                  </svg>
                  <p className="text-[#c0c1ff] text-[12px] font-semibold">Copilot Recommendation</p>
                </div>
                <p className="text-[#c7c4d7] text-[12px] leading-relaxed">
                  {selectedAnomaly.severity === 'CRITICAL'
                    ? `Sự kiện ở mức CRITICAL (${selectedAnomaly.aiScore}σ). Kiểm tra ngay thông tin vĩ mô và tình hình giao dịch của ${selectedAnomaly.ticker} trong vòng 3 phiên trước và sau ngày ${selectedAnomaly.date}.`
                    : selectedAnomaly.severity === 'HIGH'
                    ? `Z-Score ở mức cao (${selectedAnomaly.aiScore}σ). Theo dõi thêm diễn biến của ${selectedAnomaly.ticker} trong vài phiên tới để xác nhận xu hướng.`
                    : `Mức trung bình (${selectedAnomaly.aiScore}σ), chưa cần hành động ngay. Ghi nhận để theo dõi dài hạn.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-[#c0c1ff] text-[24px] font-bold font-['Space_Grotesk'] mb-2">
          FinSight Copilot
        </h1>
        <p className="text-[#c7c4d7] text-[14px]">Real-time anomaly detection and analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Anomalies', value: totalAnomalies, color: '#c0c1ff', sub: 'Last 30 Days' },
          { label: 'Critical Priority', value: criticalCount, color: '#ff516a', sub: 'Z-Score > 5σ' },
          { label: 'High Severity', value: highCount, color: '#ffb4ab', sub: `${totalAnomalies > 0 ? Math.round((highCount / totalAnomalies) * 100) : 0}% of total` },
          { label: 'Medium Severity', value: mediumCount, color: '#8083ff', sub: 'Manual review req.' },
        ].map((card) => (
          <div key={card.label} className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[rgba(63,63,70,0.4)] rounded p-4 shadow-[0px_0px_20px_0px_rgba(192,193,255,0.08)]">
            <p className="text-[#c7c4d7] text-[12px] mb-2">{card.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[48px] font-bold leading-[56px] tracking-[-0.96px] font-['Space_Grotesk']" style={{ color: card.color }}>
                {card.value}
              </span>
              <span className="text-[#c7c4d7] text-[12px]">{card.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Live Anomaly Feed */}
        <div className="col-span-2 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px]">
          <div className="bg-[rgba(32,31,34,0.3)] border-b border-[rgba(70,69,84,0.3)] px-4 py-4 flex items-center justify-between">
            <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
              Live Anomaly Feed
            </h2>
            <div className="flex gap-2">
              {/* Severity Filter */}
              <div className="bg-[#1c1b1d] border border-[rgba(70,69,84,0.3)] rounded p-0.5 flex gap-1">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterSeverity(s)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                      filterSeverity === s
                        ? 'bg-[#c0c1ff] text-[#1000a9]'
                        : 'text-[#c7c4d7] hover:bg-[rgba(70,69,84,0.3)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button className="bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] px-3 py-1.5 rounded text-[#e5e1e4] text-[12px] flex items-center gap-2 hover:bg-[rgba(70,69,84,0.3)] transition-colors">
                <Download className="size-3.5" />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto h-[600px]">
            <table className="w-full">
              <thead className="bg-[#1c1b1d] sticky top-0">
                <tr>
                  {['DATE', 'TICKER', 'FEATURE', 'AI SCORE (Z-SCORE)', 'SEVERITY', 'ACTIONS'].map((h, i) => (
                    <th key={h} className={`py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)] ${i === 5 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((anomaly: any) => (
                  <tr
                    key={anomaly.id}
                    className="border-b border-[rgba(70,69,84,0.08)] hover:bg-[rgba(192,193,255,0.03)] transition-colors cursor-pointer"
                    onClick={() => setSelectedAnomaly(anomaly)}
                  >
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{anomaly.date}</td>
                    <td className="py-4 px-4 text-[#c0c1ff] text-[16px] font-bold">{anomaly.ticker}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px]">{anomaly.feature}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-[#353437] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min((anomaly.aiScore / 8) * 100, 100)}%`,
                              backgroundColor: anomaly.severity === 'CRITICAL' ? '#ff516a' : anomaly.severity === 'HIGH' ? '#ffb4ab' : '#8083ff',
                            }}
                          />
                        </div>
                        <span className="text-[#e5e1e4] text-[12px] font-['JetBrains_Mono'] w-10 text-right">{anomaly.aiScore}σ</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className="px-2 py-1 rounded-[12px] text-[10px] font-bold"
                        style={{
                          backgroundColor: anomaly.severity === 'CRITICAL' ? 'rgba(255,81,106,0.1)' : anomaly.severity === 'HIGH' ? 'rgba(255,180,171,0.1)' : 'rgba(128,131,255,0.1)',
                          color: anomaly.severity === 'CRITICAL' ? '#ff516a' : anomaly.severity === 'HIGH' ? '#ffb4ab' : '#8083ff',
                          border: `1px solid ${anomaly.severity === 'CRITICAL' ? 'rgba(255,81,106,0.3)' : anomaly.severity === 'HIGH' ? 'rgba(255,180,171,0.3)' : 'rgba(128,131,255,0.3)'}`,
                        }}
                      >
                        {anomaly.severity}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        className="text-[#c0c1ff] text-[12px] hover:underline px-3 py-1 rounded border border-[rgba(192,193,255,0.2)] hover:bg-[rgba(192,193,255,0.1)] transition-colors"
                        onClick={(e) => { e.stopPropagation(); setSelectedAnomaly(anomaly); }}
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6b7280] text-[14px]">
                      Không có điểm bất thường nào với mức lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Panels */}
        <div className="space-y-6">
          {/* Score Distribution */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
            <h3 className="text-[#e5e1e4] text-[18px] font-medium mb-4">Score Distribution</h3>
            <div className="space-y-3">
              {[
                { label: 'CRITICAL', count: criticalCount, color: '#ff516a', total: totalAnomalies },
                { label: 'HIGH', count: highCount, color: '#ffb4ab', total: totalAnomalies },
                { label: 'MEDIUM', count: mediumCount, color: '#8083ff', total: totalAnomalies },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.label}</span>
                    <span className="text-[11px] text-[#c7c4d7] font-['JetBrains_Mono']">{item.count} / {item.total}</span>
                  </div>
                  <div className="h-2 bg-[#353437] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${item.total > 0 ? (item.count / item.total) * 100 : 0}%`,
                        backgroundColor: item.color,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copilot Suggestion */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border-l-2 border-l-[#c0c1ff] border border-[#3f3f46] rounded-[8px] p-6">
            <div className="flex items-start gap-4">
              <div className="bg-[rgba(192,193,255,0.2)] border border-[rgba(192,193,255,0.3)] rounded-[12px] size-10 flex items-center justify-center shrink-0">
                <svg className="size-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#C0C1FF" />
                  <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="#C0C1FF" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h3 className="text-[#e5e1e4] text-[16px] font-medium mb-2">Copilot Suggestion</h3>
                <p className="text-[#c7c4d7] text-[14px] leading-relaxed">
                  Hệ thống Isolation Forest phát hiện <strong className="text-[#e5e1e4]">{totalAnomalies}</strong> điểm bất thường.
                  Bấm <span className="text-[#c0c1ff]">View Details →</span> trên từng dòng để xem phân tích chi tiết và gợi ý của AI.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
