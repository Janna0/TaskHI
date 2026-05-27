import { useEffect, useState, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Plus, Star, MoreHorizontal, Trash2, Link, X, UserMinus, Search, Copy, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Project, Profile, Section, Task, ProjectMember } from '../types'
import { Button } from '../components/ui/Button'
import { ListView } from '../components/views/ListView'
import { BoardView } from '../components/views/BoardView'
import { TaskDetailPanel } from '../components/tasks/TaskDetailPanel'
import { CreateTaskModal } from '../components/tasks/CreateTaskModal'
import { cn, isOverdue, getInitials } from '../lib/utils'
import { loadFavoriteIds, setFavorite } from '../lib/favorites'

type View = 'overview' | 'list' | 'board'

const TABS: { id: View; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'list',     label: 'List' },
  { id: 'board',    label: 'Board' },
]

export function ProjectView() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
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

  const autoOpenTaskId = searchParams.get('task')

  const ownerDisplayName = projectOwner?.name || projectOwner?.email?.split('@')[0] || '?'
  const ownerAvatarColor = projectOwner?.avatar_color ?? '#6366f1'

  // Auto-open task from inbox notification
  useEffect(() => {
    if (!autoOpenTaskId || tasks.length === 0 || selectedTask) return
    const task = tasks.find(t => t.id === autoOpenTaskId)
    if (task) setSelectedTask(task)
  }, [autoOpenTaskId, tasks])

  useEffect(() => {
    if (id) {
      loadProject()
      const saved = localStorage.getItem(`taskhi:default-view:${id}`) as View | null
      if (saved && ['overview', 'list', 'board'].includes(saved)) {
        setView(saved)
        setDefaultViewState(saved)
      }
    }
  }, [id])

  async function loadProject() {
    if (!id) return
    setLoading(true)

    const [{ data: proj }, { data: secs }, { data: tks }, { data: mems }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('sections').select('*').eq('project_id', id).order('position'),
      supabase.from('tasks').select('*').eq('project_id', id).order('position'),
      supabase.from('project_members').select('*, profile:profiles(*)').eq('project_id', id),
    ])

    if (proj) {
      setProject(proj)
      const { data: owner } = await supabase.from('profiles').select('*').eq('id', proj.owner_id).single()
      if (owner) setProjectOwner(owner)
    }
    setSections(secs ?? [])
    setTasks(tks ?? [])
    setMembers(mems ?? [])
    setLoading(false)
  }

  function refresh() { loadProject() }

  const memberMap: Record<string, { name: string; color: string }> = {}
  for (const m of members) {
    const p = (m as { profile?: { id?: string; name?: string | null; avatar_color?: string | null } }).profile
    if (p?.id) memberMap[p.id] = { name: p.name ?? p.id, color: p.avatar_color ?? '#6366f1' }
  }

  async function setDefaultView(v: View) {
    if (!id) return
    setDefaultViewState(v)
    localStorage.setItem(`taskhi:default-view:${id}`, v)
    setTabMenu(null)
  }

  function handleTaskClick(task: Task) {
    setSelectedTask(task)
  }

  async function handleDeleteProject() {
    if (!project || !confirm(`Delete "${project.name}"? This cannot be undone.`)) return
    await supabase.from('projects').delete().eq('id', project.id)
    window.location.href = '/'
  }

  async function handleLeaveProject() {
    if (!project || !user || !confirm(`Leave "${project.name}"?`)) return
    await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', user.id)
    window.location.href = '/'
  }

  const isOwner = project?.owner_id === user?.id

  // ── Invite panel state ────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviteResults, setInviteResults] = useState<Profile[]>([])
  const [inviting, setInviting] = useState<string | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function searchUsers(q: string) {
    setInviteSearch(q)
    if (q.trim().length < 2) { setInviteResults([]); return }
    const { data } = await supabase.from('profiles').select('*').ilike('email', `%${q}%`).limit(5)
    const memberIds = new Set(members.map(m => m.user_id))
    setInviteResults((data ?? []).filter((p: Profile) => !memberIds.has(p.id)))
  }

  async function inviteUser(profile: Profile) {
    if (!id) return
    setInviting(profile.id)
    await supabase.from('project_members').insert({ project_id: id, user_id: profile.id, role: 'member' })
    await supabase.from('notifications').insert({
      user_id: profile.id,
      type: 'project_invite',
      content: `You were added to project "${project?.name ?? ''}"`,
      link: `/projects/${id}`,
    })
    setInviting(null)
    setInviteResults([])
    setInviteSearch('')
    refresh()
  }

  async function removeMember(userId: string) {
    if (!id || !confirm('Remove this member?')) return
    await supabase.from('project_members').delete().eq('project_id', id).eq('user_id', userId)
    refresh()
  }

  const [isFavorite, setIsFavorite] = useState(false)
  useEffect(() => {
    if (id) setIsFavorite(loadFavoriteIds().includes(id))
  }, [id])

  function toggleFavorite() {
    if (!id) return
    const next = !isFavorite
    setIsFavorite(next)
    setFavorite(id, next)
    window.dispatchEvent(new Event('favorites-changed'))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!project) {
    return <div className="p-8 text-slate-500">Project not found.</div>
  }

  // ── Overview tab ─────────────────────────────────────────────────────────────
  function OverviewTab() {
    const taskIds = new Set(tasks.map(t => t.id))
    const mainTasks = tasks.filter(t => !t.parent_task_id || !taskIds.has(t.parent_task_id))
    const total = mainTasks.length
    const done = mainTasks.filter(t => t.status === 'done').length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    const overdue = mainTasks.filter(t => t.due_date && isOverdue(t.due_date) && t.status !== 'done').length

    const memberProfiles = members.map(m => {
      const p = (m as { profile?: { id?: string; name?: string | null; avatar_color?: string | null } }).profile
      return p ? { id: p.id ?? '', name: p.name ?? 'Unknown', color: p.avatar_color ?? '#6366f1' } : null
    }).filter(Boolean) as { id: string; name: string; color: string }[]

    return (
      <div className="p-6 space-y-6 max-w-2xl">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">Progress</h3>
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-slate-800">{percent}%</span>
            <span className="text-sm text-slate-400 mb-1">{done} of {total} tasks complete</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
          </div>
          {overdue > 0 && (
            <p className="text-xs text-red-500 font-medium">{overdue} task{overdue > 1 ? 's' : ''} overdue</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-600">Members</h3>
          <div className="space-y-2">
            {/* Owner */}
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                style={{ background: ownerAvatarColor }}
              >
                {getInitials(ownerDisplayName)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{ownerDisplayName}</p>
                <p className="text-xs text-slate-400">Owner</p>
              </div>
            </div>
            {memberProfiles.filter(p => p.id !== project.owner_id).map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                  style={{ background: p.color }}
                >
                  {getInitials(p.name)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{p.name}</p>
                  <p className="text-xs text-slate-400">Member</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => removeMember(p.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Remove member"
                  >
                    <UserMinus size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Project header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: project.color ?? '#6366f1' }}
        >
          {project.name.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-lg font-semibold text-slate-800 truncate">{project.name}</h1>

        <button
          onClick={toggleFavorite}
          className={cn(
            'p-1.5 rounded-lg transition-colors shrink-0',
            isFavorite ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-amber-400'
          )}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Invite button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInvite(v => !v)}
            className="text-slate-500 hover:text-slate-700"
          >
            <Plus size={14} className="mr-1" /> Invite
          </Button>

          {/* Member avatars */}
          <div className="flex -space-x-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border border-white"
              style={{ background: ownerAvatarColor }}
              title={ownerDisplayName}
            >
              {getInitials(ownerDisplayName)}
            </div>
            {members.slice(0, 3).map(m => {
              const p = (m as { profile?: { id?: string; name?: string | null; avatar_color?: string | null } }).profile
              if (!p?.id || p.id === project.owner_id) return null
              const name = p.name ?? p.id
              return (
                <div
                  key={p.id}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border border-white"
                  style={{ background: p.avatar_color ?? '#6366f1' }}
                  title={name}
                >
                  {getInitials(name)}
                </div>
              )
            })}
          </div>

          {/* 3-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href)
                    setCopyDone(true); setTimeout(() => setCopyDone(false), 1500)
                    setShowMenu(false)
                  }}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {copyDone ? <Check size={13} /> : <Link size={13} />}
                  Copy project link
                </button>
                {isOwner && (
                  <button
                    onClick={handleDeleteProject}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete project
                  </button>
                )}
                {!isOwner && (
                  <button
                    onClick={handleLeaveProject}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <UserMinus size={13} />
                    Leave project
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invite panel */}
      {showInvite && (
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 space-y-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={inviteSearch}
                onChange={e => searchUsers(e.target.value)}
                placeholder="Search by email…"
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-primary-400 bg-white"
              />
            </div>
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(window.location.href)
                setCopyDone(true); setTimeout(() => setCopyDone(false), 1500)
              }}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors shrink-0"
            >
              {copyDone ? <Check size={12} /> : <Copy size={12} />}
              {copyDone ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={() => setShowInvite(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
          {inviteResults.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              {inviteResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => inviteUser(p)}
                  disabled={inviting === p.id}
                  className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                    style={{ background: p.avatar_color ?? '#6366f1' }}
                  >
                    {getInitials(p.name ?? p.email ?? '?')}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-700">{p.name ?? p.email}</p>
                    <p className="text-xs text-slate-400">{p.email}</p>
                  </div>
                  {inviting === p.id
                    ? <span className="text-xs text-slate-400">Adding…</span>
                    : <span className="text-xs text-primary-500 font-medium">Add</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 bg-white px-6 shrink-0">
        <div className="flex">
          {TABS.map(tab => (
            <div key={tab.id} className="relative">
              <button
                onClick={() => setView(tab.id)}
                onContextMenu={e => { e.preventDefault(); setTabMenu(tab.id) }}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1',
                  view === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                )}
              >
                {tab.label}
                {defaultView === tab.id && (
                  <span className="text-[9px] text-slate-400 font-normal ml-0.5">★</span>
                )}
                <ChevronDown size={10} className="text-slate-400 ml-0.5" />
              </button>
              {tabMenu === tab.id && (
                <div
                  className="absolute top-full left-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-44 z-50"
                  onMouseLeave={() => setTabMenu(null)}
                >
                  <button
                    onClick={() => setDefaultView(tab.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Star size={12} className={defaultView === tab.id ? 'text-amber-400' : 'text-slate-400'} />
                    {defaultView === tab.id ? 'Default view' : 'Set as default'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {view === 'overview' && <OverviewTab />}
          {view === 'list' && (
            <ListView
              sections={sections}
              tasks={tasks}
              projectId={id!}
              memberMap={memberMap}
              onTaskClick={handleTaskClick}
              onRefresh={refresh}
            />
          )}
          {view === 'board' && (
            <BoardView
              sections={sections}
              tasks={tasks}
              projectId={id!}
              memberMap={memberMap}
              onTaskClick={handleTaskClick}
              onRefresh={refresh}
            />
          )}
        </div>

        {selectedTask && (
          <div className="w-[400px] shrink-0 border-l border-slate-200 overflow-y-auto">
            <TaskDetailPanel
              task={selectedTask}
              sections={sections}
              memberMap={memberMap}
              onClose={() => setSelectedTask(null)}
              onUpdated={() => { refresh(); setSelectedTask(prev => tasks.find(t => t.id === prev?.id) ?? prev) }}
              onDeleted={() => { setSelectedTask(null); refresh() }}
            />
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); refresh() }}
          projectId={id!}
          sections={sections}
        />
      )}
    </div>
  )
}
