import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  pointerWithin,
  useDroppable,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Trash2, Pencil, CheckCircle2, CalendarDays, UserCircle, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

interface Member { id: string; name: string; color: string }

const PRIORITY_OPTIONS: Task['priority'][] = ['urgent', 'high', 'medium', 'low']

// ── Portal dropdown ────────────────────────────────────────────────────────────────────────

function calcDropStyle(anchor: HTMLElement, align: 'left' | 'right', estimatedHeight = 180): React.CSSProperties {
  const r = anchor.getBoundingClientRect()
  const spaceBelow = window.innerHeight - r.bottom - 8
  const openUp = spaceBelow < estimatedHeight && r.top > estimatedHeight
  const base: React.CSSProperties = openUp
    ? { bottom: window.innerHeight - r.top + 6 }
    : { top: r.bottom + 6 }
  if (align === 'left') base.left = r.left
  else base.right = window.innerWidth - r.right
  return base
}

function PortalDropdown({ style, menuRef, open, minWidth, children }: {
  style: React.CSSProperties
  menuRef: React.RefObject<HTMLDivElement | null>
  open: boolean
  minWidth?: number
  children: React.ReactNode
}) {
  if (!open) return null
  return createPortal(
    <div
      ref={menuRef}
      style={{ ...style, position: 'fixed', zIndex: 9999, ...(minWidth ? { minWidth } : {}) }}
      className="bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto"
    >
      {children}
    </div>,
    document.body
  )
}

// ── Date cell ─────────────────────────────────────────────────────────────────────────────

function DateCell({ task, overdue, onUpdate }: {
  task: Task
  overdue: boolean | null | undefined
  onUpdate: () => void
}) {
  return (
    <div
      className="w-24 flex justify-center"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      title={task.due_date ? 'Change due date' : 'Add due date'}
    >
      <div className="relative cursor-pointer min-h-[20px] min-w-[64px]">
        <div className={cn('text-xs text-center pointer-events-none select-none', overdue ? 'text-red-500 font-medium' : task.due_date ? 'text-slate-500' : 'text-slate-300')}>
          {task.due_date ? formatDate(task.due_date) : <CalendarDays size={13} className="mx-auto" />}
        </div>
        <input
          type="date"
          value={task.due_date ?? ''}
          onChange={async e => {
            await supabase.from('tasks').update({ due_date: e.target.value || null }).eq('id', task.id)
            onUpdate()
          }}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </div>
    </div>
  )
}

// ── Priority cell ─────────────────────────────────────────────────────────────────────────

function PriorityCell({ task, onUpdate }: {
  task: Task
  onUpdate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (btnRef.current) setStyle(calcDropStyle(btnRef.current, 'left', PRIORITY_OPTIONS.length * 36 + 8))
    setOpen(v => !v)
  }

  async function setPriority(p: Task['priority']) {
    await supabase.from('tasks').update({ priority: p }).eq('id', task.id)
    setOpen(false)
    onUpdate()
  }

  return (
    <div className="w-24 flex justify-center" onPointerDown={e => e.stopPropagation()}>
      <button ref={btnRef} onClick={handleClick} className="hover:opacity-80 transition-opacity">
        <PriorityBadge priority={task.priority} />
      </button>
      <PortalDropdown style={style} menuRef={menuRef} open={open}>
        {PRIORITY_OPTIONS.map(p => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={cn('flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors', p === task.priority && 'bg-slate-50')}
          >
            <PriorityBadge priority={p} />
            {p === task.priority && <Check size={11} className="text-primary-500 ml-auto shrink-0" />}
          </button>
        ))}
      </PortalDropdown>
    </div>
  )
}

// ── Assignee cell ─────────────────────────────────────────────────────────────────────────

