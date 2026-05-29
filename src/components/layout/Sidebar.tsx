import { useState, useEffect, useRef, useCallback } from 'react'
import { NavLink, useNavigate, useLocation, Link } from 'react-router-dom'
import {
  FolderOpen, CheckSquare, Star, Plus, LogOut, Home, Pencil, Palette, Archive, ChevronRight, Bell,
  RotateCcw, Upload, BookOpen, Search, X, FileText, ListChecks, type LucideIcon,
  Briefcase, Target, Rocket, Calendar,
  Mountain, Compass, Globe, Leaf,
  Music, Camera, Sparkles,
  Heart, Coffee, PartyPopper, Smile,
  Zap, Flame, Trophy, Crown,
  Code, MessageCircle, Megaphone, Shield,
  Dumbbell, Bike, Plane, Anchor,
  Gem, Lightbulb, Sun,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn, getInitials, PROJECT_COLORS } from '../../lib/utils'
import { Project } from '../../types'
import { supabase } from '../../lib/supabase'
import { ProjectIconBadge } from '../ui/ProjectIconBadge'

const ICON_MAP: Record<string, LucideIcon> = {
  Briefcase, Target, Rocket, Calendar,
  Mountain, Compass, Globe, Leaf,
  Palette, Music, Camera, Sparkles,
  Heart, Coffee, PartyPopper, Smile,
  Zap, Flame, Trophy, Crown,
  Code, MessageCircle, Megaphone, Shield,
  Dumbbell, Bike, Plane, Anchor,
  Gem, Star, Lightbulb, Sun,
}

const PROJECT_ICON_NAMES = Object.keys(ICON_MAP)

interface SidebarProps {
  projects: Project[]
  onNewProject: () => void
}

interface SearchResult {
  type: 'task' | 'project'
  id: string
  title: string
  projectId?: string
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors',
    isActive
      ? 'bg-white/15 text-white font-medium'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  )

