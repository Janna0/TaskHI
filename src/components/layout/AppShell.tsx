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
    if (user) loadProjects()
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

  function handleProjectCreated() {
    loadProjects()
    setShowCreate(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar projects={projects} onNewProject={() => setShowCreate(true)} />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  )
}