function AssigneeCell({ task, members, onUpdate }: {
  task: Task
  members: Member[]
  onUpdate: () => void
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (btnRef.current) setStyle(calcDropStyle(btnRef.current, 'left', members.length * 36 + 16))
    setOpen(v => !v)
  }

  async function toggleAssignee(memberId: string) {
    const current = task.assignee_ids ?? []
    const next = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', task.id)
    onUpdate()
  }

  const assignees = (task.assignee_ids ?? []).map(id => members.find(m => m.id === id)).filter(Boolean) as Member[]

  return (
    <div className="w-20 flex justify-center" onPointerDown={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        onClick={handleClick}
        className="flex -space-x-1.5 hover:opacity-80 transition-opacity"
        title={assignees.length ? 'Change assignees' : 'Assign task'}
      >
        {assignees.length === 0 ? (
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors">
            <UserCircle size={11} className="text-slate-300" />
          </div>
        ) : (
          <>
            {assignees.slice(0, 2).map((a, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 border border-white"
                style={{ background: a.color }}
                title={a.name}
              >
                {getInitials(a.name)}
              </div>
            ))}
            {assignees.length > 2 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border border-white">
                +{assignees.length - 2}
              </div>
            )}
          </>
        )}
      </button>
      <PortalDropdown style={style} menuRef={menuRef} open={open} minWidth={160}>
        {members.length === 0
          ? <p className="px-3 py-2 text-xs text-slate-400">No members in project</p>
          : members.map(m => {
            const selected = (task.assignee_ids ?? []).includes(m.id)
            return (
              <button
                key={m.id}
                onClick={() => toggleAssignee(m.id)}
                className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: m.color }}>
                  {getInitials(m.name)}
                </div>
                <span className="text-sm text-slate-700 flex-1 truncate">{m.name}</span>
                {selected && <CheckCircle2 size={13} className="text-primary-500 shrink-0" />}
              </button>
            )
          })
        }
      </PortalDropdown>
    </div>
  )
}

// ── Sortable task row ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  members,
  onClick,
  hasSubtasks,
  isExpanded,
  onToggleExpand,
  onAddSubtask,
  onUpdate,
}: {
  task: Task
  members: Member[]
  onClick: () => void
  hasSubtasks: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onAddSubtask: () => void
  onUpdate: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 px-4 py-2 hover:bg-slate-50 border-b border-slate-50 group',
        isDragging && 'opacity-30'
      )}
    >
      <div
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-opacity touch-none select-none shrink-0"
      >
        <GripVertical size={14} />
      </div>

      <span className="flex-1 flex items-center gap-1 min-w-0">
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand() }}
          className={cn(
            'shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded',
            !hasSubtasks && 'invisible pointer-events-none'
          )}
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <span
          className={cn('text-sm truncate cursor-pointer', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 hover:text-primary-600')}
          onClick={onClick}
        >
          {task.title}
        </span>
      </span>

      <AssigneeCell task={task} members={members} onUpdate={onUpdate} />
      <PriorityCell task={task} onUpdate={onUpdate} />
      <DateCell task={task} overdue={overdue} onUpdate={onUpdate} />
      <button
        onClick={e => { e.stopPropagation(); onAddSubtask() }}
        title="Add subtask"
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-all shrink-0"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

// ── Subtask row (non-sortable, indented) ───────────────────────────────────────────────────

function SubtaskRow({
  task,
  members,
  onClick,
  onUpdate,
}: {
  task: Task
  members: Member[]
  onClick: () => void
  onUpdate: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const isDone = task.status === 'done'

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 pl-[52px] hover:bg-slate-50 border-b border-slate-50 group">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
      <span
        className={cn('flex-1 text-sm truncate cursor-pointer', isDone ? 'line-through text-slate-400' : 'text-slate-600 hover:text-primary-600')}
        onClick={onClick}
      >
        {task.title}
      </span>
      <AssigneeCell task={task} members={members} onUpdate={onUpdate} />
      <PriorityCell task={task} onUpdate={onUpdate} />
      <DateCell task={task} overdue={overdue} onUpdate={onUpdate} />
      <div className="w-[22px] shrink-0" />
    </div>
  )
}

// ── Ghost shown in DragOverlay ──────────────────────────────────────────────────────────────────

function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-primary-200 rounded-lg shadow-lg opacity-95">
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
    </div>
  )
}

// ── Add task inline ────────────────────────────────────────────────────────────────────

