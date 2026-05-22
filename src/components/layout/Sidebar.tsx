import { NavLink, useNavigate, Link } from 'react-router-dom'
import { FolderOpen, CheckSquare, Star, Plus, LogOut, Home } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn, getInitials } from '../../lib/utils'
import { Project } from '../../types'

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

  const displayName = profile?.name || profile?.email?.split('@')[0] || user?.email?.split('@')[0] || '?'
  const avatarColor = profile?.avatar_color ?? '#6366f1'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 shrink-0 h-screen bg-[#1e1f21] flex flex-col">
      {/* User row — click name/avatar to open profile settings */}
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
        <NavLink to="/projects" end className={navClass}>
          <FolderOpen size={15} /> Projects
        </NavLink>

        {/* Starred — always visible */}
        <div className="pt-5">
          <p className="px-3 text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">
            Starred
          </p>
          {favorites.map(p => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass}>
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 text-white"
                style={{ background: p.color }}
              >
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="truncate">{p.name}</span>
              <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />
            </NavLink>
          ))}
        </div>

        {/* All projects */}
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
          {projects.filter(p => p.status === 'active').map(p => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass}>
              <span
                className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 text-white"
                style={{ background: p.color }}
              >
                {p.name[0]?.toUpperCase()}
              </span>
              <span className="truncate">{p.name}</span>
              {p.is_favorite && <Star size={11} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />}
            </NavLink>
          ))}
          {projects.length === 0 && (
            <button
              onClick={onNewProject}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/40 hover:text-white/70 w-full transition-colors"
            >
              <Plus size={14} /> New project
            </button>
          )}
        </div>
      </nav>
    </aside>
  )
}
