import { useState } from 'react';
import { Send, Plus, Sparkles } from 'lucide-react';
import type { ChatMessage, DataLayer } from '../types';

const initialMessages: ChatMessage[] = [];

const suggestedQueries = [
  'Which bank has the highest NPL risk currently?',
  "Forecast VCB's dividend payout for Q4",
  'What is the correlation between FED rates and my portfolio?',
];

const dataLayers: DataLayer[] = [
  { name: 'Stock Performance', enabled: true, icon: 'trending-up' },
  { name: 'Financial Statements', enabled: true, icon: 'file-text' },
  { name: 'Anomalies & Risks', enabled: true, icon: 'alert-triangle' },
];

const tabs = [
  { path: '/', label: 'Overview' },
  { path: '/insights', label: 'Analytics' },
  { path: '/activity', label: 'Activity' },
];

export function AIInsights() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      const data = await response.json();
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.error ? `Error: ${data.error}` : data.response,
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I couldn't connect to the FinSight Brain. Please make sure the backend server is running.",
        timestamp: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex gap-6">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="bg-[rgba(192,193,255,0.2)] border border-[rgba(192,193,255,0.3)] rounded-[12px] size-10 flex items-center justify-center shrink-0">
                    <Sparkles className="size-5 text-[#c0c1ff]" />
                  </div>
                )}

                <div className={`max-w-[70%] ${message.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className={`rounded-[8px] p-4 ${
                      message.role === 'user'
                        ? 'bg-[rgba(192,193,255,0.9)] rounded-tr-none shadow-lg'
                        : 'bg-[#201f22] border border-[rgba(70,69,84,0.3)] rounded-tl-none'
                    }`}
                  >
                    <p
                      className={`text-[16px] leading-relaxed whitespace-pre-wrap ${
                        message.role === 'user' ? 'text-[#1000a9]' : 'text-[#e5e1e4]'
                      }`}
                    >
                      {message.content}
                    </p>
                  </div>
                  <p className="text-[#c7c4d7] text-[10px] font-['JetBrains_Mono'] mt-1 px-1">
                    {message.timestamp}
                  </p>
                </div>

                {message.role === 'user' && (
                  <div className="bg-[#c0c1ff] rounded-[12px] size-10 flex items-center justify-center shrink-0">
                    <svg className="size-4" fill="#1000A9" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-4 justify-start">
                <div className="bg-[rgba(192,193,255,0.2)] border border-[rgba(192,193,255,0.3)] rounded-[12px] size-10 flex items-center justify-center shrink-0">
                  <Sparkles className="size-5 text-[#c0c1ff] animate-pulse" />
                </div>
                <div className="max-w-[70%]">
                  <div className="bg-[#201f22] border border-[rgba(70,69,84,0.3)] rounded-[8px] rounded-tl-none p-4">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-[#c7c4d7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-[#c7c4d7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-[#c7c4d7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-[rgba(24,24,27,0.6)] border border-[rgba(70,69,84,0.3)] rounded-[8px] p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask FinSight Copilot anything about your financials..."
                className="flex-1 bg-transparent text-[#e5e1e4] text-[14px] placeholder:text-[#6b7280] outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-[#c0c1ff] hover:bg-[#a0a1df] disabled:bg-[rgba(192,193,255,0.3)] disabled:cursor-not-allowed text-[#1000a9] px-4 py-2 rounded-[4px] flex items-center gap-2 transition-colors"
              >
                <Send className="size-4" />
                <span className="text-[12px] font-medium">Send</span>
              </button>
            </div>
            <p className="text-[#6b7280] text-[10px] mt-2">
              AI may provide inaccurate information. Please verify with official documents.
            </p>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[360px] space-y-4">
          {/* Active Context */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#e5e1e4] text-[16px] font-medium">Active Context</h3>
              <span className="bg-[rgba(78,222,163,0.1)] border border-[rgba(78,222,163,0.2)] text-[#4edea3] px-2 py-0.5 rounded text-[10px] font-bold">
                SYNCHRONIZED
              </span>
            </div>

            {/* Source Entities */}
            <div className="mb-4">
              <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase mb-2">
                SOURCE ENTITIES
              </p>
              <div className="flex gap-2">
                {['VCB', 'BID', 'CTG', 'TCB'].map((ticker) => (
                  <button
                    key={ticker}
                    className="px-3 py-1.5 bg-[rgba(192,193,255,0.1)] border border-[rgba(192,193,255,0.2)] rounded text-[#c0c1ff] text-[11px] font-medium hover:bg-[rgba(192,193,255,0.15)] transition-colors"
                  >
                    {ticker}
                  </button>
                ))}
                <button className="px-3 py-1.5 border border-[rgba(70,69,84,0.3)] rounded text-[#c7c4d7] text-[11px] hover:bg-[rgba(70,69,84,0.2)] transition-colors">
                  + Add
                </button>
              </div>
            </div>

            {/* Data Layers */}
            <div>
              <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase mb-3">
                DATA LAYERS
              </p>
              <div className="space-y-2">
                {dataLayers.map((layer) => (
                  <div key={layer.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {layer.icon === 'trending-up' && (
                        <svg className="size-4 text-[#4edea3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      )}
                      {layer.icon === 'file-text' && (
                        <svg className="size-4 text-[#c0c1ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                      {layer.icon === 'alert-triangle' && (
                        <svg className="size-4 text-[#ffb4ab]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <span className="text-[#e5e1e4] text-[12px]">{layer.name}</span>
                    </div>
                    <div
                      className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${
                        layer.enabled ? 'bg-[#4edea3]' : 'bg-[#353437]'
                      }`}
                      onClick={() => {}}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          layer.enabled ? 'right-0.5' : 'left-0.5'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Queries */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="size-4 text-[#c0c1ff]" />
              <h3 className="text-[#e5e1e4] text-[14px] font-medium">Suggested Queries</h3>
            </div>
            <div className="space-y-2">
              {suggestedQueries.map((query, i) => (
                <button
                  key={i}
                  onClick={() => setInput(query)}
                  className="w-full text-left p-3 bg-[rgba(32,31,34,0.5)] border border-[rgba(70,69,84,0.2)] rounded hover:bg-[rgba(32,31,34,0.8)] hover:border-[rgba(192,193,255,0.3)] transition-all"
                >
                  <p className="text-[#c7c4d7] text-[12px] leading-relaxed">{query}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Live Sensitivity Heatmap */}
          <div className="backdrop-blur-[6px] bg-[rgba(24,24,27,0.6)] border border-[#3f3f46] rounded-[8px] p-4">
            <div className="mb-3">
              <p className="text-[#c7c4d7] text-[10px] tracking-[0.5px] uppercase mb-1">
                AUGUST PULSE VISUALIZATION
              </p>
              <h3 className="text-[#e5e1e4] text-[14px] font-medium">Live Sensitivity Heatmap</h3>
            </div>
            <div className="relative h-[140px] rounded overflow-hidden">
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-0.5">
                {Array.from({ length: 48 }).map((_, i) => {
                  const intensity = Math.random();
                  return (
                    <div
                      key={i}
                      className="rounded-sm transition-all hover:scale-110"
                      style={{
                        backgroundColor: `rgba(${
                          intensity > 0.7
                            ? '255, 81, 106'
                            : intensity > 0.4
                            ? '192, 193, 255'
                            : '78, 222, 163'
                        }, ${0.3 + intensity * 0.7})`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
