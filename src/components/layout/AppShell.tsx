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
    // Projects the user owns
    const { data: owned } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    // Projects the user is a member of (but doesn't own)
    const { data: memberships } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user!.id)

    const memberIds = (memberships ?? []).map((m: { project_id: string }) => m.project_id)
    let memberProjects: Project[] = []

    if (memberIds.length > 0) {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .in('id', memberIds)
        .eq('status', 'active')
      memberProjects = (data ?? []).filter((p: Project) => p.owner_id !== user!.id)
    }

    setProjects([...(owned ?? []), ...memberProjects])
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
