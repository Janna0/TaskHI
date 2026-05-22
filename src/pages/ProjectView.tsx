import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutList, LayoutGrid, Plus, Star, MoreHorizontal, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project, Section, Task } from '../types'
import { Button } from '../components/ui/Button'
import { ListView } from '../components/views/ListView'
import { BoardView } from '../components/views/BoardView'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { cn } from '../lib/utils'

type View = 'list' | 'board'

export function ProjectView() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [view, setView] = useState<View>('list')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [{ data: proj }, { data: sec }, { data: tsk }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id!).single(),
      supabase.from('sections').select('*').eq('project_id', id!).order('position'),
      supabase.from('tasks').select('*').eq('project_id', id!).order('created_at'),
    ])
    if (proj) setProject(proj)
    if (sec) setSections(sec)
    if (tsk) setTasks(tsk)
    setLoading(false)
  }

  async function toggleFavorite() {
    if (!project) return
    await supabase.from('projects').update({ is_favorite: !project.is_favorite }).eq('id', project.id)
    setProject(p => p ? { ...p, is_favorite: !p.is_favorite } : p)
    window.dispatchEvent(new CustomEvent('taskhi:projects-changed'))
  }

  async function archiveProject() {
    if (!project || !confirm('Archive this project?')) return
    await supabase.from('projects').update({ status: 'archived' }).eq('id', project.id)
    window.dispatchEvent(new CustomEvent('taskhi:projects-changed'))
    window.location.hash = '/projects'
  }

  function handleTaskUpdated() {
    loadAll()
    if (selectedTask) {
      // refresh selected task data
      supabase.from('tasks').select('*').eq('id', selectedTask.id).single().then(({ data }) => {
        if (data) setSelectedTask(data)
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading...</div>
  }

  if (!project) {
    return <div className="flex items-center justify-center h-full text-slate-500">Project not found.</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center gap-3">
        <span className="w-4 h-4 rounded-full shrink-0" style={{ background: project.color }} />
        <h1 className="font-bold text-lg text-slate-800 truncate">{project.name}</h1>
        {project.description && (
          <span className="text-sm text-slate-400 truncate hidden md:block">{project.description}</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Favorite */}
          <button onClick={toggleFavorite} className="p-1.5 rounded-md hover:bg-slate-100" title="Favorite">
            <Star size={16} className={cn(project.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400')} />
          </button>

          {/* View switcher */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={cn('flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors', view === 'list' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:bg-slate-50')}
            >
              <LayoutList size={14} /> List
            </button>
            <button
              onClick={() => setView('board')}
              className={cn('flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors', view === 'board' ? 'bg-primary-500 text-white' : 'text-slate-500 hover:bg-slate-50')}
            >
              <LayoutGrid size={14} /> Board
            </button>
          </div>

          {/* Add task */}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} className="mr-1" /> Add Task
          </Button>

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(s => !s)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-20">
                  <button
                    onClick={() => { setShowMenu(false); archiveProject() }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} /> Archive project
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto">
          {view === 'list' ? (
            <ListView
              sections={sections}
              tasks={tasks}
              projectId={project.id}
              onTaskClick={task => setSelectedTask(task)}
              onRefresh={loadAll}
            />
          ) : (
            <BoardView
              sections={sections}
              tasks={tasks}
              projectId={project.id}
              onTaskClick={task => setSelectedTask(task)}
              onRefresh={loadAll}
            />
          )}
        </div>

        {/* Detail panel */}
        {selectedTask && (
          <TaskDetailPanel
            task={selectedTask}
            sections={sections}
            onClose={() => setSelectedTask(null)}
            onUpdated={handleTaskUpdated}
            onDeleted={() => { setSelectedTask(null); loadAll() }}
          />
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll() }}
          projectId={project.id}
          sections={sections}
        />
      )}
    </div>
  )
}
