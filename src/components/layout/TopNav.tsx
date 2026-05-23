'use client';
import { Search, Bell, Plus } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/button';

interface TopNavProps {
  title?: string;
  actions?: React.ReactNode;
}

export function TopNav({ title, actions }: TopNavProps) {
  const openSearch = useUIStore((s) => s.openSearch);
  const toggleNotifications = useUIStore((s) => s.toggleNotifications);

  return (
    <header className="h-12 border-b border-[#e2e8f0] flex items-center justify-between px-4 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-sm font-semibold text-[#1e293b]">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <button
          onClick={openSearch}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#e2e8f0] bg-[#f8fafc] text-sm text-[#94a3b8] hover:border-[#6366f1]/40 hover:text-[#6366f1] transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search…</span>
          <kbd className="hidden sm:inline text-[10px] bg-[#e2e8f0] px-1.5 rounded font-mono">⌘K</kbd>
        </button>
        <button
          onClick={toggleNotifications}
          className="relative p-2 rounded-md hover:bg-[#f1f5f9] text-[#64748b] transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#6366f1]" />
        </button>
      </div>
    </header>
  );
}