export function Sidebar({ projects, onNewProject }: SidebarProps) {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const favorites = projects.filter(p => p.is_favorite)
  const activeProjects = projects.filter(p => p.status === 'active')
  const ownedProjects = activeProjects.filter(p => p.owner_id === user?.id)
  const memberProjects = activeProjects.filter(p => p.owner_id !== user?.id)
  const archivedProjects = projects.filter(p => p.status === 'archived')

  const [showTasks, setShowTasks] = useState(location.pathname === '/my-tasks')
  const [contextMenu, setContextMenu] = useState<{ project: Project; x: number; y: number } | null>(null)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [renameProject, setRenameProject] = useState<Project | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const displayName = profile?.name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || '?'
  const avatarColor = profile?.avatar_color ?? '#6366f1'

  useEffect(() => {
    if (!user) return
    loadUnreadCount()
    const handler = () => loadUnreadCount()
    window.addEventListener('taskhi:notifications-changed', handler)
    return () => window.removeEventListener('taskhi:notifications-changed', handler)
  }, [user])

  async function loadUnreadCount() {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user!.id)
      .eq('is_read', false)
    setUnreadCount(count ?? 0)
  }

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const [{ data: tasks }, { data: projectData }] = await Promise.all([
      supabase.from('tasks').select('id, title, project_id').ilike('title', `%${q}%`).eq('created_by', user!.id).limit(6),
      supabase.from('projects').select('id, name').ilike('name', `%${q}%`).eq('owner_id', user!.id).limit(4),
    ])
    setSearchResults([
      ...(projectData ?? []).map(p => ({ type: 'project' as const, id: p.id, title: p.name })),
      ...(tasks ?? []).map(t => ({ type: 'task' as const, id: t.id, title: t.title, projectId: t.project_id })),
    ])
    setSearchLoading(false)
  }, [user])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(searchQuery), 250)
    return () => clearTimeout(timer)
  }, [searchQuery, runSearch])

  function handleSearchSelect(r: SearchResult) {
    if (r.type === 'project') navigate(`/projects/${r.id}`)
    else navigate(`/projects/${r.projectId}?task=${r.id}`)
    setSearchQuery('')
  }

  useEffect(() => {
    if (!contextMenu) return
    function onMouseDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    if (renameProject) requestAnimationFrame(() => renameInputRef.current?.focus())
  }, [renameProject])

  function openContextMenu(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ project, x: e.clientX, y: e.clientY })
    setShowColorPanel(false)
  }

  function closeMenu() {
    setContextMenu(null)
    setShowColorPanel(false)
    setUploadError(null)
  }

  async function handleRename() {
    if (!renameProject || !renameValue.trim()) { setRenameProject(null); return }
    await supabase.from('projects').update({ name: renameValue.trim() }).eq('id', renameProject.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
    setRenameProject(null)
  }

  async function handleSetColor(color: string) {
    if (!contextMenu) return
    await supabase.from('projects').update({ color }).eq('id', contextMenu.project.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
    closeMenu()
  }

  async function handleSetIcon(icon: string) {
    if (!contextMenu) return
    await supabase.from('projects').update({ icon }).eq('id', contextMenu.project.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
    closeMenu()
  }

  async function handleIconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!contextMenu || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const ext = file.name.split('.').pop() ?? 'png'
    const path = `${contextMenu.project.id}/${Date.now()}.${ext}`
    setUploading(true)
    setUploadError(null)
    const { error } = await supabase.storage.from('project-icons').upload(path, file)
    if (error) {
      setUploadError(error.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('project-icons').getPublicUrl(path)
    await supabase.from('projects').update({ icon: data.publicUrl }).eq('id', contextMenu.project.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
    setUploading(false)
    closeMenu()
  }

  async function handleArchive() {
    if (!contextMenu) return
    const p = contextMenu.project
    closeMenu()
    if (!confirm(`Archive "${p.name}"? It will be moved to the Archived section.`)) return
    await supabase.from('projects').update({ status: 'archived' }).eq('id', p.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
    navigate('/projects')
  }

  async function handleUnarchive() {
    if (!contextMenu) return
    const p = contextMenu.project
    closeMenu()
    await supabase.from('projects').update({ status: 'active' }).eq('id', p.id)
    window.dispatchEvent(new Event('taskhi:projects-changed'))
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const MENU_H = showColorPanel ? 480 : 148
  const menuX = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 232) : 0
  const menuY = contextMenu
    ? (contextMenu.y + MENU_H > window.innerHeight - 8
        ? Math.max(8, contextMenu.y - MENU_H)
        : contextMenu.y)
    : 0

  const isArchived = contextMenu?.project.status === 'archived'

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-[#1e1f21] flex flex-col z-10">
      {/* User row */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Link to="/profile" className="flex items-center gap-2.5 flex-1 min-w-0 group">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:opacity-80 transition-opacity"
              style={{ background: avatarColor }}
            >
              {getInitials(displayName)}
            </div>
            <span className="font-semibold text-white text-sm truncate group-hover:opacity-80 transition-opacity">
              {displayName}
            </span>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-6 py-1.5 text-xs bg-white/10 border border-white/10 rounded-md text-white placeholder-white/35 focus:outline-none focus:bg-white/15 focus:border-white/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 px-3 py-2 overflow-y-auto overscroll-y-contain scrollbar-thin">
        {searchQuery.trim() ? (
          searchLoading ? (
            <p className="px-3 py-2 text-xs text-white/35">Searching…</p>
          ) : searchResults.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/35">No results for "{searchQuery}"</p>
          ) : (
            <div className="space-y-0.5">
              {searchResults.some(r => r.type === 'project') && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Projects</p>
              )}
              {searchResults.filter(r => r.type === 'project').map(r => (
                <button key={r.id} onClick={() => handleSearchSelect(r)}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left">
                  <FolderOpen size={14} className="shrink-0" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
              {searchResults.some(r => r.type === 'task') && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Tasks</p>
              )}
              {searchResults.filter(r => r.type === 'task').map(r => (
                <button key={r.id} onClick={() => handleSearchSelect(r)}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors text-left">
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">{r.title}</span>
                </button>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-0.5">
            <NavLink to="/dashboard" className={navClass}>
              <Home size={15} /> Home
            </NavLink>
            <div>
              <button
                onClick={() => setShowTasks(v => !v)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm w-full text-left transition-colors',
                  location.pathname === '/my-tasks'
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <CheckSquare size={15} />
                Tasks
                <ChevronRight size={12} className={cn('ml-auto text-white/30 transition-transform', showTasks && 'rotate-90')} />
              </button>
              {showTasks && (
                <div className="mt-0.5 space-y-0.5">
                  {[
                    { view: 'assigned', label: 'Assigned to me' },
                    { view: 'projects', label: 'My projects' },
                  ].map(({ view, label }) => {
                    const active = location.pathname === '/my-tasks' && new URLSearchParams(location.search).get('view') === view
                    return (
                      <Link
                        key={view}
                        to={`/my-tasks?view=${view}`}
                        className={cn(
                          'flex items-center pl-9 pr-3 py-1.5 rounded-md text-sm transition-colors',
                          active ? 'bg-white/15 text-white font-medium' : 'text-white/60 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
            <NavLink to="/inbox" className={navClass}>
              <Bell size={15} />
              Inbox
              {unreadCount > 0 && (
                <span className="ml-auto bg-primary-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
            <NavLink to="/how-to" className={navClass}>
              <BookOpen size={15} /> How To
            </NavLink>
            <NavLink to="/predefined-tasks" className={navClass}>
              <ListChecks size={15} /> Task Templates
            </NavLink>
            <NavLink to="/projects" end className={navClass}>
              <FolderOpen size={15} /> Projects
            </NavLink>

            <div>
              <button
                onClick={() => setShowArchived(v => !v)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm w-full text-left text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
              >
                <Archive size={15} />
                Archived
                <ChevronRight
                  size={12}
                  className={cn('ml-auto text-white/30 transition-transform', showArchived && 'rotate-90')}
                />
              </button>
              {showArchived && (
                archivedProjects.length === 0
                  ? <p className="pl-8 pr-3 py-1.5 text-xs text-white/25">No archived projects</p>
                  : archivedProjects.map(p => (
                    <NavLink
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className={({ isActive }) => cn(
                        'flex items-center gap-2.5 pl-8 pr-3 py-1.5 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-white/15 text-white/70 font-medium'
                          : 'text-white/40 hover:bg-white/10 hover:text-white/60'
                      )}
                      onContextMenu={e => openContextMenu(e, p)}
                    >
                      <span
                        className="w-4 h-4 rounded flex items-center justify-center shrink-0 opacity-50"
                        style={{ background: p.color }}
                      >
                        <Archive size={9} />
                      </span>
                      <span className="truncate">{p.name}</span>
                    </NavLink>
                  ))
              )}
            </div>

            <div className="pt-5">
              <p className="px-3 text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Starred</p>
              {favorites.map(p => (
                <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass} onContextMenu={e => openContextMenu(e, p)}>
                  <ProjectIconBadge project={p} size="sm" />
                  <span className="truncate">{p.name}</span>
                  <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />
                </NavLink>
              ))}
            </div>

            <div className="pt-5">
              <div className="flex items-center justify-between px-3 mb-1">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">My Projects</p>
                <button onClick={onNewProject} className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors" title="New project">
                  <Plus size={14} />
                </button>
              </div>
              {ownedProjects.map(p => (
                <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass} onContextMenu={e => openContextMenu(e, p)}>
                  <ProjectIconBadge project={p} size="sm" />
                  <span className="truncate">{p.name}</span>
                  {p.is_favorite && <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />}
                </NavLink>
              ))}
              {ownedProjects.length === 0 && (
                <button onClick={onNewProject} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/40 hover:text-white/70 w-full transition-colors">
                  <Plus size={14} /> New project
                </button>
              )}
            </div>

            {memberProjects.length > 0 && (
              <div className="pt-5">
                <p className="px-3 text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">Member Of</p>
                {memberProjects.map(p => (
                  <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass} onContextMenu={e => openContextMenu(e, p)}>
                    <ProjectIconBadge project={p} size="sm" />
                    <span className="truncate">{p.name}</span>
                    {p.is_favorite && <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}
      </nav>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuY, left: menuX, zIndex: 9999 }}
          className="bg-white rounded-lg shadow-xl border border-slate-200 py-1 w-56"
        >
          {!isArchived && (
            <button
              onClick={() => {
                setRenameValue(contextMenu.project.name)
                setRenameProject(contextMenu.project)
                closeMenu()
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil size={14} className="text-slate-400 shrink-0" />
              Rename
            </button>
          )}
          {!isArchived && (
            <button
              onClick={() => setShowColorPanel(v => !v)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Palette size={14} className="text-slate-400 shrink-0" />
              Set color & icon
              <ChevronRight size={13} className={cn('ml-auto text-slate-300 transition-transform', showColorPanel && 'rotate-90')} />
            </button>
          )}
          {showColorPanel && !isArchived && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Color</p>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {PROJECT_COLORS.map(c => (
                  <button key={c} onClick={() => handleSetColor(c)}
                    className={cn('w-6 h-6 rounded-full transition-transform hover:scale-110', contextMenu.project.color === c && 'ring-2 ring-offset-1 ring-slate-500')}
                    style={{ background: c }} />
                ))}
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Icon</p>
              <label className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 mb-1 rounded-md border border-dashed transition-colors',
                uploading ? 'border-slate-200 text-slate-400 cursor-wait' : 'border-slate-300 hover:border-primary-400 hover:bg-primary-50 cursor-pointer text-slate-500 hover:text-primary-600'
              )}>
                <Upload size={13} className="shrink-0" />
                <span className="text-xs">{uploading ? 'Uploading…' : 'Upload image…'}</span>
                <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={handleIconUpload} />
              </label>
              {uploadError && <p className="text-[10px] text-red-500 mb-1 px-1 leading-snug">{uploadError}</p>}
              <div className="grid grid-cols-4 gap-0.5">
                {PROJECT_ICON_NAMES.map(name => {
                  const Icon = ICON_MAP[name]
                  return (
                    <button key={name} onClick={() => handleSetIcon(name)} title={name}
                      className={cn('w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 transition-colors', contextMenu.project.icon === name && 'bg-slate-200 ring-1 ring-primary-400')}>
                      <Icon size={16} className="text-slate-600" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="border-t border-slate-100 my-1" />
          {isArchived ? (
            <button onClick={handleUnarchive} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <RotateCcw size={14} className="text-slate-400 shrink-0" /> Unarchive project
            </button>
          ) : (
            <button onClick={handleArchive} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
              <Archive size={14} className="shrink-0" /> Archive project
            </button>
          )}
        </div>
      )}

      {renameProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onMouseDown={() => setRenameProject(null)}>
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-72" onMouseDown={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-slate-700 mb-2">Rename project</p>
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenameProject(null) }}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="Project name"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setRenameProject(null)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">Cancel</button>
              <button onClick={handleRename} className="text-xs bg-primary-600 text-white rounded-md px-3 py-1.5 hover:bg-primary-700 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
