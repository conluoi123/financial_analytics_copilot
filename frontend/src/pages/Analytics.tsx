import { Filter, Download } from 'lucide-react';
import type { Anomaly } from '../types';

const anomalyData: Anomaly[] = [
  {
    id: '1',
    date: '2023-10-24 14:22',
    ticker: 'JPM',
    feature: 'NPL Spike',
    aiScore: 0.98,
    severity: 'CRITICAL',
  },
  {
    id: '2',
    date: '2023-10-24 12:05',
    ticker: 'GS',
    feature: 'Volume Surge',
    aiScore: 0.82,
    severity: 'HIGH',
  },
  {
    id: '3',
    date: '2023-10-24 10:15',
    ticker: 'BAC',
    feature: 'Margin Compression',
    aiScore: 0.76,
    severity: 'HIGH',
  },
  {
    id: '4',
    date: '2023-10-24 09:44',
    ticker: 'HSBC',
    feature: 'Tier 1 Capital Shift',
    aiScore: 0.54,
    severity: 'MEDIUM',
  },
  {
    id: '5',
    date: '2023-10-23 23:10',
    ticker: 'MS',
    feature: 'Unusual Derivative Flow',
    aiScore: 0.48,
    severity: 'MEDIUM',
  },
];

const tabs = [
  { path: '/', label: 'Overview' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/activity', label: 'Activity' },
];

export function Analytics() {
  const totalAnomalies = 7;
  const criticalCount = 1;
  const highCount = 2;
  const mediumCount = 4;

  return (
    <div className="p-6">
        <div className="mb-8">
          <h1 className="text-[#c0c1ff] text-[24px] font-bold font-['Space_Grotesk'] mb-2">
            FinSight Copilot
          </h1>
          <p className="text-[#c7c4d7] text-[14px]">Real-time anomaly detection and analysis</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[rgba(63,63,70,0.4)] rounded p-4 shadow-[0px_0px_20px_0px_rgba(192,193,255,0.08)]">
            <p className="text-[#c7c4d7] text-[12px] mb-2">Total Anomalies</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[#c0c1ff] text-[48px] font-bold leading-[56px] tracking-[-0.96px] font-['Space_Grotesk']">
                {totalAnomalies}
              </span>
              <span className="text-[#4edea3] text-[12px]">+2 from yesterday</span>
            </div>
          </div>

          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[rgba(63,63,70,0.4)] rounded p-4">
            <p className="text-[#c7c4d7] text-[12px] mb-2">Critical Priority</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[#ff516a] text-[48px] font-bold leading-[56px] tracking-[-0.96px] font-['Space_Grotesk']">
                {criticalCount}
              </span>
              <svg className="size-1 text-[#ff516a]" viewBox="0 0 3 14" fill="currentColor">
                <rect width="3" height="14" rx="1.5" />
              </svg>
            </div>
          </div>

          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[rgba(63,63,70,0.4)] rounded p-4">
            <p className="text-[#c7c4d7] text-[12px] mb-2">High Severity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[#ffb4ab] text-[48px] font-bold leading-[56px] tracking-[-0.96px] font-['Space_Grotesk']">
                {highCount}
              </span>
              <span className="text-[#c7c4d7] text-[12px]">28% of total</span>
            </div>
          </div>

          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[rgba(63,63,70,0.4)] rounded p-4">
            <p className="text-[#c7c4d7] text-[12px] mb-2">Medium Severity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-[#8083ff] text-[48px] font-bold leading-[56px] tracking-[-0.96px] font-['Space_Grotesk']">
                {mediumCount}
              </span>
              <span className="text-[#c7c4d7] text-[12px]">Manual review req.</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Live Anomaly Feed */}
          <div className="col-span-2 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px]">
            <div className="bg-[rgba(32,31,34,0.3)] border-b border-[rgba(70,69,84,0.3)] px-4 py-4 flex items-center justify-between">
              <h2 className="text-[#e5e1e4] text-[20px] font-medium font-['Space_Grotesk']">
                Live Anomaly Feed
              </h2>
              <div className="flex gap-2">
                <button className="bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] px-3 py-1.5 rounded text-[#e5e1e4] text-[12px] flex items-center gap-2 hover:bg-[rgba(70,69,84,0.3)] transition-colors">
                  <Filter className="size-3.5" />
                  Filter
                </button>
                <button className="bg-[#2a2a2c] border border-[rgba(70,69,84,0.5)] px-3 py-1.5 rounded text-[#e5e1e4] text-[12px] flex items-center gap-2 hover:bg-[rgba(70,69,84,0.3)] transition-colors">
                  <Download className="size-3.5" />
                  Export
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#1c1b1d]">
                  <tr>
                    <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">DATE</th>
                    <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">TICKER</th>
                    <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">FEATURE</th>
                    <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">AI SCORE</th>
                    <th className="text-left py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">SEVERITY</th>
                    <th className="text-right py-3 px-4 text-[#c7c4d7] text-[11px] font-bold tracking-[0.55px] uppercase border-b border-[rgba(70,69,84,0.3)]">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalyData.map((anomaly) => (
                    <tr key={anomaly.id}>
                      <td className="py-4 px-4 text-[#e5e1e4] text-[12px] font-['JetBrains_Mono']">
                        {anomaly.date}
                      </td>
                      <td className="py-4 px-4 text-[#c0c1ff] text-[16px] font-bold">
                        {anomaly.ticker}
                      </td>
                      <td className="py-4 px-4 text-[#e5e1e4] text-[12px]">
                        {anomaly.feature}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-[#353437] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                anomaly.severity === 'CRITICAL'
                                  ? 'bg-[#ff516a]'
                                  : anomaly.severity === 'HIGH'
                                  ? 'bg-[#ffb4ab]'
                                  : 'bg-[#8083ff]'
                              }`}
                              style={{ width: `${anomaly.aiScore * 100}%` }}
                            />
                          </div>
                          <span className="text-[#e5e1e4] text-[12px] font-['JetBrains_Mono'] w-10 text-right">
                            {anomaly.aiScore}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-[12px] text-[10px] font-bold ${
                            anomaly.severity === 'CRITICAL'
                              ? 'bg-[rgba(255,81,106,0.1)] text-[#ff516a] border border-[rgba(255,81,106,0.3)]'
                              : anomaly.severity === 'HIGH'
                              ? 'bg-[rgba(255,180,171,0.1)] text-[#ffb4ab] border border-[rgba(255,180,171,0.3)]'
                              : 'bg-[rgba(128,131,255,0.1)] text-[#8083ff] border border-[rgba(128,131,255,0.3)]'
                          }`}
                        >
                          {anomaly.severity}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="text-[#c0c1ff] text-[12px] hover:underline">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Score Distribution & Anomalies per Entity */}
          <div className="space-y-6">
            {/* Score Distribution */}
            <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#e5e1e4] text-[18px] font-medium">Score Distribution</h3>
                <button className="text-[#c7c4d7] hover:text-[#e5e1e4]">
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
              
              <div className="relative h-[200px] flex items-center justify-center">
                <svg className="size-full" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="30" fill="#ff516a" opacity="0.3" />
                  <circle cx="160" cy="80" r="20" fill="#ff516a" opacity="0.4" />
                  <circle cx="170" cy="140" r="15" fill="#ffb4ab" opacity="0.5" />
                  <circle cx="90" cy="160" r="25" fill="#ffb4ab" opacity="0.4" />
                  <circle cx="130" cy="50" r="18" fill="#ffb4ab" opacity="0.6" />
                  <circle cx="40" cy="100" r="22" fill="#8083ff" opacity="0.5" />
                  <circle cx="60" cy="60" r="16" fill="#8083ff" opacity="0.4" />
                  <circle cx="140" cy="180" r="12" fill="#8083ff" opacity="0.3" />
                </svg>
                <div className="absolute right-4 top-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#ff516a]" />
                    <span className="text-[10px] text-[#c7c4d7]">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#ffb4ab]" />
                    <span className="text-[10px] text-[#c7c4d7]">High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-[#8083ff]" />
                    <span className="text-[10px] text-[#c7c4d7]">Med</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Anomalies per Entity */}
            <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-6">
              <h3 className="text-[#e5e1e4] text-[18px] font-medium mb-4">Anomalies per Entity</h3>
              
              <div className="space-y-3">
                {[
                  { name: 'JPMORGAN CHASE', count: 3, color: '#ff516a' },
                  { name: 'GOLDMAN SACHS', count: 2, color: '#ffb4ab' },
                  { name: 'BANK OF AMERICA', count: 1, color: '#ffb4ab' },
                  { name: 'MORGAN STANLEY', count: 1, color: '#8083ff' },
                ].map((entity) => (
                  <div key={entity.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase font-['JetBrains_Mono']">
                        {entity.name}
                      </span>
                      <span className="text-[#e5e1e4] text-[12px] font-medium">
                        {entity.count} Alert{entity.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="bg-[#353437] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(entity.count / 3) * 100}%`,
                          backgroundColor: entity.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-4 border border-[rgba(70,69,84,0.3)] rounded py-2 text-[#c7c4d7] text-[12px] hover:bg-[rgba(70,69,84,0.2)] transition-colors">
                View Full Risk Analysis
              </button>
            </div>
          </div>
        </div>

        {/* Copilot Suggestion */}
        <div className="mt-6 backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border-l-2 border-l-[#c0c1ff] border border-[#3f3f46] rounded-[8px] p-6">
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
                The JPM NPL Spike (Score 0.98) correlates with a 15% increase in non-performing loans within the commercial 
                real estate sector. FinSight recommends a stress-test review of all Tier 2 banking assets with similar exposure.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
}
