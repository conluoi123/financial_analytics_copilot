import { NavLink } from 'react-router';
import { Home, Activity, MessageSquare, Building2 } from 'lucide-react';

export function Sidebar() {
  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/dashboard/anomaly-monitor', icon: Activity, label: 'Anomaly Monitor' },
    { path: '/dashboard/ai-copilot', icon: MessageSquare, label: 'AI Copilot' },
    { path: '/dashboard/banks-overview', icon: Building2, label: 'Banks Overview' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1a1a1d] border-r border-[#2a2a2f] flex flex-col">
      <div className="p-6 border-b border-[#2a2a2f]">
        <h1 className="text-xl font-semibold text-[#e5e1e4]">Financial Analytics</h1>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-[#2a2a2f] text-[#e5e1e4]'
                      : 'text-[#9d9ba0] hover:bg-[#22222a] hover:text-[#e5e1e4]'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#2a2a2f]">
        <div className="text-sm text-[#9d9ba0]">
          <p>© 2026 Financial Analytics</p>
        </div>
      </div>
    </aside>
  );
}
