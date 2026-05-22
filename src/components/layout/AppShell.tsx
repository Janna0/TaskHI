import { useState, useEffect, ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Project } from '../../types'
import { CreateProjectModal } from '../projects/CreateProjectModal'

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (!user) return
    loadProjects()
    // Small delay so Supabase write propagates before we re-fetch
    const handler = () => setTimeout(() => loadProjects(), 400)
    window.addEventListener('taskhi:projects-changed', handler)
    return () => window.removeEventListener('taskhi:projects-changed', handler)
  }, [user])

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (data) setProjects(data)
  }

  async function handleToggleFavorite(project: Project) {
    const next = !project.is_favorite
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_favorite: next } : p))
    const { data, error } = await supabase
      .from('projects')
      .update({ is_favorite: next })
      .eq('id', project.id)
      .select('id, is_favorite')
      .single()
    if (error || !data) {
      // Revert if the write failed
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, is_favorite: !next } : p))
      console.error('Failed to update favorite:', error)
      alert(`Could not save: ${error?.message ?? 'unknown error'}`)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        projects={projects}
        onNewProject={() => setShowCreate(true)}
        onToggleFavorite={handleToggleFavorite}
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
