'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Bell,
  Settings2, ChevronLeft, ChevronRight, Plus, Star,
} from 'lucide-react';
import { cn, hashColor } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { Avatar } from '@/components/ui/avatar';
import { useAuthStore } from '@/stores/authStore';

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/projects',          label: 'Projects',      icon: FolderOpen },
  { href: '/my-tasks',          label: 'My Tasks',      icon: CheckSquare },
  { href: '/notifications',     label: 'Notifications', icon: Bell },
  { href: '/settings/profile',  label: 'Settings',      icon: Settings2 },
];

const MOCK_FAVORITES = [
  { id: '1', name: 'Website Redesign',   color: '#6366f1' },
  { id: '2', name: 'Q3 Marketing',       color: '#f97316' },
];

export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const profile = useAuthStore((s) => s.profile);

  const displayName = profile?.full_name ?? profile?.name ?? profile?.email ?? 'User';

  return (
    <aside className={cn(
      'flex flex-col h-full bg-[#f1f5f9] border-r border-[#e2e8f0] transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-14' : 'w-60'
    )}>
      {/* Logo + collapse */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-[#e2e8f0]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-[#6366f1] text-lg">
            <span className="h-7 w-7 rounded-lg bg-[#6366f1] text-white flex items-center justify-center text-sm font-bold">T</span>
            TaskHI
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <span className="h-7 w-7 rounded-lg bg-[#6366f1] text-white flex items-center justify-center text-sm font-bold">T</span>
          </Link>
        )}
        {!collapsed && (
          <button onClick={toggle} className="p-1 rounded hover:bg-[#e2e8f0] text-[#64748b] transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={toggle} className="mx-auto mt-2 p-1 rounded hover:bg-[#e2e8f0] text-[#64748b] transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-3 px-2 py-1.5 rounded-md text-sm font-medium transition-colors',
                active ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#475569] hover:bg-[#e2e8f0] hover:text-[#334155]',
                collapsed && 'justify-center px-0'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}

        {/* Favorites */}
        {!collapsed && (
          <div className="pt-4">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Favorites</span>
              <Link href="/projects" className="text-[#94a3b8] hover:text-[#6366f1]">
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
            {MOCK_FAVORITES.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/list`}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm text-[#475569] hover:bg-[#e2e8f0] transition-colors',
                  pathname.includes(p.id) && 'bg-[#e2e8f0] text-[#334155]'
                )}
              >
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="truncate">{p.name}</span>
                <Star className="h-3 w-3 ml-auto text-amber-400 fill-amber-400" />
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* User */}
      <div className={cn('border-t border-[#e2e8f0] p-3', collapsed && 'flex justify-center')}>
        <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
          <Avatar name={displayName} avatarUrl={profile?.avatar_url ?? undefined} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#334155] truncate">{displayName}</p>
              <p className="text-xs text-[#94a3b8] truncate">{profile?.email ?? ''}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
