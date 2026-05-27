import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Star, FolderOpen, Crown, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project } from '../types'
import { Button } from '../components/ui/Button'
import { CreateProjectModal } from '../components/projects/CreateProjectModal'
import { cn } from '../lib/utils'
import { withFavorites, setFavorite } from '../lib/favorites'

export function ProjectsPage() {
  const { user } = useAuth()
  const [ownedProjects, setOwnedProjects] = useState<Project[]>([])
  const [memberProjects, setMemberProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)

    const [{ data: ownedData }, { data: memberRows }] = await Promise.all([
      supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_members')
        .select('project:projects(*)')
        .eq('user_id', user!.id),
    ])

    const owned = ownedData ?? []
    const memberList = (memberRows ?? [])
      .map((r: any) => r.project as Project)
      .filter((p): p is Project => !!p && p.owner_id !== user!.id && p.status === 'active')
    memberList.sort((a, b) => b.created_at.localeCompare(a.created_at))

    const [ownedWithFav, memberWithFav] = await Promise.all([
      withFavorites(owned, user!.id),
      withFavorites(memberList, user!.id),
    ])

    setOwnedProjects(ownedWithFav)
    setMemberProjects(memberWithFav)
    setLoading(false)
  }

  function toggleFavoriteIn(
    setter: React.Dispatch<React.SetStateAction<Project[]>>,
    project: Project
  ) {
    return async (e: React.MouseEvent) => {
      e.preventDefault()
      const next = !project.is_favorite
      setter(prev => prev.map(p => p.id === project.id ? { ...p, is_favorite: next } : p))
      await setFavorite(user!.id, project.id, next)
      window.dispatchEvent(new CustomEvent('taskhi:projects-changed'))
    }
  }

  const totalCount = ownedProjects.length + memberProjects.length

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} className="mr-1" /> New Project
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : totalCount === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1" /> New Project
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {ownedProjects.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Crown size={15} className="text-amber-500" />
                <h2 className="text-base font-semibold text-slate-700">My projects</h2>
                <span className="text-xs text-slate-400">{ownedProjects.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {ownedProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onToggleFavorite={toggleFavoriteIn(setOwnedProjects, project)}
                  />
                ))}
              </div>
            </section>
          )}

          {memberProjects.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users size={15} className="text-indigo-500" />
                <h2 className="text-base font-semibold text-slate-700">Member of</h2>
                <span className="text-xs text-slate-400">{memberProjects.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {memberProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onToggleFavorite={toggleFavoriteIn(setMemberProjects, project)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { setShowCreate(false); load() }}
      />
    </div>
  )
}

function ProjectCard({ project, onToggleFavorite }: {
  project: Project
  onToggleFavorite: (e: React.MouseEvent) => void
}) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group bg-white rounded-xl border border-slate-100 p-5 hover:border-primary-200 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: project.color }} />
          <span className="font-semibold text-slate-800">{project.name}</span>
        </div>
        <button
          onClick={onToggleFavorite}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
          title={project.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star
            size={15}
            className={cn(
              'transition-colors',
              project.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-300 group-hover:text-slate-400'
            )}
          />
        </button>
      </div>
      {project.description && (
        <p className="text-sm text-slate-500 line-clamp-2">{project.description}</p>
      )}
    </Link>
  )
}
