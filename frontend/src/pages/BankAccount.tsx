import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import type { Bank } from '../types';

const banksData: Bank[] = [
  {
    id: '1',
    code: 'VCB',
    name: 'Vietcombank',
    status: 'NORMAL',
    nim: 3.42,
    npl: 0.68,
    car: 12.5,
    trend: 4.2,
    trendData: [2.8, 2.9, 3.1, 3.5, 3.2, 3.7, 3.4, 3.8, 3.6, 3.9],
  },
  {
    id: '2',
    code: 'BID',
    name: 'BIDV Bank',
    status: 'WATCH',
    nim: 2.85,
    npl: 1.54,
    car: 11.2,
    trend: -1.8,
    trendData: [3.2, 3.1, 2.9, 2.7, 2.8, 2.5, 2.4, 2.6, 2.3, 2.1],
  },
  {
    id: '3',
    code: 'TCB',
    name: 'Techcombank',
    status: 'NORMAL',
    nim: 4.1,
    npl: 0.92,
    car: 15.4,
    trend: 7.5,
    trendData: [3.5, 3.6, 3.8, 4.0, 4.1, 4.2, 4.3, 4.5, 4.4, 4.6],
  },
  {
    id: '4',
    code: 'STB',
    name: 'Sacombank',
    status: 'ALERT',
    nim: 3.12,
    npl: 2.45,
    car: 9.8,
    trend: -12.4,
    trendData: [3.8, 3.6, 3.4, 3.2, 3.0, 2.8, 2.9, 2.7, 2.5, 2.3],
  },
  {
    id: '5',
    code: 'MBB',
    name: 'Military Bank',
    status: 'NORMAL',
    nim: 5.2,
    npl: 1.22,
    car: 11.8,
    trend: 1.2,
    trendData: [4.8, 4.9, 5.0, 5.1, 5.0, 5.2, 5.1, 5.3, 5.2, 5.4],
  },
];

const tabs = [
  { path: '/', label: 'Overview' },
  { path: '/banks', label: 'Banks Analytics' },
  { path: '/activity', label: 'Activity' },
];

