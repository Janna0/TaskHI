import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Star, MoreHorizontal, Trash2, Link, X, UserMinus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project, Section, Task, ProjectMember } from '../types'
import { Button } from '../components/ui/Button'
import { ListView } from '../components/views/ListView'
import { BoardView } from '../components/views/BoardView'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { cn, isOverdue, getInitials } from '../lib/utils'

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

  useEffect(() => { if (id) loadAll() }, [id])

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
      supabase.from('tasks').select('*').eq('id', selectedTask.id).single()
        .then(({ data }) => { if (data) setSelectedTask(data) })
    }
  }

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading...</div>
  if (!project) return <div className="flex items-center justify-center h-full text-slate-500">Project not found.</div>

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Project name row */}
      <div className="px-6 pt-5 pb-0 bg-white">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-6 h-6 rounded-md shrink-0" style={{ background: project.color }} />
          <h1 className="font-bold text-xl text-slate-900">{project.name}</h1>
          <button onClick={toggleFavorite} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <Star size={16} className={cn(project.is_favorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400 hover:text-slate-600')} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {view !== 'overview' && (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus size={14} className="mr-1" /> Add Task
              </Button>
            )}
            <div className="relative">
              <button onClick={() => setShowMenu(s => !s)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400">
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                    <button onClick={() => { setShowMenu(false); archiveProject() }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                      <Trash2 size={14} /> Archive project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)}
              className={cn('px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                view === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              )}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto bg-white">
          {view === 'overview' && (
            <OverviewTab
              project={project}
              tasks={tasks}
              onEditDescription={async (desc) => {
                await supabase.from('projects').update({ description: desc }).eq('id', project.id)
                setProject(p => p ? { ...p, description: desc } : p)
              }}
            />
          )}
          {view === 'list' && (
            <ListView sections={sections} tasks={tasks} projectId={project.id}
              onTaskClick={task => setSelectedTask(task)} onRefresh={loadAll} />
          )}
          {view === 'board' && (
            <BoardView sections={sections} tasks={tasks} projectId={project.id}
              onTaskClick={task => setSelectedTask(task)} onRefresh={loadAll} />
          )}
        </div>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} sections={sections}
            onClose={() => setSelectedTask(null)}
            onUpdated={handleTaskUpdated}
            onDeleted={() => { setSelectedTask(null); loadAll() }} />
        )}
      </div>

      {showCreate && (
        <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadAll() }}
          projectId={project.id} sections={sections} />
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface Resource { id: string; title: string; url: string }

