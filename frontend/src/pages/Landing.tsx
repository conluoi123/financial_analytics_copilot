import { ArrowRight, Activity, Cpu, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#131315] text-[#e5e1e4] font-['Space_Grotesk'] overflow-hidden selection:bg-[#c0c1ff] selection:text-[#1000a9]">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle,rgba(192,193,255,0.08)_0%,transparent_70%)] blur-[120px]" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(78,222,163,0.05)_0%,transparent_70%)] blur-[100px]" />
        <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[50%] rounded-full bg-[radial-gradient(ellipse,rgba(255,81,106,0.05)_0%,transparent_70%)] blur-[120px]" />
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTU5IDYwaC0xVjFoLTU4di0xaDYwdjYweiIgZmlsbD0icmdiYSg3MCwgNjksIDg0LCAwLjA1KSIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-50" />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="bg-[rgba(192,193,255,0.1)] border border-[rgba(192,193,255,0.2)] p-2 rounded-lg">
              <Building2 className="size-6 text-[#c0c1ff]" />
            </div>
            <span className="text-[20px] font-bold tracking-tight text-[#e5e1e4]">FinSight Copilot</span>
          </div>
          <button 
            onClick={() => navigate('/dashboard')}
            className="group relative px-6 py-2.5 rounded-full overflow-hidden border border-[rgba(192,193,255,0.3)] bg-[rgba(192,193,255,0.05)] hover:bg-[rgba(192,193,255,0.1)] transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2 text-[14px] font-medium text-[#c0c1ff]">
              Launch Platform
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-transparent via-[rgba(192,193,255,0.1)] to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-1000" />
          </button>
        </nav>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-8 pt-24 pb-32">
          <div className="flex flex-col items-center text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[rgba(78,222,163,0.1)] border border-[rgba(78,222,163,0.2)] text-[#4edea3] text-[12px] font-bold tracking-[0.5px] uppercase mb-8 shadow-[0_0_20px_rgba(78,222,163,0.2)]">
              <Sparkles className="size-3.5" />
              <span>AI-Powered Financial Analytics</span>
            </div>
            
            <h1 className="text-[64px] md:text-[80px] leading-[1.1] font-bold tracking-[-2px] mb-8 max-w-4xl">
              Decode the market with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c0c1ff] via-[#e5e1e4] to-[#4edea3] filter drop-shadow-lg">
                Machine Learning.
              </span>
            </h1>
            
            <p className="text-[18px] md:text-[20px] text-[#9d9ba0] max-w-2xl leading-relaxed mb-12">
              The next-generation platform for institutional banking analysis. 
              Real-time anomaly detection, intelligent financial modeling, and generative AI copilot.
            </p>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate('/dashboard')}
                className="group relative px-8 py-4 rounded-[4px] bg-[#c0c1ff] text-[#1000a9] font-bold text-[16px] transition-all hover:bg-[#a0a1df] hover:shadow-[0_0_40px_rgba(192,193,255,0.4)]"
              >
                <span className="flex items-center gap-2">
                  Enter Dashboard
                  <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="px-8 py-4 rounded-[4px] border border-[#3f3f46] text-[#e5e1e4] font-medium text-[16px] hover:bg-[#201f22] transition-colors">
                View Documentation
              </button>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group backdrop-blur-[12px] bg-[rgba(24,24,27,0.4)] border border-[#3f3f46] hover:border-[#c0c1ff] transition-colors duration-500 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c0c1ff] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-[rgba(192,193,255,0.1)] w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-[rgba(192,193,255,0.2)]">
                <Activity className="size-6 text-[#c0c1ff]" />
              </div>
              <h3 className="text-[20px] font-semibold mb-3">Real-time Analytics</h3>
              <p className="text-[#9d9ba0] text-[14px] leading-relaxed">
                Connects directly to DuckDB engine for blazingly fast querying of market data, KPI computations, and institutional bank tracking.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group backdrop-blur-[12px] bg-[rgba(24,24,27,0.4)] border border-[#3f3f46] hover:border-[#ff516a] transition-colors duration-500 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#ff516a] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-[rgba(255,81,106,0.1)] w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-[rgba(255,81,106,0.2)]">
                <ShieldAlert className="size-6 text-[#ff516a]" />
              </div>
              <h3 className="text-[20px] font-semibold mb-3">Anomaly Detection</h3>
              <p className="text-[#9d9ba0] text-[14px] leading-relaxed">
                Powered by Isolation Forest ML model. Automatically flags abnormal trading volumes and price spikes with detailed Z-Score severity levels.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group backdrop-blur-[12px] bg-[rgba(24,24,27,0.4)] border border-[#3f3f46] hover:border-[#4edea3] transition-colors duration-500 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4edea3] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="bg-[rgba(78,222,163,0.1)] w-12 h-12 rounded-lg flex items-center justify-center mb-6 border border-[rgba(78,222,163,0.2)]">
                <Cpu className="size-6 text-[#4edea3]" />
              </div>
              <h3 className="text-[20px] font-semibold mb-3">Generative AI Copilot</h3>
              <p className="text-[#9d9ba0] text-[14px] leading-relaxed">
                Chat natively with your financial data. The integrated LangChain AI agent understands complex financial indicators and provides actionable insights.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
