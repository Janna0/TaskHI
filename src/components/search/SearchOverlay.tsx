'use client';
import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Search, X, Clock, FolderOpen, CheckSquare } from 'lucide-react';
import Link from 'next/link';

const RECENT_SEARCHES = ['Landing page', 'Website Redesign', 'Mobile App'];

const MOCK_RESULTS = [
  { type: 'project', id: '1', title: 'Website Redesign', sub: '24 tasks · Jun 15', href: '/projects/1/list' },
  { type: 'project', id: '2', title: 'Q3 Marketing Campaign', sub: '18 tasks · Jun 30', href: '/projects/2/list' },
  { type: 'task', id: 't1', title: 'Landing page mockup', sub: 'Website Redesign · In Progress', href: '/projects/1/list' },
  { type: 'task', id: 't4', title: 'Fix mobile nav bug', sub: 'Website Redesign · Blocked', href: '/projects/1/list' },
];

export function SearchOverlay() {
  const searchOpen = useUIStore((s) => s.searchOpen);
  const closeSearch = useUIStore((s) => s.closeSearch);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [searchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (searchOpen) closeSearch(); else useUIStore.getState().openSearch();
      }
      if (e.key === 'Escape') closeSearch();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchOpen, closeSearch]);

  if (!searchOpen) return null;

  const results = query.length > 0
    ? MOCK_RESULTS.filter(r => r.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={closeSearch}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#e2e8f0] overflow-hidden animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0]">
          <Search className="h-4 w-4 text-[#94a3b8] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, tasks…"
            className="flex-1 text-sm text-[#334155] bg-transparent outline-none placeholder:text-[#94a3b8]"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#94a3b8] hover:text-[#334155]">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="text-[10px] bg-[#f1f5f9] text-[#94a3b8] px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.length === 0 && (
            <div className="p-3">
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider mb-2 px-1">Recent</p>
              {RECENT_SEARCHES.map(s => (
                <button key={s} onClick={() => setQuery(s)}
                  className="flex items-center gap-2.5 w-full text-left px-2 py-2 rounded-md hover:bg-[#f8fafc] text-sm text-[#475569] transition-colors">
                  <Clock className="h-3.5 w-3.5 text-[#94a3b8]" />{s}
                </button>
              ))}
            </div>
          )}

          {query.length > 0 && results.length === 0 && (
            <div className="py-10 text-center text-sm text-[#94a3b8]">No results for &quot;{query}&quot;</div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {results.map(r => (
                <Link key={r.id} href={r.href} onClick={closeSearch}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#f8fafc] transition-colors">
                  {r.type === 'project'
                    ? <FolderOpen className="h-4 w-4 text-[#6366f1] flex-shrink-0" />
                    : <CheckSquare className="h-4 w-4 text-[#64748b] flex-shrink-0" />}
                  <div>
                    <p className="text-sm font-medium text-[#334155]">{r.title}</p>
                    <p className="text-xs text-[#94a3b8]">{r.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