function AddTaskInlineRow({ projectId, sectionId, position, isActive, onActivate, onDone }: {
  projectId: string
  sectionId: string
  position: number
  isActive: boolean
  onActivate: () => void
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (isActive) {
      setTitle('')
      committedRef.current = false
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isActive])

  async function commit() {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = title.trim()
    if (trimmed) {
      setSaving(true)
      await supabase.from('tasks').insert({
        project_id: projectId,
        section_id: sectionId,
        title: trimmed,
        status: 'todo',
        priority: 'medium',
        position,
        depth: 0,
      })
      setSaving(false)
    }
    onDone()
  }

  function cancel() {
    committedRef.current = true
    setTitle('')
    onDone()
  }

  if (!isActive) {
    return (
      <button
        onClick={onActivate}
        className="flex w-full items-center gap-2 pl-14 pr-4 py-1.5 text-xs text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors"
      >
        <Plus size={12} className="shrink-0" />
        Add task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
      <div className="w-3.5 shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') cancel()
        }}
        onBlur={commit}
        placeholder="Task name…"
        className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400"
      />
      {saving
        ? <span className="text-xs text-slate-400 shrink-0">Saving…</span>
        : <span className="text-[10px] text-slate-300 shrink-0">Enter to save · Esc to cancel</span>
      }
    </div>
  )
}

// ── Add subtask inline ────────────────────────────────────────────────────────────────────

function AddSubtaskInlineRow({ projectId, parentTask, subtaskCount, onSaved }: {
  projectId: string
  parentTask: Task
  subtaskCount: number
  onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  async function commit() {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = title.trim()
    if (trimmed) {
      setSaving(true)
      await supabase.from('tasks').insert({
        project_id: projectId,
        section_id: parentTask.section_id,
        parent_task_id: parentTask.id,
        title: trimmed,
        status: 'todo',
        priority: 'medium',
        position: subtaskCount,
        depth: (parentTask.depth ?? 0) + 1,
      })
      setSaving(false)
    }
    onSaved()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 pl-[52px] bg-slate-50 border-b border-slate-100">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') onSaved()
        }}
        onBlur={commit}
        placeholder="Subtask name…"
        className="flex-1 text-sm text-slate-600 bg-transparent outline-none placeholder-slate-400"
      />
      {saving
        ? <span className="text-xs text-slate-400 shrink-0">Saving…</span>
        : <span className="text-[10px] text-slate-300 shrink-0">Enter · Esc to cancel</span>
      }
    </div>
  )
}

// ── Section action menu ────────────────────────────────────────────────────────────────────

