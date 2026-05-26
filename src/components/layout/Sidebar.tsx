import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  FolderOpen, CheckSquare, Star, Plus, LogOut, Home, Pencil, Palette, Archive, ChevronRight, Bell,
  List, Kanban, LayoutList, Calendar,
  Rocket, Users, TrendingUp,
  Bug, Lightbulb, Globe, Settings,
  BookOpen, Monitor, CheckCircle, Target,
  Code, Megaphone, MessageCircle, Briefcase,
  Image, Mountain, Flower2, LayoutDashboard,
  Shuffle, Gauge, Award, Scissors,
  ShoppingBasket, Map, Ticket, Compass,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn, getInitials, PROJECT_COLORS } from '../../lib/utils'
import { Project } from '../../types'
import { supabase } from '../../lib/supabase'

const ICON_MAP: Record<string, LucideIcon> = {
  List, Kanban, LayoutList, Calendar,
  Rocket, Users, TrendingUp, Star,
  Bug, Lightbulb, Globe, Settings,
  BookOpen, Monitor, CheckCircle, Target,
  Code, Megaphone, MessageCircle, Briefcase,
  Image, Mountain, Flower2, LayoutDashboard,
  Shuffle, Gauge, Award, Scissors,
  ShoppingBasket, Map, Ticket, Compass,
}

const PROJECT_ICON_NAMES = Object.keys(ICON_MAP)

function ProjectIconBadge({ project }: { project: Project }) {
  const Icon = project.icon ? ICON_MAP[project.icon] : undefined
  return (
    <span
      className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-white"
      style={{ background: project.color }}
    >
      {Icon
        ? <Icon size={12} strokeWidth={2.5} />
        : <span className="text-[11px] font-bold leading-none">{project.name[0]?.toUpperCase()}</span>
      }
    </span>
  )
}

interface SidebarProps {
  projects: Project[]
  onNewProject: () => void
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
  const favorites = projects.filter(p => p.is_favorite)
  const activeProjects = projects.filter(p => p.status === 'active')
  const archivedProjects = projects.filter(p => p.status === 'archived')

  const [contextMenu, setContextMenu] = useState<{ project: Project; x: number; y: number } | null>(null)
  const [showColorPanel, setShowColorPanel] = useState(false)
  const [renameProject, setRenameProject] = useState<Project | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showArchived, setShowArchived] = useState(false)
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

  const menuX = contextMenu ? Math.min(contextMenu.x, window.innerWidth - 224) : 0
  const menuY = contextMenu ? Math.min(contextMenu.y, window.innerHeight - 520) : 0

  const isArchived = contextMenu?.project.status === 'archived'

  return (
    <aside className="w-64 shrink-0 h-screen bg-[#1e1f21] flex flex-col">
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

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <NavLink to="/dashboard" className={navClass}>
          <Home size={15} /> Home
        </NavLink>
        <NavLink to="/my-tasks" className={navClass}>
          <CheckSquare size={15} /> My Tasks
        </NavLink>
        <NavLink to="/inbox" className={navClass}>
          <Bell size={15} />
          Inbox
          {unreadCount > 0 && (
            <span className="ml-auto bg-primary-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </NavLink>
        <NavLink to="/projects" end className={navClass}>
          <FolderOpen size={15} /> Projects
        </NavLink>

        {/* Archived — collapsed sub-item under Projects */}
        {archivedProjects.length > 0 && (
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
            {showArchived && archivedProjects.map(p => (
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
            ))}
          </div>
        )}

        {/* Starred */}
        <div className="pt-5">
          <p className="px-3 text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">
            Starred
          </p>
          {favorites.map(p => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={navClass}
              onContextMenu={e => openContextMenu(e, p)}
            >
              <ProjectIconBadge project={p} />
              <span className="truncate">{p.name}</span>
              <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />
            </NavLink>
          ))}
        </div>

        {/* All active projects */}
        <div className="pt-5">
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Projects</p>
            <button
              onClick={onNewProject}
              className="p-0.5 rounded hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
              title="New project"
            >
              <Plus size={14} />
            </button>
          </div>
          {activeProjects.map(p => (
            <NavLink
              key={p.id}
              to={`/projects/${p.id}`}
              className={navClass}
              onContextMenu={e => openContextMenu(e, p)}
            >
              <ProjectIconBadge project={p} />
              <span className="truncate">{p.name}</span>
              {p.is_favorite && <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />}
            </NavLink>
          ))}
          {activeProjects.length === 0 && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/40 hover:text-white/70 w-full transition-colors"
            >
              <Plus size={14} /> New project
            </button>
          )}
        </div>

      </nav>

      {/* Context Menu */}
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
              <ChevronRight
                size={13}
                className={cn('ml-auto text-slate-300 transition-transform', showColorPanel && 'rotate-90')}
              />
            </button>
          )}

          {showColorPanel && !isArchived && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/60">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Color</p>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {PROJECT_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => handleSetColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full transition-transform hover:scale-110',
                      contextMenu.project.color === c && 'ring-2 ring-offset-1 ring-slate-500'
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Icon</p>
              <div className="grid grid-cols-4 gap-0.5">
                {PROJECT_ICON_NAMES.map(name => {
                  const Icon = ICON_MAP[name]
                  return (
                    <button
                      key={name}
                      onClick={() => handleSetIcon(name)}
                      title={name}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded hover:bg-slate-200 transition-colors',
                        contextMenu.project.icon === name && 'bg-slate-200 ring-1 ring-primary-400'
                      )}
                    >
                      <Icon size={16} className="text-slate-600" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 my-1" />

          {isArchived ? (
            <button
              onClick={handleUnarchive}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={14} className="text-slate-400 shrink-0" />
              Unarchive project
            </button>
          ) : (
            <button
              onClick={handleArchive}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Archive size={14} className="shrink-0" />
              Archive project
            </button>
          )}
        </div>
      )}

      {/* Rename modal */}
      {renameProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onMouseDown={() => setRenameProject(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-72"
            onMouseDown={e => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-slate-700 mb-2">Rename project</p>
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename()
                if (e.key === 'Escape') setRenameProject(null)
              }}
              className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
              placeholder="Project name"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setRenameProject(null)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="text-xs bg-primary-600 text-white rounded-md px-3 py-1.5 hover:bg-primary-700 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
