import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, Star, MoreHorizontal, Trash2, Link, X, UserMinus, Search, Copy, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project, Profile, Section, Task, ProjectMember, BoardColumnConfig } from '../types'
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
  const { user } = useAuth()
  const [project, setProject] = useState<Project | null>(null)
  const [projectOwner, setProjectOwner] = useState<Profile | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [view, setView] = useState<View>('list')
  const [defaultView, setDefaultViewState] = useState<View>('list')
  const [tabMenu, setTabMenu] = useState<View | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  const ownerDisplayName = projectOwner?.name || projectOwner?.email?.split('@')[0] || '?'
  const ownerAvatarColor = projectOwner?.avatar_color ?? '#6366f1'

  function setAsDefault(v: View) {
    if (!id) return
    localStorage.setItem(`taskhi:default-view:${id}`, v)
    setDefaultViewState(v)
    setTabMenu(null)
  }

  useEffect(() => {
    if (!id) return
    const saved = (localStorage.getItem(`taskhi:default-view:${id}`) as View) || 'list'
    setView(saved)
    setDefaultViewState(saved)
    loadAll()
    loadMembers()
  }, [id])

  async function loadAll() {
    setLoading(true)
    try {
      const [projRes, secRes, tskRes] = await Promise.all([
        supabase.rpc('get_project_by_id', { p_id: id! }).single(),
        supabase.from('sections').select('*').eq('project_id', id!).order('position'),
        supabase.from('tasks').select('*').eq('project_id', id!).order('created_at'),
      ])
      if (projRes.data) {
        const proj = projRes.data as unknown as Project
        setProject(proj)
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url, avatar_color, created_at')
          .eq('id', proj.owner_id)
          .single()
        if (ownerData) setProjectOwner(ownerData as Profile)
      }
      if (secRes.data) setSections(secRes.data)
      if (tskRes.data) setTasks(tskRes.data)
    } finally {
      setLoading(false)
    }
  }

  async function loadMembers() {
    try {
      const { data } = await supabase
        .from('project_members')
        .select('*, profile:profiles(id, name, email, avatar_url, avatar_color, created_at)')
        .eq('project_id', id!)
      if (data) setMembers(data)
    } catch {
      // project_members table may not exist yet; members stay empty
    }
  }

  async function addMember(u: Profile) {
    const { error } = await supabase.from('project_members').insert({ project_id: id!, user_id: u.id, role: 'member' })
    if (!error) loadMembers()
  }

  async function removeMember(memberId: string) {
    await supabase.from('project_members').delete().eq('id', memberId)
    setMembers(prev => prev.filter(m => m.id !== memberId))
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

  const DEFAULT_COLUMNS: BoardColumnConfig[] = [
    { status: 'todo', name: 'To Do' },
    { status: 'in_progress', name: 'In Progress' },
    { status: 'done', name: 'Done' },
  ]
  const boardColumns = project?.board_columns ?? DEFAULT_COLUMNS

  async function handleColumnsChanged(cols: BoardColumnConfig[]) {
    setProject(p => p ? { ...p, board_columns: cols } : p)
    await supabase.from('projects').update({ board_columns: cols }).eq('id', project!.id)
  }

  function handleTaskMoved(taskId: string, newStatus: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'] } : t))
    if (selectedTask?.id === taskId) setSelectedTask(prev => prev ? { ...prev, status: newStatus as Task['status'] } : prev)
  }

  function handleTaskUpdated() {
    loadAll()
    if (selectedTask) {
      supabase.from('tasks').select('*').eq('id', selectedTask.id).single()
        .then(({ data }) => { if (data) setSelectedTask(data) })
    }
  }

  const memberMap: Record<string, { name: string; color: string }> = {}
  if (projectOwner) memberMap[projectOwner.id] = { name: ownerDisplayName, color: ownerAvatarColor }
  for (const m of members) {
    if (m.profile && m.user_id !== project?.owner_id) memberMap[m.user_id] = {
      name: m.profile.name || m.profile.email?.split('@')[0] || '?',
      color: m.profile.avatar_color ?? '#94a3b8',
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

          <div className="ml-auto flex items-center gap-3">
            {/* Member avatars + picker */}
            <MemberPicker
              projectId={project.id}
              members={members.filter(m => m.user_id !== project.owner_id)}
              ownerProfile={projectOwner}
              ownerDisplayName={ownerDisplayName}
              ownerAvatarColor={ownerAvatarColor}
              onAdd={addMember}
              onRemove={removeMember}
            />

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
          {TABS.map(tab => {
            const isActive = view === tab.id
            const isDefault = defaultView === tab.id
            return (
            <div key={tab.id} className="relative flex items-end group/tab">
              <button
                onClick={() => { setView(tab.id); setTabMenu(null) }}
                className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                )}
              >
                {tab.label}
                {isDefault && (
                  <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', isActive ? 'bg-primary-500' : 'bg-slate-400')} title="Default view" />
                )}
              </button>
              {/* Dropdown trigger */}
              <button
                onClick={e => { e.stopPropagation(); setTabMenu(tabMenu === tab.id ? null : tab.id) }}
                className={cn(
                  'mb-px pb-2 pr-1 text-slate-400 hover:text-slate-600 transition-colors',
                  tabMenu === tab.id ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
                )}
              >
                <ChevronDown size={11} />
              </button>
              {tabMenu === tab.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTabMenu(null)} />
                  <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 w-40">
                    <button
                      onClick={() => setAsDefault(tab.id)}
                      className={cn(
                        'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 transition-colors',
                        isDefault ? 'text-primary-600' : 'text-slate-700'
                      )}
                    >
                      {isDefault
                        ? <><Check size={13} /> Default view</>
                        : 'Set as default'}
                    </button>
                  </div>
                </>
              )}
            </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto bg-white">
          {view === 'overview' && (
            <OverviewTab
              project={project}
              tasks={tasks}
              members={members.filter(m => m.user_id !== project.owner_id)}
              ownerProfile={projectOwner}
              ownerDisplayName={ownerDisplayName}
              ownerAvatarColor={ownerAvatarColor}
              onEditDescription={async (desc) => {
                await supabase.from('projects').update({ description: desc }).eq('id', project.id)
                setProject(p => p ? { ...p, description: desc } : p)
              }}
              onAddMember={addMember}
              onRemoveMember={removeMember}
            />
          )}
          {view === 'list' && (
            <ListView sections={sections} tasks={tasks} projectId={project.id}
              memberMap={memberMap} onTaskClick={task => setSelectedTask(task)} onRefresh={loadAll} />
          )}
          {view === 'board' && (
            <BoardView sections={sections} tasks={tasks} projectId={project.id}
              memberMap={memberMap} columns={boardColumns}
              onTaskClick={task => setSelectedTask(task)}
              onTaskMoved={handleTaskMoved}
              onColumnsChanged={handleColumnsChanged}
              onRefresh={loadAll} />
          )}
        </div>
        {selectedTask && (
          <TaskDetailPanel task={selectedTask} sections={sections} memberMap={memberMap}
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

// ─── Member Picker (header) ───────────────────────────────────────────────────

function MemberPicker({ projectId, members, ownerProfile, ownerDisplayName, ownerAvatarColor, onAdd, onRemove }: {
  projectId: string
  members: ProjectMember[]
  ownerProfile: Profile | null
  ownerDisplayName: string
  ownerAvatarColor: string
  onAdd: (u: Profile) => Promise<void>
  onRemove: (id: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function openPicker() {
    setOpen(o => !o)
    setSearch('')
    const { data } = await supabase.from('profiles').select('id, name, email, avatar_url, created_at')
    if (data) setAllUsers(data)
  }

  const existingIds = new Set([ownerProfile?.id, ...members.map(m => m.user_id)])
  const filtered = allUsers.filter(u => {
    if (existingIds.has(u.id)) return false
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}#/register`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // All people shown in avatar stack: owner + members
  const avatarList: { id: string; name: string; color: string; isOwner?: boolean }[] = [
    ...(ownerProfile ? [{ id: ownerProfile.id, name: ownerDisplayName, color: ownerAvatarColor, isOwner: true }] : []),
    ...members.map(m => ({
      id: m.id,
      name: m.profile?.name || m.profile?.email?.split('@')[0] || '?',
      color: m.profile?.avatar_color ?? '#94a3b8',
    })),
  ]

  return (
    <div className="relative flex items-center" ref={ref}>
      {/* Avatar stack */}
      <div className="flex items-center -space-x-2 cursor-pointer" onClick={openPicker}>
        {avatarList.slice(0, 5).map((a, i) => (
          <div key={a.id}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white shrink-0"
            style={{ background: a.color, zIndex: 10 - i }}
            title={a.name}
          >
            {getInitials(a.name)}
          </div>
        ))}
        {avatarList.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
            +{avatarList.length - 5}
          </div>
        )}
        {/* Add button */}
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 hover:border-primary-400 bg-white flex items-center justify-center text-slate-400 hover:text-primary-500 transition-colors ml-1"
          title="Manage members">
          <Plus size={13} />
        </div>
      </div>

      {/* Picker dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
          {/* Current members */}
          {(ownerProfile || members.length > 0) && (
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Members</p>
              {ownerProfile && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ background: ownerAvatarColor }}>
                    {getInitials(ownerDisplayName)}
                  </div>
                  <span className="text-sm text-slate-700 flex-1">{ownerDisplayName}</span>
                  <span className="text-xs text-slate-400">Owner</span>
                </div>
              )}
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-2 py-1 group">
                  <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {getInitials(m.profile?.name ?? '?')}
                  </div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{m.profile?.name ?? m.profile?.email}</span>
                  <button onClick={() => onRemove(m.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                    <UserMinus size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search to add */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input autoFocus placeholder="Add member by name or email…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400" />
          </div>

          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length > 0 ? filtered.map(u => (
              <button key={u.id} onClick={async () => { await onAdd(u); setOpen(false) }}
                className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 text-left transition-colors">
                <div className="w-7 h-7 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {getInitials(u.name ?? '?')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
              </button>
            )) : (
              <div className="px-3 py-3 text-center">
                <p className="text-sm text-slate-400 mb-2">
                  {search ? `No user found for "${search}"` : 'All registered users are already members'}
                </p>
                <button onClick={copyInviteLink}
                  className="inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">
                  {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy invite link</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

interface Resource { id: string; title: string; url: string }

function OverviewTab({ project, tasks, members, ownerProfile, ownerDisplayName, ownerAvatarColor, onEditDescription, onAddMember, onRemoveMember }: {
  project: Project
  tasks: Task[]
  members: ProjectMember[]
  ownerProfile: Profile | null
  ownerDisplayName: string
  ownerAvatarColor: string
  onEditDescription: (desc: string) => Promise<void>
  onAddMember: (u: Profile) => Promise<void>
  onRemoveMember: (id: string) => Promise<void>
}) {
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(project.description ?? '')

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

      {/* Project roles */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-4">Project roles</h2>
        <div className="flex flex-wrap gap-6 items-start">
          {/* Inline add member */}
          <InlineAddMember members={members} ownerProfile={ownerProfile} onAdd={onAddMember} />

          {/* Owner */}
          {ownerProfile && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ background: ownerAvatarColor }}>
                {getInitials(ownerDisplayName)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{ownerDisplayName}</p>
                <p className="text-xs text-slate-400">Project owner</p>
              </div>
            </div>
          )}

          {/* Members */}
          {members.map(m => {
            const mName = m.profile?.name || m.profile?.email?.split('@')[0] || 'Member'
            return (
            <div key={m.id} className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ background: m.profile?.avatar_color ?? '#94a3b8' }}>
                {getInitials(mName)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{mName}</p>
                <p className="text-xs text-slate-400 capitalize">{m.role}</p>
              </div>
              <button onClick={() => onRemoveMember(m.id)}
                className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                <UserMinus size={13} />
              </button>
            </div>
          )})}

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

// Inline add member for the Overview tab roles section
function InlineAddMember({ members, ownerProfile, onAdd }: {
  members: ProjectMember[]
  ownerProfile: Profile | null
  onAdd: (u: Profile) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  async function openPicker() {
    setOpen(true)
    setSearch('')
    const { data } = await supabase.from('profiles').select('id, name, email, avatar_url, created_at')
    if (data) setAllUsers(data)
  }

  const existingIds = new Set([ownerProfile?.id, ...members.map(m => m.user_id)])
  const filtered = allUsers.filter(u => {
    if (existingIds.has(u.id)) return false
    const q = search.toLowerCase()
    return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
  })

  function copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}#/register`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!open) {
    return (
      <button onClick={openPicker} className="flex items-center gap-2.5 text-sm text-slate-500 hover:text-slate-700 group">
        <span className="w-9 h-9 rounded-full border-2 border-dashed border-slate-300 group-hover:border-slate-400 flex items-center justify-center transition-colors shrink-0">
          <Plus size={14} />
        </span>
        Add member
      </button>
    )
  }

  return (
    <div className="w-64 bg-white border border-slate-200 rounded-xl shadow-lg">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
        <Search size={13} className="text-slate-400 shrink-0" />
        <input autoFocus placeholder="Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400" />
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.length > 0 ? filtered.map(u => (
          <button key={u.id} onClick={async () => { await onAdd(u); setOpen(false) }}
            className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 text-left transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary-400 flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {getInitials(u.name ?? '?')}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{u.name}</p>
              <p className="text-xs text-slate-400 truncate">{u.email}</p>
            </div>
          </button>
        )) : (
          <div className="px-3 py-3 text-center">
            <p className="text-sm text-slate-400 mb-2">{search ? `No user found for "${search}"` : 'No other users yet'}</p>
            <button onClick={copyInviteLink}
              className="inline-flex items-center gap-1.5 text-xs text-primary-600 font-medium border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">
              {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy invite link</>}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
