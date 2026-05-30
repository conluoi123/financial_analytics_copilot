import { useState, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, ChevronRight, Activity, Info, X, BarChart2, Building2, AlertTriangle } from 'lucide-react';

export function BankAccounts() {
  const [filter, setFilter] = useState<'All' | 'Watch' | 'Normal'>('All');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedBank, setSelectedBank] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/banks?t=${new Date().getTime()}`)
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
          <Activity className="size-8 mb-4" />
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
          <p className="font-['Space_Grotesk'] text-lg">Loading Banks Data from DuckDB...</p>
        </div>
      </div>
    );
  }

  const banksData = data.banks || [];
  
  const filteredBanks = banksData.filter((bank: any) => {
    if (filter === 'All') return true;
    if (filter === 'Watch') return bank.status === 'WATCH' || bank.status === 'ALERT';
    return bank.status === 'NORMAL';
  });

  return (
    <div className="p-6 relative">
      {/* Bank Detail Panel */}
      {selectedBank && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedBank(null)}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.7)] backdrop-blur-sm" />
          <div
            className="relative ml-auto h-full w-[440px] bg-[#18181b] border-l border-[#3f3f46] flex flex-col overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#3f3f46]">
              <div className="flex items-center gap-3">
                <div className="bg-[rgba(192,193,255,0.1)] border border-[rgba(192,193,255,0.2)] size-12 rounded-lg flex items-center justify-center">
                  <Building2 className="size-6 text-[#c0c1ff]" />
                </div>
                <div>
                  <h2 className="text-[#e5e1e4] text-[20px] font-bold font-['Space_Grotesk']">{selectedBank.code}</h2>
                  <p className="text-[#c7c4d7] text-[13px]">{selectedBank.name}</p>
                </div>
              </div>
              <button onClick={() => setSelectedBank(null)} className="text-[#c7c4d7] hover:text-[#e5e1e4] p-2 rounded-lg hover:bg-[rgba(70,69,84,0.3)] transition-colors">
                <X className="size-5" />
              </button>
            </div>

            {/* Status */}
            <div className="px-6 py-4 border-b border-[rgba(70,69,84,0.3)]">
              {(() => {
                const c = selectedBank.status === 'NORMAL' ? '#4EDEA3' : selectedBank.status === 'WATCH' ? '#FFB4AB' : '#FF516A';
                return (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-bold" style={{ backgroundColor: `${c}1A`, color: c, border: `1px solid ${c}33` }}>
                    <AlertTriangle className="size-3.5" />
                    Trạng thái: {selectedBank.status}
                  </span>
                );
              })()}
            </div>

            {/* Key Metrics */}
            <div className="p-6 border-b border-[rgba(70,69,84,0.3)]">
              <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px] mb-3">Chỉ số tài chính</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'NIM', value: `${selectedBank.nim?.toFixed(2)}%`, desc: 'Biên lãi ròng' },
                  { label: 'NPL', value: `${selectedBank.npl?.toFixed(2)}%`, desc: 'Tỷ lệ nợ xấu' },
                  { label: 'CASA', value: `${selectedBank.car?.toFixed(2)}%`, desc: 'Tiền gửi KKH' },
                ].map((m) => (
                  <div key={m.label} className="bg-[rgba(32,31,34,0.8)] border border-[rgba(70,69,84,0.2)] rounded p-3 text-center">
                    <p className="text-[#9d9ba0] text-[9px] uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-[#e5e1e4] text-[18px] font-bold font-['JetBrains_Mono']">{m.value}</p>
                    <p className="text-[#6b7280] text-[9px] mt-0.5">{m.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Chart */}
            <div className="p-6 border-b border-[rgba(70,69,84,0.3)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[#c7c4d7] text-[11px] uppercase tracking-[0.55px]">Xu hướng giá 10 phiên</p>
                <div className="flex items-center gap-1">
                  {selectedBank.trend > 0 ? (
                    <TrendingUp className="size-3.5 text-[#4edea3]" />
                  ) : (
                    <TrendingDown className="size-3.5 text-[#ff516a]" />
                  )}
                  <span className={`text-[13px] font-bold font-['JetBrains_Mono'] ${selectedBank.trend > 0 ? 'text-[#4edea3]' : 'text-[#ff516a]'}`}>
                    {selectedBank.trend > 0 ? '+' : ''}{selectedBank.trend?.toFixed(2)}%
                  </span>
                </div>
              </div>
              {(() => {
                const td = selectedBank.trendData || [];
                const mn = Math.min(...td), mx = Math.max(...td);
                const sy = (v: number) => mx === mn ? 40 : 80 - ((v - mn) / (mx - mn)) * 60;
                const strokeColor = selectedBank.status === 'NORMAL' ? '#4EDEA3' : selectedBank.status === 'WATCH' ? '#FFB4AB' : '#FF516A';
                return (
                  <div className="h-24 rounded overflow-hidden bg-[rgba(32,31,34,0.5)] p-2">
                    <svg className="w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="bankGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {td.length > 0 && (
                        <>
                          <path
                            d={`M 0,${sy(td[0])} ${td.map((v: number, i: number) => `L ${(i/(td.length-1))*100},${sy(v)}`).join(' ')} L 100,80 L 0,80 Z`}
                            fill="url(#bankGrad)"
                          />
                          <path
                            d={`M 0,${sy(td[0])} ${td.map((v: number, i: number) => `L ${(i/(td.length-1))*100},${sy(v)}`).join(' ')}`}
                            fill="none" stroke={strokeColor} strokeWidth="2.5" vectorEffect="non-scaling-stroke"
                          />
                          {td.map((v: number, i: number) => (
                            <circle key={i} cx={(i/(td.length-1))*100} cy={sy(v)} r="1.5" fill={strokeColor} vectorEffect="non-scaling-stroke" />
                          ))}
                        </>
                      )}
                    </svg>
                  </div>
                );
              })()}
              <div className="flex justify-between mt-1 text-[9px] text-[#6b7280] font-['JetBrains_Mono']">
                <span>T-10</span><span>Hôm nay</span>
              </div>
            </div>

            {/* Price Label */}
            <div className="p-6">
              <div className="bg-[rgba(192,193,255,0.05)] border-l-2 border-l-[#c0c1ff] border border-[rgba(192,193,255,0.1)] rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart2 className="size-4 text-[#c0c1ff]" />
                  <p className="text-[#c0c1ff] text-[12px] font-semibold">Copilot Nhận xét</p>
                </div>
                <p className="text-[#c7c4d7] text-[12px] leading-relaxed">
                  {selectedBank.status === 'ALERT'
                    ? `${selectedBank.name} đang có biến động giá lớn (${selectedBank.trend?.toFixed(2)}%). Cần theo dõi sát diễn biến và kiểm tra tin tức liên quan.`
                    : selectedBank.status === 'WATCH'
                    ? `${selectedBank.name} có xu hướng biến động nhẹ. Tiếp tục theo dõi trong các phiên tiếp theo.`
                    : `${selectedBank.name} đang giao dịch ổn định. Không phát hiện dấu hiệu bất thường.`}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[#e5e1e4] text-[24px] font-semibold font-['Space_Grotesk'] mb-2">
            Institutional Banks Overview
          </h1>
          <p className="text-[#c7c4d7] text-[16px]">
            Monitoring {banksData.length} core financial institutions in real-time.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center justify-between mb-6">
          <div className="bg-[#1c1b1d] border border-[rgba(70,69,84,0.2)] rounded-[4px] p-1 flex gap-2">
            {(['All', 'Watch', 'Normal'] as const).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-4 py-1.5 rounded-[2px] text-[12px] font-['JetBrains_Mono'] transition-colors ${
                  filter === option
                    ? 'bg-[#c0c1ff] text-[#1000a9] shadow-sm'
                    : 'text-[#c7c4d7] hover:bg-[rgba(70,69,84,0.2)]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Banks Grid */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          {filteredBanks.map((bank: any) => {
            const statusColor =
              bank.status === 'NORMAL'
                ? '#4EDEA3'
                : bank.status === 'WATCH'
                ? '#FFB4AB'
                : '#FF516A';
                
            const trendData = bank.trendData || [];
            const minT = Math.min(...trendData);
            const maxT = Math.max(...trendData);

            return (
              <div
                key={bank.id}
                className="bg-[#201f22] border border-[rgba(70,69,84,0.2)] rounded shadow-[0px_0px_20px_0px_rgba(192,193,255,0.15)] relative overflow-hidden"
              >
                {/* Status Bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: statusColor }}
                />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#2a2a2c] border border-[rgba(70,69,84,0.3)] size-12 flex items-center justify-center rounded">
                        <span className="text-[#c0c1ff] text-[16px] font-bold font-['Space_Grotesk']">
                          {bank.code.substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                            {bank.code}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-[12px] text-[10px] font-bold"
                            style={{
                              backgroundColor: `${statusColor}1A`,
                              color: statusColor,
                              border: `1px solid ${statusColor}33`,
                            }}
                          >
                            {bank.status}
                          </span>
                        </div>
                        <p className="text-[#c7c4d7] text-[16px]">{bank.name}</p>
                      </div>
                    </div>
                    <button className="text-[#c7c4d7] hover:text-[#c0c1ff] transition-colors">
                      <Star className="size-5" />
                    </button>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1 flex items-center gap-1 group relative cursor-help">
                        NIM
                        <Info className="size-3 opacity-70" />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal shadow-xl">
                          Biên lãi ròng (Net Interest Margin)
                        </span>
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.nim?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1 flex items-center gap-1 group relative cursor-help">
                        NPL
                        <Info className="size-3 opacity-70" />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal shadow-xl">
                          Tỷ lệ nợ xấu (Non-performing Loan)
                        </span>
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.npl?.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1 flex items-center gap-1 group relative cursor-help">
                        CASA
                        <Info className="size-3 opacity-70" />
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-0 mb-1 px-2 py-1 bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] rounded text-[10px] text-[#e5e1e4] whitespace-nowrap z-10 pointer-events-none normal-case tracking-normal shadow-xl">
                          Tỷ lệ tiền gửi không kỳ hạn
                        </span>
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.car?.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#c7c4d7] text-[10px] font-bold tracking-[0.5px] uppercase">
                        10D TREND
                      </p>
                      <div className="flex items-center gap-1">
                        {bank.trend > 0 ? (
                          <TrendingUp className="size-3 text-[#4edea3]" />
                        ) : (
                          <TrendingDown className="size-3 text-[#ff516a]" />
                        )}
                        <span
                          className={`text-[12px] ${
                            bank.trend > 0 ? 'text-[#4edea3]' : 'text-[#ff516a]'
                          }`}
                        >
                          {bank.trend > 0 ? '+' : ''}
                          {bank.trend?.toFixed(2)}%
                        </span>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="h-12 relative">
                      <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                        {trendData.length > 0 && (
                          <path
                            d={`M 0,${maxT === minT ? 24 : 48 - ((trendData[0] - minT) / (maxT - minT)) * 48} ${trendData
                              .map(
                                (val: number, i: number) =>
                                  `L ${(i / (trendData.length - 1)) * 100},${
                                    maxT === minT ? 24 : 48 - ((val - minT) / (maxT - minT)) * 48
                                  }`
                              )
                              .join(' ')}`}
                            fill="none"
                            stroke={statusColor}
                            strokeWidth="2"
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </svg>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => setSelectedBank(bank)}
                    className="w-full border border-[rgba(70,69,84,0.3)] rounded py-2 text-[#c7c4d7] text-[12px] font-['JetBrains_Mono'] hover:bg-[rgba(192,193,255,0.08)] hover:border-[rgba(192,193,255,0.3)] hover:text-[#c0c1ff] transition-all flex items-center justify-center gap-2"
                  >
                    View Details
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
    </div>
  );
}
