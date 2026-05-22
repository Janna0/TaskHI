import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Star, MoreHorizontal, Trash2, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Project, Section, Task } from '../types'
import { Button } from '../components/ui/Button'
import { ListView } from '../components/views/ListView'
import { BoardView } from '../components/views/BoardView'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { cn, isOverdue, formatDate } from '../lib/utils'

type View = 'overview' | 'list' | 'board'

const TABS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'list',     label: 'List' },
  { id: 'board',    label: 'Board' },
]

export function ProjectView() {
  const { id } = useParams<{ id: string }>()
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
    const next = !project.is_favorite
    setProject(p => p ? { ...p, is_favorite: next } : p)
    await supabase.from('projects').update({ is_favorite: next }).eq('id', project.id)
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
      supabase.from('tasks').select('*').eq('id', selectedTask.id).single().then(({ data }) => {
        if (data) setSelectedTask(data)
      })
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading...</div>
  if (!project) return <div className="flex items-center justify-center h-full text-slate-500">Project not found.</div>

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top: project name row */}
      <div className="px-6 pt-5 pb-0 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-6 rounded-md shrink-0" style={{ background: project.color }} />
          <h1 className="font-bold text-xl text-slate-900">{project.name}</h1>
          <button
            onClick={toggleFavorite}
            className="p-1 rounded hover:bg-slate-100 transition-colors"
            title={project.is_favorite ? 'Remove from starred' : 'Add to starred'}
          >
            <Star
              size={16}
              className={cn(project.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400 hover:text-slate-600')}
            />
          </button>

          <div className="ml-auto flex items-center gap-2">
            {view !== 'overview' && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} className="mr-1" /> Add Task
              </Button>
            )}
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
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
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

        {/* Asana-style tab bar */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                view === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0 bg-slate-50">
        <div className="flex-1 overflow-y-auto">
          {view === 'overview' && (
            <OverviewTab project={project} tasks={tasks} onEditDescription={async (desc) => {
              await supabase.from('projects').update({ description: desc }).eq('id', project.id)
              setProject(p => p ? { ...p, description: desc } : p)
            }} />
          )}
          {view === 'list' && (
            <ListView
              sections={sections}
              tasks={tasks}
              projectId={project.id}
              onTaskClick={task => setSelectedTask(task)}
              onRefresh={loadAll}
            />
          )}
          {view === 'board' && (
            <BoardView
              sections={sections}
              tasks={tasks}
              projectId={project.id}
              onTaskClick={task => setSelectedTask(task)}
              onRefresh={loadAll}
            />
          )}
        </div>

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

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  project,
  tasks,
  onEditDescription,
}: {
  project: Project
  tasks: Task[]
  onEditDescription: (desc: string) => Promise<void>
}) {
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(project.description ?? '')

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const inProgress = tasks.filter(t => t.status === 'in_progress').length
  const overdue = tasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== 'done').length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  async function saveDesc() {
    await onEditDescription(desc)
    setEditingDesc(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Progress</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-700 w-10 text-right">{percent}%</span>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <StatBox icon={<Circle size={16} className="text-slate-400" />} label="Total" value={total} />
          <StatBox icon={<CheckCircle2 size={16} className="text-green-500" />} label="Done" value={done} color="text-green-600" />
          <StatBox icon={<Clock size={16} className="text-blue-500" />} label="In progress" value={inProgress} color="text-blue-600" />
          <StatBox icon={<AlertCircle size={16} className="text-red-500" />} label="Overdue" value={overdue} color="text-red-600" />
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Description</h2>
          {!editingDesc && (
            <button
              onClick={() => setEditingDesc(true)}
              className="text-xs text-primary-600 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
        {editingDesc ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
              rows={4}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Add a description..."
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setDesc(project.description ?? ''); setEditingDesc(false) }} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100">Cancel</button>
              <button onClick={saveDesc} className="text-xs text-white bg-primary-500 hover:bg-primary-600 px-3 py-1.5 rounded-md">Save</button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 whitespace-pre-wrap">
            {project.description?.trim() || <span className="italic text-slate-400">No description. Click Edit to add one.</span>}
          </p>
        )}
      </div>

      {/* Project details */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Details</h2>
        <div className="space-y-3">
          <DetailRow label="Created">
            {formatDate(project.created_at)}
          </DetailRow>
          <DetailRow label="Status">
            <span className="capitalize">{project.status}</span>
          </DetailRow>
          <DetailRow label="Color">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-full inline-block" style={{ background: project.color }} />
              {project.color}
            </span>
          </DetailRow>
          <DetailRow label="Tasks">
            {total} total · {done} completed
          </DetailRow>
        </div>
      </div>
    </div>
  )
}

function StatBox({ icon, label, value, color = 'text-slate-700' }: { icon: React.ReactNode; label: string; value: number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-slate-50">
      {icon}
      <span className={cn('text-xl font-bold', color)}>{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-xs font-medium text-slate-400 w-20 shrink-0">{label}</span>
      <span className="text-sm text-slate-700">{children}</span>
    </div>
  )
}
