import { useState, useRef, useEffect } from 'react'
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
import { Plus, ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Trash2, Pencil, Check, CheckCircle2, UserCircle, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

const PRIORITY_OPTIONS: Task['priority'][] = ['urgent', 'high', 'medium', 'low']

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

interface Member { id: string; name: string; color: string }

// ── Completion circle ─────────────────────────────────────────────────────────────────

function CompletionCircle({ isDone, onToggle }: { isDone: boolean; onToggle: (e: React.MouseEvent) => void }) {
  return (
    <div onPointerDown={e => e.stopPropagation()} onClick={onToggle}
      title={isDone ? 'Mark as incomplete' : 'Mark task complete'}
      className="shrink-0 cursor-pointer group/check">
      {isDone ? (
        <div className="w-[15px] h-[15px] rounded-full bg-emerald-500 flex items-center justify-center">
          <Check size={9} className="text-white" strokeWidth={3} />
        </div>
      ) : (
        <div className="w-[15px] h-[15px] rounded-full border-2 border-slate-300 group-hover/check:border-emerald-400 transition-colors flex items-center justify-center">
          <Check size={9} className="text-slate-300 group-hover/check:text-emerald-400 transition-colors" />
        </div>
      )}
    </div>
  )
}

// ── Sortable task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task, memberMap, members, completionSectionId, onClick, onUpdate,
  hasSubtasks, isExpanded, onToggleExpand, onAddSubtask,
}: {
  task: Task; memberMap: Record<string, { name: string; color: string }>
  members: Member[]; completionSectionId: string
  onClick: () => void; onUpdate: () => void
  hasSubtasks: boolean; isExpanded: boolean; onToggleExpand: () => void; onAddSubtask: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const isDone = task.status === 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const assigneeRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  useEffect(() => {
    if (!showAssignee) return
    function h(e: MouseEvent) { if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssignee(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showAssignee])

  useEffect(() => {
    if (!showPriority) return
    function h(e: MouseEvent) { if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriority(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showPriority])

  async function toggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    const upd: Record<string, unknown> = { status: isDone ? 'todo' : 'done' }
    if (!isDone && completionSectionId) upd.section_id = completionSectionId
    await supabase.from('tasks').update(upd).eq('id', task.id); onUpdate()
  }
  async function toggleAssignee(memberId: string) {
    const current = task.assignee_ids ?? []
    const next = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', task.id); onUpdate()
  }
  async function handleDateChange(date: string) {
    await supabase.from('tasks').update({ due_date: date || null }).eq('id', task.id); onUpdate()
  }
  async function handlePriorityChange(p: Task['priority']) {
    await supabase.from('tasks').update({ priority: p }).eq('id', task.id); onUpdate()
  }

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} onClick={onClick}
      className={cn('flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 group', isDragging && 'opacity-30')}>
      <div {...listeners} {...attributes} onClick={e => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-opacity touch-none select-none shrink-0">
        <GripVertical size={14} />
      </div>

      <CompletionCircle isDone={isDone} onToggle={toggleComplete} />

      <span className="flex-1 flex items-center gap-1 min-w-0">
        <button onClick={e => { e.stopPropagation(); onToggleExpand() }}
          className={cn('shrink-0 text-slate-400 hover:text-slate-600 transition-colors rounded', !hasSubtasks && 'invisible pointer-events-none')}>
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <span className={cn('text-sm truncate', isDone ? 'line-through text-slate-400' : 'text-slate-700')}>{task.title}</span>
      </span>

      {/* Assignee */}
      <div ref={assigneeRef} className="w-20 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setShowAssignee(v => !v)} title={assignees.length ? 'Change assignees' : 'Assign task'} className="flex items-center justify-center w-full">
          {assignees.length === 0 ? (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors"><UserCircle size={12} className="text-slate-300" /></div>
          ) : (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 2).map((a, i) => <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 border border-white" style={{ background: a.color }} title={a.name}>{getInitials(a.name)}</div>)}
              {assignees.length > 2 && <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border border-white">+{assignees.length - 2}</div>}
            </div>
          )}
        </button>
        {showAssignee && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
            {members.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400">No members in project</p> : members.map(m => {
              const selected = (task.assignee_ids ?? []).includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleAssignee(m.id)} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: m.color }}>{getInitials(m.name)}</div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{m.name}</span>
                  {selected && <CheckCircle2 size={13} className="text-primary-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Priority */}
      <div ref={priorityRef} className="w-24 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setShowPriority(v => !v)} className="cursor-pointer">
          <PriorityBadge priority={task.priority} />
        </button>
        {showPriority && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => { handlePriorityChange(p); setShowPriority(false) }}
                className={cn('flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors', p === task.priority && 'bg-slate-50')}>
                <PriorityBadge priority={p} />
                {p === task.priority && <Check size={11} className="text-primary-500 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Due date */}
      <div className="w-24 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <div className="relative flex items-center justify-center w-full cursor-pointer">
          {task.due_date ? (
            <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>{formatDate(task.due_date)}</span>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors"><CalendarDays size={11} className="text-slate-300" /></div>
          )}
          <input type="date" value={task.due_date ?? ''} onChange={e => handleDateChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>
      </div>

      <button onClick={e => { e.stopPropagation(); onAddSubtask() }} title="Add subtask"
        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-all shrink-0">
        <Plus size={12} />
      </button>
    </div>
  )
}

// ── Subtask row ────────────────────────────────────────────────────────────────────────

function SubtaskRow({ task, memberMap, members, onClick, onUpdate }: {
  task: Task; memberMap: Record<string, { name: string; color: string }>
  members: Member[]; onClick: () => void; onUpdate: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const isDone = task.status === 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const assigneeRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAssignee) return
    function h(e: MouseEvent) { if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssignee(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showAssignee])

  useEffect(() => {
    if (!showPriority) return
    function h(e: MouseEvent) { if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) setShowPriority(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [showPriority])

  async function toggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    await supabase.from('tasks').update({ status: isDone ? 'todo' : 'done' }).eq('id', task.id); onUpdate()
  }
  async function toggleAssignee(memberId: string) {
    const current = task.assignee_ids ?? []
    const next = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', task.id); onUpdate()
  }
  async function handleDateChange(date: string) {
    await supabase.from('tasks').update({ due_date: date || null }).eq('id', task.id); onUpdate()
  }
  async function handlePriorityChange(p: Task['priority']) {
    await supabase.from('tasks').update({ priority: p }).eq('id', task.id); onUpdate()
  }

  return (
    <div onClick={onClick} className="flex items-center gap-3 px-4 py-1.5 pl-[60px] hover:bg-slate-50 cursor-pointer border-b border-slate-50 group">
      <CompletionCircle isDone={isDone} onToggle={toggleComplete} />
      <span className={cn('flex-1 text-sm truncate', isDone ? 'line-through text-slate-400' : 'text-slate-600')}>{task.title}</span>

      {/* Assignee */}
      <div ref={assigneeRef} className="w-20 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setShowAssignee(v => !v)} title={assignees.length ? 'Change assignees' : 'Assign task'} className="flex items-center justify-center w-full">
          {assignees.length === 0 ? (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors"><UserCircle size={12} className="text-slate-300" /></div>
          ) : (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, 2).map((a, i) => <div key={i} className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 border border-white" style={{ background: a.color }} title={a.name}>{getInitials(a.name)}</div>)}
              {assignees.length > 2 && <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border border-white">+{assignees.length - 2}</div>}
            </div>
          )}
        </button>
        {showAssignee && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[160px]">
            {members.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400">No members in project</p> : members.map(m => {
              const selected = (task.assignee_ids ?? []).includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleAssignee(m.id)} className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: m.color }}>{getInitials(m.name)}</div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{m.name}</span>
                  {selected && <CheckCircle2 size={13} className="text-primary-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Priority */}
      <div ref={priorityRef} className="w-24 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <button onClick={() => setShowPriority(v => !v)} className="cursor-pointer">
          <PriorityBadge priority={task.priority} />
        </button>
        {showPriority && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => { handlePriorityChange(p); setShowPriority(false) }}
                className={cn('flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors', p === task.priority && 'bg-slate-50')}>
                <PriorityBadge priority={p} />
                {p === task.priority && <Check size={11} className="text-primary-500 ml-auto shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Due date */}
      <div className="w-24 flex justify-center relative" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
        <div className="relative flex items-center justify-center w-full cursor-pointer">
          {task.due_date ? (
            <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>{formatDate(task.due_date)}</span>
          ) : (
            <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors"><CalendarDays size={11} className="text-slate-300" /></div>
          )}
          <input type="date" value={task.due_date ?? ''} onChange={e => handleDateChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
        </div>
      </div>

      <div className="w-[22px] shrink-0" />
    </div>
  )
}

// ── Ghost shown in DragOverlay ────────────────────────────────────────────────────────

function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-primary-200 rounded-lg shadow-lg opacity-95">
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
    </div>
  )
}

// ── Add task inline ───────────────────────────────────────────────────────────────────

function AddTaskInlineRow({ projectId, sectionId, position, isActive, onActivate, onDone }: {
  projectId: string; sectionId: string; position: number
  isActive: boolean; onActivate: () => void; onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (isActive) { setTitle(''); committedRef.current = false; requestAnimationFrame(() => inputRef.current?.focus()) }
  }, [isActive])

  async function commit() {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = title.trim()
    if (trimmed) {
      setSaving(true)
      await supabase.from('tasks').insert({ project_id: projectId, section_id: sectionId, title: trimmed, status: 'todo', priority: 'medium', position, depth: 0 })
      setSaving(false)
    }
    onDone()
  }

  if (!isActive) {
    return (
      <button onClick={onActivate} className="flex w-full items-center gap-2 pl-14 pr-4 py-1.5 text-xs text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors">
        <Plus size={12} className="shrink-0" /> Add task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
      <div className="w-3.5 shrink-0" />
      <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { committedRef.current = true; setTitle(''); onDone() } }}
        onBlur={commit} placeholder="Task name…"
        className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400" />
      {saving ? <span className="text-xs text-slate-400 shrink-0">Saving…</span> : <span className="text-[10px] text-slate-300 shrink-0">Enter to save · Esc to cancel</span>}
    </div>
  )
}

// ── Add subtask inline ─────────────────────────────────────────────────────────────────

function AddSubtaskInlineRow({ projectId, parentTask, subtaskCount, onSaved }: {
  projectId: string; parentTask: Task; subtaskCount: number; onSaved: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)
  useEffect(() => { requestAnimationFrame(() => inputRef.current?.focus()) }, [])

  async function commit() {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = title.trim()
    if (trimmed) {
      setSaving(true)
      await supabase.from('tasks').insert({ project_id: projectId, section_id: parentTask.section_id, parent_task_id: parentTask.id, title: trimmed, status: 'todo', priority: 'medium', position: subtaskCount, depth: (parentTask.depth ?? 0) + 1 })
      setSaving(false)
    }
    onSaved()
  }

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 pl-[52px] bg-slate-50 border-b border-slate-100">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
      <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') onSaved() }}
        onBlur={commit} placeholder="Subtask name…"
        className="flex-1 text-sm text-slate-600 bg-transparent outline-none placeholder-slate-400" />
      {saving ? <span className="text-xs text-slate-400 shrink-0">Saving…</span> : <span className="text-[10px] text-slate-300 shrink-0">Enter · Esc to cancel</span>}
    </div>
  )
}

// ── Section action menu ─────────────────────────────────────────────────────────────────

function SectionMenu({ onRename, onDelete, onClose, isCompletion, onToggleCompletion }: {
  onRename: () => void; onDelete: () => void; onClose: () => void
  isCompletion: boolean; onToggleCompletion: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handle); document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', handleKey) }
  }, [])
  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-52 z-50">
      <button onMouseDown={e => { e.stopPropagation(); onRename() }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
        <Pencil size={13} className="text-slate-400 shrink-0" /> Rename section
      </button>
      <button onMouseDown={e => { e.stopPropagation(); onToggleCompletion() }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
        <CheckCircle2 size={13} className={isCompletion ? 'text-emerald-500 shrink-0' : 'text-slate-400 shrink-0'} />
        <span className={isCompletion ? 'text-emerald-600' : 'text-slate-700'}>{isCompletion ? 'Remove completion mark' : 'Mark as completion'}</span>
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button onMouseDown={e => { e.stopPropagation(); onDelete() }} className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors">
        <Trash2 size={13} className="shrink-0" /> Delete section
      </button>
    </div>
  )
}

function SectionDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return <div ref={setNodeRef} className={cn('min-h-[60px] transition-colors', isOver && 'bg-primary-50/40')}>{children}</div>
}

// ── Main component ──────────────────────────────────────────────────────────────────

export function ListView({ sections, tasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
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

  const members: Member[] = Object.entries(memberMap).map(([id, m]) => ({ id, name: m.name, color: m.color }))

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
  for (const key of Object.keys(subtasksByParent)) subtasksByParent[key].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({})
  const localOrderRef = useRef<Record<string, string[]>>({})
  const isDraggingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args); return hits.length > 0 ? hits : closestCenter(args)
  }

  useEffect(() => { if (renamingSection) requestAnimationFrame(() => renameInputRef.current?.focus()) }, [renamingSection])

  useEffect(() => {
    if (isDraggingRef.current) return
    const order: Record<string, string[]> = { '': [] }
    for (const s of sections) {
      order[s.id] = rootTasks.filter(t => t.section_id === s.id).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map(t => t.id)
    }
    order[''] = rootTasks.filter(t => !t.section_id).map(t => t.id)
    setLocalOrder(order); localOrderRef.current = order
  }, [tasks, sections])

  const taskById = Object.fromEntries(tasks.map(t => [t.id, t]))

  function findSection(taskId: string): string {
    for (const [sid, ids] of Object.entries(localOrderRef.current)) { if (ids.includes(taskId)) return sid }
    return ''
  }

  function toggle(id: string) { setCollapsed(prev => ({ ...prev, [id]: !prev[id] })) }
  function toggleTask(taskId: string) {
    setExpandedTasks(prev => { const next = new Set(prev); next.has(taskId) ? next.delete(taskId) : next.add(taskId); return next })
  }
  function handleAddDone(sectionId: string) { setInlineAdding(prev => prev === sectionId ? null : prev); onRefresh() }

  async function handleDeleteSection(sectionId: string, taskCount: number) {
    setOpenMenuSection(null)
    const msg = taskCount > 0 ? `Delete this section? The ${taskCount} task${taskCount > 1 ? 's' : ''} inside will be moved to "No section".` : 'Delete this section?'
    if (!confirm(msg)) return
    await supabase.from('tasks').update({ section_id: null }).eq('section_id', sectionId)
    await supabase.from('sections').delete().eq('id', sectionId)
    onRefresh()
  }

  async function handleRenameSection() {
    if (!renamingSection || !renameValue.trim()) { setRenamingSection(null); return }
    await supabase.from('sections').update({ name: renameValue.trim() }).eq('id', renamingSection)
    setRenamingSection(null); onRefresh()
  }

  async function handleCreateSection() {
    if (!newSectionName.trim()) return
    const { error } = await supabase.from('sections').insert({ project_id: projectId, name: newSectionName.trim(), position: sections.length })
    if (error) { setSectionError(error.message); return }
    setNewSectionName(''); setAddingSection(false); setSectionError(''); onRefresh()
  }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true; setActiveTask(tasks.find(t => t.id === event.active.id) ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const activeId = active.id as string; const overId = over.id as string
    const activeSid = findSection(activeId)
    const targetSid = overId in localOrderRef.current ? overId : findSection(overId)
    const cur = localOrderRef.current
    if (activeSid === targetSid) {
      const ids = cur[activeSid] ?? []; const from = ids.indexOf(activeId); const to = ids.indexOf(overId)
      if (from !== -1 && to !== -1 && from !== to) { const newIds = arrayMove(ids, from, to); const newOrder = { ...cur, [activeSid]: newIds }; localOrderRef.current = newOrder; setLocalOrder(newOrder) }
    } else {
      const newOrder = { ...cur }
      newOrder[activeSid] = (newOrder[activeSid] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetSid] ?? [])]; const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetSid] = targetIds; localOrderRef.current = newOrder; setLocalOrder(newOrder)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false; setActiveTask(null)
    const { active, over } = event
    const taskId = active.id as string; const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask || !over) { onRefresh(); return }
    const overId = over.id as string
    const overSid = overId in localOrderRef.current ? overId : findSection(overId)
    const currentSid = findSection(taskId)
    if (overSid && overSid !== currentSid) {
      const cur = localOrderRef.current
      const sourceIds = (cur[currentSid] ?? []).filter(id => id !== taskId)
      const destIds = [...(cur[overSid] ?? [])]; const overIsContainer = overId in cur
      const insertAt = overIsContainer ? destIds.length : destIds.indexOf(overId)
      destIds.splice(insertAt === -1 ? destIds.length : insertAt, 0, taskId)
      const next = { ...cur, [currentSid]: sourceIds, [overSid]: destIds }; localOrderRef.current = next; setLocalOrder(next)
    }
    const finalSid = findSection(taskId); const finalSectionIds = localOrderRef.current[finalSid] ?? []
    const newSectionId = finalSid || null
    const sectionChanged = newSectionId !== originalTask.section_id
    const movedToCompletion = !!newSectionId && newSectionId === completionSectionId
    const movedFromCompletion = sectionChanged && originalTask.section_id === completionSectionId && !movedToCompletion
    await Promise.all(finalSectionIds.map((id, idx) => {
      const update: Record<string, unknown> = { position: idx }
      if (id === taskId) {
        if (sectionChanged) update.section_id = newSectionId
        if (movedToCompletion) update.status = 'done'
        else if (movedFromCompletion && originalTask.status === 'done') update.status = 'todo'
      }
      return supabase.from('tasks').update(update).eq('id', id)
    }))
    if (sectionChanged || movedToCompletion || movedFromCompletion) onRefresh()
  }

  function renderTaskWithSubtasks(task: Task) {
    const taskSubtasks = subtasksByParent[task.id] ?? []
    const isExpanded = expandedTasks.has(task.id)
    const isAddingSubtask = addingSubtaskFor === task.id
    return (
      <>
        <TaskRow task={task} memberMap={memberMap} members={members} completionSectionId={completionSectionId}
          onClick={() => onTaskClick(task)} onUpdate={onRefresh}
          hasSubtasks={taskSubtasks.length > 0 || isAddingSubtask} isExpanded={isExpanded || isAddingSubtask}
          onToggleExpand={() => toggleTask(task.id)}
          onAddSubtask={() => { setExpandedTasks(prev => new Set([...prev, task.id])); setAddingSubtaskFor(task.id) }} />
        {(isExpanded || isAddingSubtask) && (
          <div className="border-l-2 border-slate-100 ml-[34px]">
            {taskSubtasks.map(sub => <SubtaskRow key={sub.id} task={sub} memberMap={memberMap} members={members} onClick={() => onTaskClick(sub)} onUpdate={onRefresh} />)}
            {isAddingSubtask && <AddSubtaskInlineRow projectId={projectId} parentTask={task} subtaskCount={taskSubtasks.length} onSaved={() => { setAddingSubtaskFor(null); onRefresh() }} />}
            {!isAddingSubtask && (
              <button onClick={() => setAddingSubtaskFor(task.id)} className="flex w-full items-center gap-2 px-4 py-1.5 pl-[18px] text-xs text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors">
                <Plus size={11} className="shrink-0" /> Add subtask
              </button>
            )}
          </div>
        )}
      </>
    )
  }

  const ungroupedIds = localOrder[''] ?? []

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="space-y-1">
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <span className="w-3.5 shrink-0" /><span className="w-[15px] shrink-0" />
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
              <div className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50"
                onClick={() => !isRenaming && toggle(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)} onMouseLeave={() => setHoveredSection(null)}>
                {isCollapsed ? <ChevronRight size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                {isRenaming ? (
                  <input ref={renameInputRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleRenameSection() } if (e.key === 'Escape') setRenamingSection(null) }}
                    onBlur={handleRenameSection} onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm font-semibold text-slate-700 bg-transparent border-b border-primary-400 outline-none py-0 min-w-0" />
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-600">{section.name}</span>
                    <span className="text-xs text-slate-400">({sectionTasks.length})</span>
                    {completionSectionId === section.id && <span title="Completion section"><CheckCircle2 size={13} className="text-emerald-500 shrink-0" /></span>}
                    {(isHovered || menuOpen) && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setOpenMenuSection(menuOpen ? null : section.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors" title="More section actions">
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen && (
                          <SectionMenu
                            onRename={() => { setOpenMenuSection(null); setRenameValue(section.name); setRenamingSection(section.id) }}
                            onDelete={() => handleDeleteSection(section.id, sectionTasks.length)}
                            onClose={() => setOpenMenuSection(null)}
                            isCompletion={completionSectionId === section.id}
                            onToggleCompletion={() => toggleCompletionSection(section.id)} />
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
                      {sectionTasks.map(task => <div key={task.id}>{renderTaskWithSubtasks(task)}</div>)}
                    </SortableContext>
                  </SectionDropZone>
                  <AddTaskInlineRow projectId={projectId} sectionId={section.id} position={sectionTaskIds.length}
                    isActive={inlineAdding === section.id} onActivate={() => setInlineAdding(section.id)}
                    onDone={() => handleAddDone(section.id)} />
                </>
              )}
            </div>
          )
        })}

        {ungroupedIds.length > 0 && (
          <div>
            {sections.length > 0 && <div className="flex items-center gap-2 px-4 py-2"><span className="text-sm font-semibold text-slate-500">No section</span></div>}
            <SortableContext items={ungroupedIds} strategy={verticalListSortingStrategy}>
              {ungroupedIds.map(id => { const task = taskById[id]; if (!task) return null; return <div key={task.id}>{renderTaskWithSubtasks(task)}</div> })}
            </SortableContext>
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 mt-1">
          {addingSection ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input ref={sectionInputRef} autoFocus value={newSectionName}
                  onChange={e => { setNewSectionName(e.target.value); setSectionError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') { setNewSectionName(''); setAddingSection(false); setSectionError('') } }}
                  placeholder="Section name…"
                  className="flex-1 text-sm font-semibold text-slate-700 border-b border-slate-300 focus:border-primary-400 outline-none py-0.5 bg-transparent" />
                <button onClick={handleCreateSection} className="text-xs text-primary-600 font-medium hover:text-primary-700 shrink-0">Add</button>
                <button onClick={() => { setNewSectionName(''); setAddingSection(false); setSectionError('') }} className="text-xs text-slate-400 hover:text-slate-600 shrink-0">Cancel</button>
              </div>
              {sectionError && <p className="text-xs text-red-500">{sectionError}</p>}
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors">
              <Plus size={14} /> Add section
            </button>
          )}
        </div>

        {createSection !== null && (
          <CreateTaskModal open={true} onClose={() => setCreateSection(null)}
            onCreated={() => { setCreateSection(null); onRefresh() }}
            projectId={projectId} sections={sections} defaultSectionId={createSection} />
        )}
      </div>
      <DragOverlay dropAnimation={null}>{activeTask && <TaskGhost task={activeTask} />}</DragOverlay>
    </DndContext>
  )
}
