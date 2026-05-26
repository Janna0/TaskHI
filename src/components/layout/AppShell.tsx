import { useState, useEffect, ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Project } from '../../types'
import { CreateProjectModal } from '../projects/CreateProjectModal'
import { withFavorites } from '../../lib/favorites'

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProjects()
    const handler = () => setTimeout(() => loadProjects(), 400)
    window.addEventListener('taskhi:projects-changed', handler)
    return () => window.removeEventListener('taskhi:projects-changed', handler)
  }, [user])

  async function loadProjects() {
    const { data } = await supabase.rpc('get_my_projects')
    if (data) setProjects(await withFavorites(data, user!.id))
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        onNewProject={() => setShowCreate(true)}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => { loadProjects(); setShowCreate(false) }}
      />
    </div>
  )
}
