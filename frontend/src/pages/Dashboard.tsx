import { TrendingUp, TrendingDown, Building2, Activity, LineChart, AlertTriangle } from 'lucide-react';
import type { KPICard, FinancialIndicator } from '../types';

const kpiData: KPICard[] = [
  {
    title: 'BANKS TRACKED',
    value: 5,
    subtitle: 'Active VN Ecosystem',
    trend: 'up',
    trendValue: '',
    icon: 'building',
    color: '#C0C1FF',
  },
  {
    title: 'AVG NPL RATIO',
    value: '1.2%',
    subtitle: '0.1% since last Q',
    trend: 'up',
    trendValue: '0.1%',
    icon: 'activity',
    color: '#4EDEA3',
  },
  {
    title: 'AVG NIM',
    value: '3.4%',
    subtitle: '0.05% improvement',
    trend: 'up',
    trendValue: '0.05%',
    icon: 'trending-up',
    color: '#4EDEA3',
  },
  {
    title: 'ANOMALIES',
    value: 7,
    subtitle: '+2 detected today',
    trend: 'up',
    trendValue: '+2',
    icon: 'alert',
    color: '#FFB2B7',
  },
];

const financialData: FinancialIndicator[] = [
  {
    bank: 'Vietcombank',
    code: 'VCB',
    nim: 3.42,
    nplRatio: 1.21,
    car: 9.12,
    roe: 24.5,
    roa: 1.82,
    ldr: 78.2,
  },
  {
    bank: 'BIDV',
    code: 'BID',
    nim: 2.88,
    nplRatio: 2.14,
    car: 8.95,
    roe: 18.2,
    roa: 1.05,
    ldr: 84.5,
  },
  {
    bank: 'VietinBank',
    code: 'CTG',
    nim: 3.1,
    nplRatio: 1.88,
    car: 9.05,
    roe: 17.1,
    roa: 1.12,
    ldr: 82.1,
  },
  {
    bank: 'Military Bank',
    code: 'MBB',
    nim: 4.5,
    nplRatio: 1.35,
    car: 10.2,
    roe: 25.1,
    roa: 2.1,
    ldr: 75.5,
  },
  {
    bank: 'Techcombank',
    code: 'TCB',
    nim: 4.05,
    nplRatio: 1.62,
    car: 15.1,
    roe: 19.8,
    roa: 2.65,
    ldr: 76.8,
  },
];

const chartData = Array.from({ length: 50 }, (_, i) => ({
  x: i,
  y: 150 + Math.sin(i * 0.2) * 30 + i * 2 + Math.random() * 10,
}));

const tabs = [
  { path: '/', label: 'Overview' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/activity', label: 'Activity' },
];

export function Dashboard() {
  return (
    <div className="p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {kpiData.map((card, index) => (
            <div
              key={index}
              className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-4 shadow-[0px_0px_20px_0px_rgba(192,193,255,0.08)]"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-[#c7c4d7] text-[12px] tracking-[0.6px] uppercase font-['JetBrains_Mono']">
                  {card.title}
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
                Stock Price Analysis
              </h2>
            </div>
            <div className="bg-[#1c1b1d] border border-[rgba(70,69,84,0.3)] rounded-[4px] p-1 flex gap-2">
              {['VCB', 'BID', 'CTG', 'MBB', 'TCB'].map((ticker, i) => (
                <button
                  key={ticker}
                  className={`px-3 py-1 rounded-[2px] text-[12px] font-medium transition-colors ${
                    i === 0
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
          <div className="relative h-[320px]">
            <svg className="w-full h-full" preserveAspectRatio="none">
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
                  x2="100%"
                  y2={64 + i * 64}
                  stroke="rgba(70,69,84,0.1)"
                  strokeWidth="1"
                />
              ))}

              {/* Area fill */}
              <path
                d={`M 0,${320 - chartData[0].y} ${chartData.map((d, i) => `L ${(i / chartData.length) * 100}%,${320 - d.y}`).join(' ')} L 100%,320 L 0,320 Z`}
                fill="url(#gradient)"
              />

              {/* Line */}
              <path
                d={`M 0,${320 - chartData[0].y} ${chartData.map((d, i) => `L ${(i / chartData.length) * 100}%,${320 - d.y}`).join(' ')}`}
                fill="none"
                stroke="#C0C1FF"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />

              {/* Trend line */}
              <line
                x1="0"
                y1="250"
                x2="100%"
                y2="150"
                stroke="#FFB2B7"
                strokeWidth="1.5"
                strokeDasharray="5 3"
                opacity="0.8"
              />
            </svg>

            {/* Time labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-[10px] text-[#c7c4d7] font-['JetBrains_Mono']">
              <span>AUG 2023</span>
              <span>SEP 2023</span>
              <span>OCT 2023</span>
              <span>NOV 2023</span>
            </div>
          </div>
        </div>

        {/* Financial Indicators */}
        <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#c0c1ff] w-1 h-6 rounded-full" />
              <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
                Financial Indicators
              </h2>
            </div>
            <button className="text-[#c0c1ff] text-[12px] flex items-center gap-2 hover:underline">
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
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">BANK</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">NIM (%)</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">NPL RATIO</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">CAR (%)</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">ROE (%)</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">ROA (%)</th>
                  <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase">LDR (%)</th>
                </tr>
              </thead>
              <tbody>
                {financialData.map((row, i) => (
                  <tr key={row.code} className="border-b border-[rgba(70,69,84,0.1)]">
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
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.nim}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-[12px] text-[10px] font-bold ${
                        row.nplRatio < 1.5 
                          ? 'bg-[rgba(78,222,163,0.1)] text-[#4EDEA3] border border-[rgba(78,222,163,0.2)]'
                          : row.nplRatio < 2 
                          ? 'bg-[rgba(255,178,171,0.1)] text-[#FFB4AB] border border-[rgba(255,178,171,0.2)]'
                          : 'bg-[rgba(255,81,106,0.1)] text-[#FF516A] border border-[rgba(255,81,106,0.2)]'
                      }`}>
                        {row.nplRatio}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.car}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.roe}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.roa}</td>
                    <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">{row.ldr}</td>
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
                NIM compression is evident across State-Owned Commercial Banks (SOCBs) due to rising cost of funds, however,
                private banks like MBB and TCB maintain resilience through high CASA ratios. NPL ratios are trending downward,
                but a 2-anomaly spike in SME loan buckets requires immediate audit.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
