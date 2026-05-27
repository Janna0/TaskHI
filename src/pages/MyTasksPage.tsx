import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckSquare, Filter, UserCheck, Briefcase, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task } from '../types'
import { StatusBadge, PriorityBadge } from '../components/ui/Badge'
import { formatDate, isOverdue, cn, getInitials, STATUS_LABELS, PRIORITY_LABELS } from '../lib/utils'

function MultiSelect({ label, options, value, onChange }: {
  label: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  const displayLabel = value.length === 0 || value.length === options.length
    ? label
    : value.length === 1
    ? options.find(o => o.value === value[0])?.label ?? label
    : `${value.length} selected`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'h-8 px-3 text-xs rounded-md border bg-white flex items-center gap-1.5 transition-colors',
          value.length > 0 && value.length < options.length
            ? 'border-primary-300 text-primary-600 font-medium'
            : 'border-slate-200 text-slate-600 hover:border-slate-300'
        )}
      >
        {displayLabel}
        <ChevronDown size={12} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1 min-w-[160px]">
          {options.map(opt => {
            const selected = value.includes(opt.value)
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className="flex items-center gap-2.5 w-full px-3 py-1.5 text-sm text-left hover:bg-slate-50 transition-colors"
              >
                <div className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                  selected ? 'border-primary-500 bg-primary-500' : 'border-slate-300'
                )}>
                  {selected && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={selected ? 'text-slate-800 font-medium' : 'text-slate-600'}>{opt.label}</span>
              </button>
            )
          })}
          {value.length > 0 && (
            <>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => onChange([])}
                className="w-full px-3 py-1.5 text-xs text-slate-400 hover:text-slate-600 text-left hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, memberMap, projectName }: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  projectName?: string
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)

  return (
    <Link
      to={`/projects/${task.project_id}?task=${task.id}`}
      className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
    >
      <span className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {task.title}
      </span>
      {projectName !== undefined && (
        <span className="w-36 text-xs text-slate-400 truncate shrink-0">{projectName}</span>
      )}
      <div className="w-24 flex justify-center">
        {assignees.length === 0 ? (
          <span className="text-xs text-slate-300">—</span>
        ) : (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a, i) => (
              <div key={i} title={a.name}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-semibold shrink-0"
                style={{ background: a.color }}>
                {getInitials(a.name)}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 shrink-0">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="w-28 flex justify-center">
        <StatusBadge status={task.status} />
      </div>
      <div className="w-24 flex justify-center">
        <PriorityBadge priority={task.priority} />
      </div>
      <span className={cn('w-24 text-xs text-center shrink-0', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
        {task.due_date ? formatDate(task.due_date) : '—'}
      </span>
    </Link>
  )
}

function TableHeader({ showProject }: { showProject: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
      <span className="flex-1">Task</span>
      {showProject && <span className="w-36 shrink-0">Project</span>}
      <span className="w-24 text-center">Assignee</span>
      <span className="w-28 text-center">Status</span>
      <span className="w-24 text-center">Priority</span>
      <span className="w-24 text-center">Due date</span>
    </div>
  )
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }))

export function MyTasksPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view')
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([])
  const [projectTasks, setProjectTasks] = useState<Task[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, { name: string; color: string }>>({})
  const [projectNames, setProjectNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])

  const storageKey = user ? `taskhi:task-filters:${user.id}` : null

  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const { status, priority } = JSON.parse(saved)
        if (status) setStatusFilter(status)
        if (priority) setPriorityFilter(priority)
      }
    } catch {}
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify({ status: statusFilter, priority: priorityFilter }))
  }, [storageKey, statusFilter, priorityFilter])

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)

    const [{ data: assigned }, { data: ownedProjects }] = await Promise.all([
      supabase.from('tasks').select('*')
        .contains('assignee_ids', [user!.id])
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('projects').select('id, name').eq('owner_id', user!.id),
    ])

    const assignedList = (assigned ?? []) as Task[]
    const ownedProjectIds = (ownedProjects ?? []).map(p => p.id)
    const nameMap: Record<string, string> = {}
    for (const p of ownedProjects ?? []) nameMap[p.id] = p.name

    let projectList: Task[] = []
    if (ownedProjectIds.length > 0) {
      const { data: projTasks } = await supabase
        .from('tasks').select('*')
        .in('project_id', ownedProjectIds)
        .order('due_date', { ascending: true, nullsFirst: false })
      projectList = (projTasks ?? []) as Task[]
    }

    setAssignedTasks(assignedList)
    setProjectTasks(projectList)
    setProjectNames(nameMap)

    const allIds = [...new Set([...assignedList, ...projectList].flatMap(t => t.assignee_ids ?? []))]
    if (allIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_color').in('id', allIds)
      const map: Record<string, { name: string; color: string }> = {}
      for (const p of profiles ?? []) map[p.id] = { name: p.name ?? p.id, color: p.avatar_color ?? '#94a3b8' }
      setMemberMap(map)
    }
    setLoading(false)
  }

  function applyFilters(tasks: Task[]) {
    return tasks.filter(t => {
      if (statusFilter.length > 0 && !statusFilter.includes(t.status)) return false
      if (priorityFilter.length > 0 && !priorityFilter.includes(t.priority)) return false
      return true
    })
  }

  const filteredAssigned = applyFilters(assignedTasks)
  const filteredProject = applyFilters(projectTasks)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {view === 'assigned' ? 'Assigned to me' : view === 'projects' ? 'My projects' : 'Tasks'}
        </h1>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <MultiSelect
            label="All statuses"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <MultiSelect
            label="All priorities"
            options={PRIORITY_OPTIONS}
            value={priorityFilter}
            onChange={setPriorityFilter}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-10">
          {(view === 'assigned' || !view) && <section>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck size={16} className="text-primary-500" />
              <h2 className="text-base font-semibold text-slate-700">Assigned to me</h2>
              <span className="ml-1 text-xs text-slate-400">{filteredAssigned.length}</span>
            </div>
            {filteredAssigned.length === 0 ? (
              <div className="flex flex-col items-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                <CheckSquare size={28} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">
                  {assignedTasks.length === 0 ? 'No tasks assigned to you' : 'No tasks match the current filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <TableHeader showProject={false} />
                {filteredAssigned.map(task => (
                  <TaskRow key={task.id} task={task} memberMap={memberMap} />
                ))}
              </div>
            )}
          </section>}

          {(view === 'projects' || !view) && <section>
            <div className="flex items-center gap-2 mb-3">
              <Briefcase size={16} className="text-indigo-500" />
              <h2 className="text-base font-semibold text-slate-700">My projects</h2>
              <span className="ml-1 text-xs text-slate-400">{filteredProject.length}</span>
            </div>
            {filteredProject.length === 0 ? (
              <div className="flex flex-col items-center py-10 bg-slate-50 rounded-xl border border-slate-100">
                <Briefcase size={28} className="text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">
                  {projectTasks.length === 0 ? 'No tasks in your projects' : 'No tasks match the current filters'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <TableHeader showProject={true} />
                {filteredProject.map(task => (
                  <TaskRow key={task.id} task={task} memberMap={memberMap} projectName={projectNames[task.project_id] ?? '—'} />
                ))}
              </div>
            )}
          </section>}
        </div>
      )}
    </div>
  )
}