function SectionMenu({ onRename, onDelete, onClose, isCompletion, onToggleCompletion }: {
  onRename: () => void
  onDelete: () => void
  onClose: () => void
  isCompletion: boolean
  onToggleCompletion: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-52 z-50"
    >
      <button
        onMouseDown={e => { e.stopPropagation(); onRename() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Pencil size={13} className="text-slate-400 shrink-0" />
        Rename section
      </button>
      <button
        onMouseDown={e => { e.stopPropagation(); onToggleCompletion() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
      >
        <CheckCircle2 size={13} className={isCompletion ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'} />
        <span className={isCompletion ? 'text-emerald-600' : 'text-slate-700'}>
          {isCompletion ? 'Remove completion mark' : 'Mark as completion'}
        </span>
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button
        onMouseDown={e => { e.stopPropagation(); onDelete() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} className="shrink-0" />
        Delete section
      </button>
    </div>
  )
}

// ── Section drop zone ────────────────────────────────────────────────────────────────────────

function SectionDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn('min-h-[60px] transition-colors', isOver && 'bg-primary-50/40')}>
      {children}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

export function ListView({ sections, tasks, projectId, memberMap: _memberMap, onTaskClick, onRefresh }: Props) {
  const { user } = useAuth()
  const [members, setMembers] = useState<Member[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [inlineAdding, setInlineAdding] = useState<string | null>(null)
  const [createSection, setCreateSection] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [openMenuSection, setOpenMenuSection] = useState<string | null>(null)
  const [renamingSection, setRenamingSection] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<string | null>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const sectionInputRef = useRef<HTMLInputElement>(null)
  const completionKey = `taskhi:completion-section:${projectId}`
  const [completionSectionId, setCompletionSectionId] = useState(() => localStorage.getItem(completionKey) ?? '')

  useEffect(() => {
    loadMembers()
  }, [projectId])

  async function loadMembers() {
    try {
      const { data } = await supabase
        .from('project_members')
        .select('user_id, profile:profiles(id, name, avatar_color)')
        .eq('project_id', projectId)
      const list: Member[] = (data as any[] ?? []).map(r => ({
        id: r.user_id,
        name: (r.profile as any)?.name ?? r.user_id,
        color: (r.profile as any)?.avatar_color ?? '#94a3b8',
      }))
      if (user && !list.some(m => m.id === user.id)) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, avatar_color')
          .eq('id', user.id)
          .single()
        if (profile) list.unshift({
          id: user.id,
          name: (profile as any).name ?? 'Me',
          color: (profile as any).avatar_color ?? '#94a3b8',
        })
      }
      setMembers(list)
    } catch {}
  }

  function toggleCompletionSection(sectionId: string) {
    const next = completionSectionId === sectionId ? '' : sectionId
    setCompletionSectionId(next)
    if (next) localStorage.setItem(completionKey, next)
    else localStorage.removeItem(completionKey)
    setOpenMenuSection(null)
  }

  const rootTasks = tasks.filter(t => !t.parent_task_id)
  const subtasksByParent: Record<string, Task[]> = {}
  for (const t of tasks) {
    if (t.parent_task_id) {
      if (!subtasksByParent[t.parent_task_id]) subtasksByParent[t.parent_task_id] = []
      subtasksByParent[t.parent_task_id].push(t)
    }
  }
  for (const key of Object.keys(subtasksByParent)) {
    subtasksByParent[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({})
  const localOrderRef = useRef<Record<string, string[]>>({})
  const isDraggingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args)
    return hits.length > 0 ? hits : closestCenter(args)
  }

  useEffect(() => {
    if (renamingSection) requestAnimationFrame(() => renameInputRef.current?.focus())
  }, [renamingSection])

  useEffect(() => {
    if (isDraggingRef.current) return
    const order: Record<string, string[]> = { '': [] }
    for (const s of sections) {
      order[s.id] = rootTasks
        .filter(t => t.section_id === s.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(t => t.id)
    }
    order[''] = rootTasks.filter(t => !t.section_id).map(t => t.id)
    setLocalOrder(order)
    localOrderRef.current = order
  }, [tasks, sections])

  const taskById = Object.fromEntries(tasks.map(t => [t.id, t]))

  function findSection(taskId: string): string {
    for (const [sid, ids] of Object.entries(localOrderRef.current)) {
      if (ids.includes(taskId)) return sid
    }
    return ''
  }

  function toggle(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleTask(taskId: string) {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  function handleAddDone(sectionId: string) {
    setInlineAdding(prev => prev === sectionId ? null : prev)
    onRefresh()
  }

  async function handleDeleteSection(sectionId: string, taskCount: number) {
    setOpenMenuSection(null)
    const msg = taskCount > 0
      ? `Delete this section? The ${taskCount} task${taskCount > 1 ? 's' : ''} inside will be moved to "No section".`
      : 'Delete this section?'
    if (!confirm(msg)) return
    await supabase.from('tasks').update({ section_id: null }).eq('section_id', sectionId)
    await supabase.from('sections').delete().eq('id', sectionId)
    onRefresh()
  }

  async function handleRenameSection() {
    if (!renamingSection || !renameValue.trim()) { setRenamingSection(null); return }
    await supabase.from('sections').update({ name: renameValue.trim() }).eq('id', renamingSection)
    setRenamingSection(null)
    onRefresh()
  }

  async function handleCreateSection() {
    if (!newSectionName.trim()) return
    const { error } = await supabase.from('sections').insert({
      project_id: projectId,
      name: newSectionName.trim(),
      position: sections.length,
    })
    if (error) { setSectionError(error.message); return }
    setNewSectionName('')
    setAddingSection(false)
    setSectionError('')
    onRefresh()
  }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeSid = findSection(activeId)

    let targetSid: string
    if (overId in localOrderRef.current) {
      targetSid = overId
    } else {
      targetSid = findSection(overId)
    }

    const cur = localOrderRef.current

    if (activeSid === targetSid) {
      const ids = cur[activeSid] ?? []
      const from = ids.indexOf(activeId)
      const to = ids.indexOf(overId)
      if (from !== -1 && to !== -1 && from !== to) {
        const newIds = arrayMove(ids, from, to)
        const newOrder = { ...cur, [activeSid]: newIds }
        localOrderRef.current = newOrder
        setLocalOrder(newOrder)
      }
    } else {
      const newOrder = { ...cur }
      newOrder[activeSid] = (newOrder[activeSid] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetSid] ?? [])]
      const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetSid] = targetIds
      localOrderRef.current = newOrder
      setLocalOrder(newOrder)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    setActiveTask(null)

    const { active, over } = event
    const taskId = active.id as string
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) { onRefresh(); return }

    if (!over) { onRefresh(); return }

    const overId = over.id as string
    const overSid = overId in localOrderRef.current ? overId : findSection(overId)
    const currentSid = findSection(taskId)

    if (overSid && overSid !== currentSid) {
      const cur = localOrderRef.current
      const sourceIds = (cur[currentSid] ?? []).filter(id => id !== taskId)
      const destIds = [...(cur[overSid] ?? [])]
      const overIsContainer = overId in cur
      const insertAt = overIsContainer ? destIds.length : destIds.indexOf(overId)
      destIds.splice(insertAt === -1 ? destIds.length : insertAt, 0, taskId)
      const next = { ...cur, [currentSid]: sourceIds, [overSid]: destIds }
      localOrderRef.current = next
      setLocalOrder(next)
    }

    const finalSid = findSection(taskId)
    const finalSectionIds = localOrderRef.current[finalSid] ?? []
    const newSectionId = finalSid || null

    const sectionChanged = newSectionId !== originalTask.section_id
    const movedToCompletion = !!newSectionId && newSectionId === completionSectionId
    const movedFromCompletion = sectionChanged && originalTask.section_id === completionSectionId && !movedToCompletion

    await Promise.all(
      finalSectionIds.map((id, idx) => {
        const update: Record<string, unknown> = { position: idx }
        if (id === taskId) {
          if (sectionChanged) update.section_id = newSectionId
          if (movedToCompletion) update.status = 'done'
          else if (movedFromCompletion && originalTask.status === 'done') update.status = 'todo'
        }
        return supabase.from('tasks').update(update).eq('id', id)
      })
    )

    if (sectionChanged || movedToCompletion || movedFromCompletion) onRefresh()
  }

  function renderTaskWithSubtasks(task: Task) {
    const taskSubtasks = subtasksByParent[task.id] ?? []
    const isExpanded = expandedTasks.has(task.id)
    const isAddingSubtask = addingSubtaskFor === task.id

    return (
      <>
        <TaskRow
          task={task}
          members={members}
          onClick={() => onTaskClick(task)}
          hasSubtasks={taskSubtasks.length > 0 || isAddingSubtask}
          isExpanded={isExpanded || isAddingSubtask}
          onToggleExpand={() => toggleTask(task.id)}
          onAddSubtask={() => {
            setExpandedTasks(prev => new Set([...prev, task.id]))
            setAddingSubtaskFor(task.id)
          }}
          onUpdate={onRefresh}
        />
        {(isExpanded || isAddingSubtask) && (
          <div className="border-l-2 border-slate-100 ml-[34px]">
            {taskSubtasks.map(sub => (
              <SubtaskRow
                key={sub.id}
                task={sub}
                members={members}
                onClick={() => onTaskClick(sub)}
                onUpdate={onRefresh}
              />
            ))}
            {isAddingSubtask && (
              <AddSubtaskInlineRow
                projectId={projectId}
                parentTask={task}
                subtaskCount={taskSubtasks.length}
                onSaved={() => { setAddingSubtaskFor(null); onRefresh() }}
              />
            )}
            {!isAddingSubtask && (
              <button
                onClick={() => setAddingSubtaskFor(task.id)}
                className="flex w-full items-center gap-2 px-4 py-1.5 pl-[18px] text-xs text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors"
              >
                <Plus size={11} className="shrink-0" />
                Add subtask
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  const ungroupedIds = localOrder[''] ?? []

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <span className="w-3.5 shrink-0" />
          <span className="flex-1">Task</span>
          <span className="w-20 text-center">Assignee</span>
          <span className="w-24 text-center">Priority</span>
          <span className="w-24 text-center">Due date</span>
          <span className="w-[22px] shrink-0" />
        </div>

        {sections.map(section => {
          const sectionTaskIds = localOrder[section.id] ?? []
          const sectionTasks = sectionTaskIds.map(id => taskById[id]).filter(Boolean)
          const isCollapsed = collapsed[section.id]
          const isHovered = hoveredSection === section.id
          const menuOpen = openMenuSection === section.id
          const isRenaming = renamingSection === section.id

          return (
            <div key={section.id}>
              <div
                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50"
                onClick={() => !isRenaming && toggle(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                {isCollapsed
                  ? <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  : <ChevronDown size={14} className="text-slate-400 shrink-0" />}

                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleRenameSection() }
                      if (e.key === 'Escape') setRenamingSection(null)
                    }}
                    onBlur={handleRenameSection}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm font-semibold text-slate-700 bg-transparent border-b border-primary-400 outline-none py-0 min-w-0"
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-600">{section.name}</span>
                    <span className="text-xs text-slate-400">({sectionTasks.length})</span>
                    {completionSectionId === section.id && (
                      <span title="Completion section"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /></span>
                    )}
                    {(isHovered || menuOpen) && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuSection(menuOpen ? null : section.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="More section actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen && (
                          <SectionMenu
                            onRename={() => {
                              setOpenMenuSection(null)
                              setRenameValue(section.name)
                              setRenamingSection(section.id)
                            }}
                            onDelete={() => handleDeleteSection(section.id, sectionTasks.length)}
                            onClose={() => setOpenMenuSection(null)}
                            isCompletion={completionSectionId === section.id}
                            onToggleCompletion={() => toggleCompletionSection(section.id)}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <SectionDropZone id={section.id}>
                    <SortableContext items={sectionTaskIds} strategy={verticalListSortingStrategy}>
                      {sectionTasks.map(task => (
                        <div key={task.id}>
                          {renderTaskWithSubtasks(task)}
                        </div>
                      ))}
                    </SortableContext>
                  </SectionDropZone>
                  <AddTaskInlineRow
                    projectId={projectId}
                    sectionId={section.id}
                    position={sectionTaskIds.length}
                    isActive={inlineAdding === section.id}
                    onActivate={() => setInlineAdding(section.id)}
                    onDone={() => handleAddDone(section.id)}
                  />
                </>
              )}
            </div>
          )
        })}

        {ungroupedIds.length > 0 && (
          <div>
            {sections.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-sm font-semibold text-slate-500">No section</span>
              </div>
            )}
            <SortableContext items={ungroupedIds} strategy={verticalListSortingStrategy}>
              {ungroupedIds.map(id => {
                const task = taskById[id]
                if (!task) return null
                return (
                  <div key={task.id}>
                    {renderTaskWithSubtasks(task)}
                  </div>
                )
              })}
            </SortableContext>
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 mt-1">
          {addingSection ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  ref={sectionInputRef}
                  autoFocus
                  value={newSectionName}
                  onChange={e => { setNewSectionName(e.target.value); setSectionError('') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateSection()
                    if (e.key === 'Escape') { setNewSectionName(''); setAddingSection(false); setSectionError('') }
                  }}
                  placeholder="Section name…"
                  className="flex-1 text-sm font-semibold text-slate-700 border-b border-slate-300 focus:border-primary-400 outline-none py-0.5 bg-transparent"
                />
                <button onClick={handleCreateSection} className="text-xs text-primary-600 font-medium hover:text-primary-700 shrink-0">Add</button>
                <button onClick={() => { setNewSectionName(''); setAddingSection(false); setSectionError('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 shrink-0">Cancel</button>
              </div>
              {sectionError && <p className="text-xs text-red-500">{sectionError}</p>}
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus size={14} /> Add section
            </button>
          )}
        </div>

        {createSection !== null && (
          <CreateTaskModal
            open={true}
            onClose={() => setCreateSection(null)}
            onCreated={() => { setCreateSection(null); onRefresh() }}
            projectId={projectId}
            sections={sections}
            defaultSectionId={createSection}
          />
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskGhost task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