function OverviewTab({ project, tasks, onEditDescription }: {
  project: Project
  tasks: Task[]
  onEditDescription: (desc: string) => Promise<void>
}) {
  const { profile } = useAuth()
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(project.description ?? '')

  // Members
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [addingMember, setAddingMember] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberError, setMemberError] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)

  useEffect(() => { loadMembers() }, [project.id])

  async function loadMembers() {
    const { data } = await supabase
      .from('project_members')
      .select('*, profile:profiles(id, name, email, avatar_url, created_at)')
      .eq('project_id', project.id)
    if (data) setMembers(data)
  }

  async function handleAddMember() {
    if (!memberEmail.trim()) return
    setMemberError('')
    setMemberLoading(true)
    // Look up user by email in profiles
    const { data: found } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('email', memberEmail.trim().toLowerCase())
      .single()
    if (!found) {
      setMemberError('No user found with that email address.')
      setMemberLoading(false)
      return
    }
    if (found.id === profile?.id) {
      setMemberError("That's you — you're already the project owner.")
      setMemberLoading(false)
      return
    }
    const { error } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: found.id,
      role: 'member',
    })
    setMemberLoading(false)
    if (error) {
      setMemberError(error.code === '23505' ? 'This person is already a member.' : error.message)
      return
    }
    setMemberEmail('')
    setAddingMember(false)
    loadMembers()
  }

  async function removeMember(memberId: string) {
    await supabase.from('project_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  // Key resources
  const storageKey = `taskhi:resources:${project.id}`
  const [resources, setResources] = useState<Resource[]>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
  })
  const [addingResource, setAddingResource] = useState(false)
  const [resTitle, setResTitle] = useState('')
  const [resUrl, setResUrl] = useState('')

  function saveResources(next: Resource[]) {
    setResources(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }
  function addResource() {
    if (!resTitle.trim() || !resUrl.trim()) return
    const url = resUrl.startsWith('http') ? resUrl : `https://${resUrl}`
    saveResources([...resources, { id: crypto.randomUUID(), title: resTitle.trim(), url }])
    setResTitle(''); setResUrl(''); setAddingResource(false)
  }

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  const overdue = tasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== 'done').length

  return (
    <div className="max-w-2xl mx-auto px-8 py-8 space-y-10">

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{done} of {total} tasks complete</span>
          <span className="font-medium text-slate-700">{percent}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
        {overdue > 0 && <p className="text-xs text-red-500">{overdue} task{overdue > 1 ? 's' : ''} overdue</p>}
      </div>

      <div className="border-t border-slate-100" />

      {/* Description */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Project description</h2>
        {editingDesc ? (
          <div className="space-y-2">
            <textarea autoFocus rows={5} value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="What's this project about?"
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
            <div className="flex gap-2">
              <button onClick={async () => { await onEditDescription(desc); setEditingDesc(false) }}
                className="text-sm text-white bg-primary-500 hover:bg-primary-600 px-4 py-1.5 rounded-md font-medium">Save</button>
              <button onClick={() => { setDesc(project.description ?? ''); setEditingDesc(false) }}
                className="text-sm text-slate-500 hover:text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        ) : (
          <p onClick={() => setEditingDesc(true)}
            className={cn('text-sm rounded-lg px-3 py-2.5 cursor-text hover:bg-slate-50 transition-colors',
              project.description?.trim() ? 'text-slate-700 whitespace-pre-wrap' : 'text-slate-400 italic')}>
            {project.description?.trim() || "What's this project about?"}
          </p>
        )}
      </section>

      <div className="border-t border-slate-100" />

      {/* Project roles / members */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Project roles</h2>
        <div className="flex flex-wrap gap-6 items-start">

          {/* Add member button */}
          {!addingMember ? (
            <button onClick={() => setAddingMember(true)}
              className="flex items-center gap-2.5 text-sm text-slate-500 hover:text-slate-700 group">
              <span className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 group-hover:border-slate-400 flex items-center justify-center transition-colors shrink-0">
                <Plus size={14} />
              </span>
              Add member
            </button>
          ) : (
            <div className="flex flex-col gap-1.5 w-64">
              <input autoFocus type="email" placeholder="Enter email address"
                value={memberEmail} onChange={e => { setMemberEmail(e.target.value); setMemberError('') }}
                onKeyDown={e => e.key === 'Enter' && handleAddMember()}
                className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              {memberError && <p className="text-xs text-red-500">{memberError}</p>}
              <div className="flex gap-2">
                <button onClick={handleAddMember} disabled={memberLoading}
                  className="text-sm text-white bg-primary-500 hover:bg-primary-600 px-3 py-1.5 rounded-md font-medium disabled:opacity-50">
                  {memberLoading ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => { setAddingMember(false); setMemberEmail(''); setMemberError('') }}
                  className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
              {getInitials(profile?.name ?? 'U')}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{profile?.name}</p>
              <p className="text-xs text-slate-400">Project owner</p>
            </div>
          </div>

          {/* Members */}
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-slate-400 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                {getInitials(m.profile?.name ?? '?')}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{m.profile?.name ?? m.profile?.email ?? 'Member'}</p>
                <p className="text-xs text-slate-400 capitalize">{m.role}</p>
              </div>
              <button onClick={() => removeMember(m.id)}
                className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all"
                title="Remove member">
                <UserMinus size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-slate-100" />

      {/* Key resources */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Key resources</h2>
        <div className="space-y-2">
          {resources.map(r => (
            <div key={r.id} className="flex items-center gap-3 group">
              <div className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center shrink-0">
                <Link size={13} className="text-slate-500" />
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-primary-600 hover:underline flex-1 truncate">{r.title}</a>
              <button onClick={() => saveResources(resources.filter(x => x.id !== r.id))}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 text-slate-400">
                <X size={13} />
              </button>
            </div>
          ))}
          {addingResource ? (
            <div className="space-y-2 pt-1">
              <input autoFocus placeholder="Resource name" value={resTitle} onChange={e => setResTitle(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <input placeholder="URL (e.g. https://...)" value={resUrl}
                onChange={e => setResUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && addResource()}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300" />
              <div className="flex gap-2">
                <button onClick={addResource} className="text-sm text-white bg-primary-500 hover:bg-primary-600 px-4 py-1.5 rounded-md font-medium">Add</button>
                <button onClick={() => { setAddingResource(false); setResTitle(''); setResUrl('') }}
                  className="text-sm text-slate-500 hover:text-slate-700 px-4 py-1.5 rounded-md hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingResource(true)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mt-1 group">
              <span className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 group-hover:border-slate-400 flex items-center justify-center transition-colors">
                <Plus size={13} />
              </span>
              Add resource
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
