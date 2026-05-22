import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, CheckSquare, Star, Plus, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn, getInitials } from '../../lib/utils'
import { Project } from '../../types'

interface SidebarProps {
  projects: Project[]
  onNewProject: () => void
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors',
    isActive
      ? 'bg-primary-50 text-primary-600 font-medium'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800')

export function Sidebar({ projects, onNewProject }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const favorites = projects.filter(p => p.is_favorite)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <aside className="w-64 shrink-0 h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center">
            <CheckSquare size={14} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 text-sm">TaskHI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <NavLink to="/dashboard" className={navClass}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/projects" className={navClass}>
          <FolderOpen size={16} /> Projects
        </NavLink>
        <NavLink to="/my-tasks" className={navClass}>
          <CheckSquare size={16} /> My Tasks
        </NavLink>

        {/* Favorites */}
        {favorites.length > 0 && (
          <div className="pt-4">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Favorites</p>
            {favorites.map(p => (
              <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="truncate">{p.name}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* All projects */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projects</p>
            <button onClick={onNewProject} className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <Plus size={14} />
            </button>
          </div>
          {projects.filter(p => p.status === 'active').map(p => (
            <NavLink key={p.id} to={`/projects/${p.id}`} className={navClass}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="truncate">{p.name}</span>
              {p.is_favorite && <Star size={12} className="ml-auto text-amber-400 fill-amber-400" />}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-slate-100">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md">
          <div className="w-7 h-7 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-medium shrink-0">
            {getInitials(profile?.name ?? 'U')}
          </div>
          <span className="text-sm text-slate-700 font-medium truncate flex-1">{profile?.name}</span>
          <button onClick={handleSignOut} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
