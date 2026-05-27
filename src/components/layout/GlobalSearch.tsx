import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, FolderOpen, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface Result {
  type: 'task' | 'project'
  id: string
  title: string
  projectId?: string
}

export function GlobalSearch() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const [{ data: tasks }, { data: projects }] = await Promise.all([
      supabase.from('tasks').select('id, title, project_id').ilike('title', `%${q}%`).eq('created_by', user!.id).limit(6),
      supabase.from('projects').select('id, name').ilike('name', `%${q}%`).eq('owner_id', user!.id).limit(4),
    ])
    setResults([
      ...(projects ?? []).map(p => ({ type: 'project' as const, id: p.id, title: p.name })),
      ...(tasks ?? []).map(t => ({ type: 'task' as const, id: t.id, title: t.title, projectId: t.project_id })),
    ])
    setLoading(false)
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250)
    return () => clearTimeout(timer)
  }, [query, search])

  function handleSelect(r: Result) {
    if (r.type === 'project') navigate(`/projects/${r.id}`)
    else navigate(`/projects/${r.projectId}?task=${r.id}`)
    setQuery('')
    setOpen(false)
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search tasks and projects…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-primary-300 focus:ring-1 focus:ring-primary-300 transition-all placeholder-slate-400"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setResults([]) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={13} />
          </button>
        ) : (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 font-medium hidden sm:block">
            ⌘K
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
          {loading ? (
            <p className="px-4 py-3 text-sm text-slate-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</p>
          ) : (
            <div className="py-1">
              {results.some(r => r.type === 'project') && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Projects</p>
              )}
              {results.filter(r => r.type === 'project').map(r => (
                <button key={r.id} onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-50 text-left transition-colors">
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-primary-50">
                    <FolderOpen size={13} className="text-primary-500" />
                  </div>
                  <span className="text-sm text-slate-800 truncate">{r.title}</span>
                </button>
              ))}
              {results.some(r => r.type === 'task') && (
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tasks</p>
              )}
              {results.filter(r => r.type === 'task').map(r => (
                <button key={r.id} onClick={() => handleSelect(r)}
                  className="flex items-center gap-3 w-full px-4 py-2 hover:bg-slate-50 text-left transition-colors">
                  <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-slate-100">
                    <FileText size={13} className="text-slate-500" />
                  </div>
                  <span className="text-sm text-slate-800 truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
