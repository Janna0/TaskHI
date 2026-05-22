import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Star, FolderOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project } from '../types'
import { Button } from '../components/ui/Button'
import { CreateProjectModal } from '../components/projects/CreateProjectModal'
import { cn } from '../lib/utils'

export function ProjectsPage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
    setLoading(false)
  }

  async function toggleFavorite(e: React.MouseEvent, project: Project) {
    e.preventDefault()
    await supabase.from('projects').update({ is_favorite: !project.is_favorite }).eq('id', project.id)
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_favorite: !p.is_favorite } : p))
    window.dispatchEvent(new CustomEvent('taskhi:projects-changed'))
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} className="mr-1" /> New Project
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No projects yet</p>
          <p className="text-slate-400 text-sm mt-1">Create your first project to get started.</p>
          <Button className="mt-4" onClick={() => setShowCreate(true)}>
            <Plus size={16} className="mr-1" /> New Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="group bg-white rounded-xl border border-slate-100 p-5 hover:border-primary-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: project.color }} />
                  <span className="font-semibold text-slate-800">{project.name}</span>
                </div>
                <button
                  onClick={e => toggleFavorite(e, project)}
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
          ))}
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
