import { Bell, Search, Settings, User } from 'lucide-react';

interface Tab {
  path: string;
  label: string;
}

interface HeaderProps {
  tabs?: Tab[];
}

export function Header({ tabs }: HeaderProps = {}) {
  return (
    <header className="h-16 bg-[#1a1a1d] border-b border-[#2a2a2f] flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9d9ba0]" />
          <input
            type="text"
            placeholder="Search transactions, reports..."
            className="w-full pl-10 pr-4 py-2 bg-[#131315] border border-[#2a2a2f] rounded-lg text-[#e5e1e4] placeholder:text-[#9d9ba0] focus:outline-none focus:border-[#3a3a3f] transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-lg hover:bg-[#22222a] transition-colors relative">
          <Bell className="w-5 h-5 text-[#9d9ba0]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>
        <button className="p-2 rounded-lg hover:bg-[#22222a] transition-colors">
          <Settings className="w-5 h-5 text-[#9d9ba0]" />
        </button>
        <button className="p-2 rounded-lg hover:bg-[#22222a] transition-colors">
          <User className="w-5 h-5 text-[#9d9ba0]" />
        </button>
      </div>
    </header>
  );
}
