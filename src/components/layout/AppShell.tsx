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
    const [{ data: activeData }, { data: archivedData }] = await Promise.all([
      supabase.rpc('get_my_projects'),
      supabase.from('projects').select('*').eq('owner_id', user!.id).eq('status', 'archived').order('name'),
    ])
    const all = [...(activeData ?? []), ...(archivedData ?? [])]
    setProjects(await withFavorites(all, user!.id))
  }

  return (
    <div className="h-screen">
      <Sidebar
        projects={projects}
        onNewProject={() => setShowCreate(true)}
      />
      <main className="ml-64 h-screen overflow-y-auto overscroll-y-contain bg-slate-50">
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