export function BankAccounts() {
  const [filter, setFilter] = useState<'All' | 'Watch' | 'Normal'>('All');

  const filteredBanks = banksData.filter((bank) => {
    if (filter === 'All') return true;
    if (filter === 'Watch') return bank.status === 'WATCH' || bank.status === 'ALERT';
    return bank.status === 'NORMAL';
  });

  return (
    <div className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[#e5e1e4] text-[24px] font-semibold font-['Space_Grotesk'] mb-2">
            Institutional Banks Overview
          </h1>
          <p className="text-[#c7c4d7] text-[16px]">
            Monitoring 24 core financial institutions in real-time.
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
          {filteredBanks.map((bank) => {
            const statusColor =
              bank.status === 'NORMAL'
                ? '#4EDEA3'
                : bank.status === 'WATCH'
                ? '#FFB4AB'
                : '#FF516A';

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
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1">
                        NIM
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.nim}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1">
                        NPL
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.npl}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-bold mb-1">
                        CAR
                      </p>
                      <p className="text-[#e5e1e4] text-[14px] font-medium tracking-[-0.14px] font-['JetBrains_Mono']">
                        {bank.car}%
                      </p>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#c7c4d7] text-[10px] font-bold tracking-[0.5px] uppercase">
                        30D TREND
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
                          {bank.trend}%
                        </span>
                      </div>
                    </div>

                    {/* Mini Chart */}
                    <div className="h-12 relative">
                      <svg className="w-full h-full" preserveAspectRatio="none">
                        <path
                          d={`M 0,${
                            48 - (bank.trendData[0] / 6) * 48
                          } ${bank.trendData
                            .map(
                              (val, i) =>
                                `L ${(i / (bank.trendData.length - 1)) * 100}%,${
                                  48 - (val / 6) * 48
                                }`
                            )
                            .join(' ')}`}
                          fill="none"
                          stroke={statusColor}
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button className="w-full border border-[rgba(70,69,84,0.3)] rounded py-2 text-[#c7c4d7] text-[12px] font-['JetBrains_Mono'] hover:bg-[rgba(70,69,84,0.2)] transition-colors flex items-center justify-center gap-2">
                    View Details
                    <ChevronRight className="size-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Comparative Yield Matrix */}
          <div className="col-span-2 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
                Comparative Yield Matrix
              </h2>
              <div className="flex items-center gap-4 text-[12px]">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm bg-[#8083ff]" />
                  <span className="text-[#c7c4d7]">Sector Avg</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm bg-[#c0c1ff]" />
                  <span className="text-[#c7c4d7]">Current Portfolio</span>
                </div>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 h-[300px]">
              {banksData.map((bank, i) => {
                const height = (bank.nim / 6) * 100;
                return (
                  <div key={bank.code} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full relative" style={{ height: `${height}%` }}>
                      <div className="absolute inset-x-0 bottom-0 bg-[#8083ff] rounded-t" />
                    </div>
                    <p className="text-[#c7c4d7] text-[10px] font-['JetBrains_Mono']">
                      {bank.code}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
            <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk'] mb-6">
              Risk Distribution
            </h2>

            {/* Donut Chart */}
            <div className="relative h-[200px] mb-6">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#4EDEA3"
                  strokeWidth="24"
                  strokeDasharray="308 440"
                  transform="rotate(-90 100 100)"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#FF516A"
                  strokeWidth="24"
                  strokeDasharray="44 440"
                  strokeDashoffset="-308"
                  transform="rotate(-90 100 100)"
                />
                <circle
                  cx="100"
                  cy="100"
                  r="70"
                  fill="none"
                  stroke="#FFB4AB"
                  strokeWidth="24"
                  strokeDasharray="88 440"
                  strokeDashoffset="-352"
                  transform="rotate(-90 100 100)"
                />
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  className="text-[12px] fill-[#c7c4d7] font-['JetBrains_Mono']"
                >
                  TOTAL ASSETS
                </text>
                <text
                  x="100"
                  y="115"
                  textAnchor="middle"
                  className="text-[20px] fill-[#e5e1e4] font-bold"
                >
                  $24.5B
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="space-y-3">
              {[
                { label: 'Low Risk', value: '70%', color: '#4EDEA3' },
                { label: 'Moderate', value: '20%', color: '#FFB4AB' },
                { label: 'High Alert', value: '10%', color: '#FF516A' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-3 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-[#c7c4d7] text-[12px]">{item.label}</span>
                  </div>
                  <span className="text-[#e5e1e4] text-[14px] font-medium">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copilot Analysis */}
        <div className="mt-6 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border-l-2 border-l-[#c0c1ff] border border-[#3f3f46] rounded-[8px] p-6">
          <div className="flex items-start gap-4">
            <div className="bg-[rgba(192,193,255,0.2)] border border-[rgba(192,193,255,0.3)] rounded-[12px] size-12 flex items-center justify-center shrink-0">
              <svg className="size-6" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#C0C1FF" />
                <path
                  d="M2 17L12 22L22 17M2 12L12 17L22 12"
                  stroke="#C0C1FF"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[#e5e1e4] text-[18px] font-medium mb-2">
                Copilot Analysis
              </h3>
              <p className="text-[#c7c4d7] text-[14px] leading-relaxed mb-4">
                System detected high sector correlation between TCB and MBB. Potential divergence in
                NPL ratios suggests a structural adjustment in risk models for Q3. Recommendation:
                Increase hedging on STB exposure.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[rgba(255,81,106,0.1)] border border-[rgba(255,81,106,0.2)] rounded-[12px] text-[#ff516a] text-[10px] font-bold">
                  SECTOR ALERT
                </span>
                <span className="px-3 py-1 bg-[rgba(192,193,255,0.1)] border border-[rgba(192,193,255,0.2)] rounded-[12px] text-[#c0c1ff] text-[10px] font-bold">
                  REAL-TIME
                </span>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
