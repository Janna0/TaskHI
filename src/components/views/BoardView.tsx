import { useState, useRef, useEffect, useCallback } from 'react'
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
  rectIntersection,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, Check, CheckCircle2, UserCircle, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'

const PRIORITY_OPTIONS: Task['priority'][] = ['urgent', 'high', 'medium', 'low']

const COL_COLORS = [
  { header: 'bg-slate-100',  dot: 'bg-slate-400'  },
  { header: 'bg-blue-50',    dot: 'bg-blue-500'   },
  { header: 'bg-amber-50',   dot: 'bg-amber-500'  },
  { header: 'bg-green-50',   dot: 'bg-green-500'  },
  { header: 'bg-purple-50',  dot: 'bg-purple-500' },
  { header: 'bg-rose-50',    dot: 'bg-rose-500'   },
  { header: 'bg-cyan-50',    dot: 'bg-cyan-500'   },
  { header: 'bg-orange-50',  dot: 'bg-orange-500' },
]

function getColColor(idx: number) { return COL_COLORS[idx % COL_COLORS.length] }

function buildTaskOrder(tasks: Task[], sections: Section[]): Record<string, string[]> {
  const order: Record<string, string[]> = {}
  for (const sec of sections) {
    order[sec.id] = tasks
      .filter(t => t.section_id === sec.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(t => t.id)
  }
  return order
}

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

interface Member { id: string; name: string; color: string }

// ── Portal dropdown (fixed position, escapes all overflow containers) ─────────────────────

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

// ── Inline add task card ──────────────────────────────────────────────

function InlineAddTaskCard({ sectionId, projectId, position, onDone }: {
  sectionId: string; projectId: string; position: number; onDone: () => void
}) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
  const [dueDate, setDueDate] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [showAssignee, setShowAssignee] = useState(false)
  const [assigneeStyle, setAssigneeStyle] = useState<React.CSSProperties>({})
  const cardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const assigneeBtnRef = useRef<HTMLButtonElement>(null)
  const assigneeMenuRef = useRef<HTMLDivElement>(null)
  const committingRef = useRef(false)
  const datePickerActiveRef = useRef(false)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
    loadMembers()
  }, [projectId])

  useEffect(() => {
    if (!showAssignee) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (assigneeBtnRef.current?.contains(t) || assigneeMenuRef.current?.contains(t)) return
      setShowAssignee(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAssignee])

  async function loadMembers() {
    try {
      const { data } = await supabase.from('project_members').select('user_id, profile:profiles(id, name, avatar_color)').eq('project_id', projectId)
      const list: Member[] = (data as any[] ?? []).map(r => ({ id: r.user_id, name: (r.profile as any)?.name ?? r.user_id, color: (r.profile as any)?.avatar_color ?? '#94a3b8' }))
      if (user && !list.some(m => m.id === user.id)) {
        const { data: profile } = await supabase.from('profiles').select('name, avatar_color').eq('id', user.id).single()
        if (profile) list.unshift({ id: user.id, name: (profile as any).name ?? 'Me', color: (profile as any).avatar_color ?? '#94a3b8' })
      }
      setMembers(list)
    } catch {}
  }

  async function save() {
    if (committingRef.current) return
    committingRef.current = true
    const trimmed = title.trim()
    if (!trimmed || !user) { onDone(); return }
    setSaving(true)
    await supabase.from('tasks').insert({ project_id: projectId, section_id: sectionId, title: trimmed, status: 'todo', priority: 'medium', position, created_by: user.id, assignee_ids: assigneeIds, due_date: dueDate || null })
    onDone()
  }

  function handleCardBlur(e: React.FocusEvent) {
    if (cardRef.current?.contains(e.relatedTarget as Node)) return
    if (datePickerActiveRef.current) return
    save()
  }

  function toggleAssignee(id: string) {
    setAssigneeIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function openAssignee() {
    if (assigneeBtnRef.current) setAssigneeStyle(calcDropStyle(assigneeBtnRef.current, 'left', members.length * 36 + 16))
    setShowAssignee(v => !v)
  }

  const selectedMembers = members.filter(m => assigneeIds.includes(m.id))
  const displayDate = dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null

  return (
    <div ref={cardRef} onBlur={handleCardBlur} className="bg-white rounded-lg p-3 border-2 border-primary-300 shadow-sm">
      <input ref={inputRef} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') { committingRef.current = true; onDone() } }}
        placeholder="Write a task name" disabled={saving}
        className="w-full text-sm text-slate-700 placeholder-slate-300 outline-none bg-transparent font-medium leading-snug" />
      <div className="flex items-center gap-2 mt-2.5">
        <div className="relative">
          <button ref={assigneeBtnRef} type="button" onMouseDown={e => e.preventDefault()} onClick={openAssignee} title="Assign this task"
            className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed transition-colors"
            style={{ borderColor: assigneeIds.length ? 'transparent' : undefined }}>
            {selectedMembers.length === 0 ? <UserCircle size={16} className="text-slate-300" /> : (
              <div className="flex -space-x-1.5">
                {selectedMembers.slice(0, 2).map((m, i) => <div key={i} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold" style={{ background: m.color }}>{getInitials(m.name)}</div>)}
                {selectedMembers.length > 2 && <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600">+{selectedMembers.length - 2}</div>}
              </div>
            )}
          </button>
          <PortalDropdown style={assigneeStyle} menuRef={assigneeMenuRef} open={showAssignee} minWidth={170}>
            {members.length === 0 ? <p className="px-3 py-2 text-xs text-slate-400">No members in project</p> : members.map(m => {
              const selected = assigneeIds.includes(m.id)
              return (
                <button key={m.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => toggleAssignee(m.id)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: m.color }}>{getInitials(m.name)}</div>
                  <span className="text-sm text-slate-700 flex-1 truncate">{m.name}</span>
                  {selected && <CheckCircle2 size={14} className="text-primary-500 shrink-0" />}
                </button>
              )
            })}
          </PortalDropdown>
        </div>
        <div className="relative flex items-center gap-1.5">
          <div className="relative w-7 h-7" title="Add due date">
            <div className={cn('w-7 h-7 rounded-full border-2 border-dashed flex items-center justify-center transition-colors', dueDate ? 'border-primary-400' : 'border-slate-300 hover:border-primary-400')}>
              <CalendarDays size={13} className={dueDate ? 'text-primary-500' : 'text-slate-300'} />
            </div>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              onFocus={() => { datePickerActiveRef.current = true }}
              onBlur={() => { setTimeout(() => { datePickerActiveRef.current = false }, 150) }}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          </div>
          {displayDate && <span className="text-xs text-slate-500">{displayDate}</span>}
        </div>
      </div>
    </div>
  )
}

// ── Sortable task card ───────────────────────────────────────────────────────

function SortableTaskCard({ task, memberMap, members, completionSectionId, onClick, onUpdate }: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  members: Member[]
  completionSectionId: string
  onClick: () => void
  onUpdate: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const [showAssignee, setShowAssignee] = useState(false)
  const [showPriority, setShowPriority] = useState(false)
  const [priorityStyle, setPriorityStyle] = useState<React.CSSProperties>({})
  const [assigneeStyle, setAssigneeStyle] = useState<React.CSSProperties>({})
  const priorityBtnRef = useRef<HTMLButtonElement>(null)
  const assigneeBtnRef = useRef<HTMLButtonElement>(null)
  const priorityMenuRef = useRef<HTMLDivElement>(null)
  const assigneeMenuRef = useRef<HTMLDivElement>(null)
  const isDone = task.status === 'done'

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' },
  })

  useEffect(() => {
    if (!showPriority) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (priorityBtnRef.current?.contains(t) || priorityMenuRef.current?.contains(t)) return
      setShowPriority(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showPriority])

  useEffect(() => {
    if (!showAssignee) return
    function handler(e: MouseEvent) {
      const t = e.target as Node
      if (assigneeBtnRef.current?.contains(t) || assigneeMenuRef.current?.contains(t)) return
      setShowAssignee(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAssignee])

  async function toggleComplete(e: React.MouseEvent) {
    e.stopPropagation()
    const upd: Record<string, unknown> = { status: isDone ? 'todo' : 'done' }
    if (!isDone && completionSectionId) upd.section_id = completionSectionId
    await supabase.from('tasks').update(upd).eq('id', task.id)
    onUpdate()
  }

  async function toggleAssignee(memberId: string) {
    const current = task.assignee_ids ?? []
    const next = current.includes(memberId) ? current.filter(id => id !== memberId) : [...current, memberId]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', task.id)
    onUpdate()
  }

  async function handleDateChange(date: string) {
    await supabase.from('tasks').update({ due_date: date || null }).eq('id', task.id)
    onUpdate()
  }

  async function handlePriorityChange(p: Task['priority']) {
    await supabase.from('tasks').update({ priority: p }).eq('id', task.id)
    onUpdate()
  }

  function openPriority(e: React.MouseEvent) {
    e.stopPropagation()
    if (priorityBtnRef.current) setPriorityStyle(calcDropStyle(priorityBtnRef.current, 'left', 4 * 36 + 8))
    setShowPriority(v => !v)
  }

  function openAssignee(e: React.MouseEvent) {
    e.stopPropagation()
    if (assigneeBtnRef.current) setAssigneeStyle(calcDropStyle(assigneeBtnRef.current, 'right', members.length * 36 + 16))
    setShowAssignee(v => !v)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg p-3 border border-slate-100 cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging ? 'opacity-40 shadow-none scale-95' : 'shadow-sm hover:shadow-md hover:border-primary-200'
      )}
    >
      {/* Title row with completion toggle */}
      <div className="flex items-start gap-2 mb-2.5">
        <div
          onPointerDown={e => e.stopPropagation()}
          onClick={toggleComplete}
          title={isDone ? 'Mark as incomplete' : 'Mark task complete'}
          className="shrink-0 mt-0.5 cursor-pointer group/check"
        >
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
        <p className={cn('text-sm font-medium leading-snug flex-1', isDone ? 'line-through text-slate-400' : 'text-slate-700')}>
          {task.title}
        </p>
      </div>

      {/* Bottom row: priority + date + assignee */}
      <div className="flex items-center justify-between gap-1">
        {/* Priority */}
        <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <button ref={priorityBtnRef} onClick={openPriority} className="cursor-pointer">
            <PriorityBadge priority={task.priority} />
          </button>
          <PortalDropdown style={priorityStyle} menuRef={priorityMenuRef} open={showPriority}>
            {PRIORITY_OPTIONS.map(p => (
              <button key={p} onClick={() => { handlePriorityChange(p); setShowPriority(false) }}
                className={cn('flex items-center gap-2 w-full px-3 py-1.5 hover:bg-slate-50 transition-colors', p === task.priority && 'bg-slate-50')}>
                <PriorityBadge priority={p} />
                {p === task.priority && <Check size={11} className="text-primary-500 ml-auto shrink-0" />}
              </button>
            ))}
          </PortalDropdown>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Due date */}
          <div className="relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} title={task.due_date ? 'Change due date' : 'Add due date'}>
            <div className={cn('flex items-center justify-center rounded-full transition-colors cursor-pointer', task.due_date ? 'gap-1' : 'w-6 h-6 border-2 border-dashed border-slate-200 hover:border-primary-300')}>
              {task.due_date ? (
                <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>{formatDate(task.due_date)}</span>
              ) : (
                <CalendarDays size={11} className="text-slate-300" />
              )}
            </div>
            <input type="date" value={task.due_date ?? ''} onChange={e => handleDateChange(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          </div>

          {/* Assignee */}
          <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <button ref={assigneeBtnRef} onClick={openAssignee} title={assignees.length ? 'Change assignees' : 'Assign task'} className="flex items-center">
              {assignees.length === 0 ? (
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 hover:border-primary-300 flex items-center justify-center transition-colors">
                  <UserCircle size={11} className="text-slate-300" />
                </div>
              ) : (
                <div className="flex -space-x-1">
                  {assignees.slice(0, 2).map((a, i) => (
                    <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 border border-white" style={{ background: a.color }} title={a.name}>
                      {getInitials(a.name)}
                    </div>
                  ))}
                  {assignees.length > 2 && <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-medium text-slate-600 border border-white">+{assignees.length - 2}</div>}
                </div>
              )}
            </button>
            <PortalDropdown style={assigneeStyle} menuRef={assigneeMenuRef} open={showAssignee} minWidth={160}>
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
            </PortalDropdown>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Task ghost for DragOverlay ────────────────────────────────────────────

function TaskCardGhost({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-xl opacity-95 w-64">
      <p className="text-sm font-medium text-slate-700 leading-snug">{task.title}</p>
    </div>
  )
}

// ── Sortable column ─────────────────────────────────────────────────────────────

function SortableColumn({ section, colIdx, taskIds, tasks, memberMap, members, completionSectionId, onTaskClick, onRename, onRemove, isTaskDragActive, isCompletion, onToggleCompletion, projectId, onRefresh }: {
  section: Section; colIdx: number; taskIds: string[]; tasks: Task[]
  memberMap: Record<string, { name: string; color: string }>; members: Member[]; completionSectionId: string
  onTaskClick: (task: Task) => void; onRename: (name: string) => void; onRemove: () => void
  isTaskDragActive: boolean; isCompletion: boolean; onToggleCompletion: () => void
  projectId: string; onRefresh: () => void
}) {
  const appearance = getColColor(colIdx)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id, data: { type: 'column' } })
  const colTasks = taskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => !!t)
  const [isAddingTask, setIsAddingTask] = useState(false)

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('flex flex-col w-64 shrink-0', isDragging && 'opacity-40')}>
      <ColumnHeader section={section} count={colTasks.length} appearance={appearance} onRename={onRename} onRemove={onRemove} onAddTask={() => setIsAddingTask(true)} dragListeners={listeners} dragAttributes={attributes} isCompletion={isCompletion} onToggleCompletion={onToggleCompletion} />
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className={cn('flex-1 rounded-b-xl p-2 space-y-2 transition-colors', isTaskDragActive ? 'bg-primary-50/40' : 'bg-slate-100/60')} style={{ minHeight: '120px' }}>
          {colTasks.map(task => (
            <SortableTaskCard key={task.id} task={task} memberMap={memberMap} members={members} completionSectionId={completionSectionId} onClick={() => onTaskClick(task)} onUpdate={onRefresh} />
          ))}
          {colTasks.length === 0 && !isAddingTask && <div className="flex items-center justify-center h-16 text-xs text-slate-400">Drop tasks here</div>}
          {isAddingTask && <InlineAddTaskCard sectionId={section.id} projectId={projectId} position={colTasks.length} onDone={() => { setIsAddingTask(false); onRefresh() }} />}
          <button onClick={() => setIsAddingTask(true)} className="flex items-center gap-1.5 w-full px-1 py-1 text-xs text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-white/60">
            <Plus size={13} /> Add task
          </button>
        </div>
      </SortableContext>
    </div>
  )
}

// ── Column header ───────────────────────────────────────────────────────────

function ColumnHeader({ section, count, appearance, onRename, onRemove, onAddTask, dragListeners, dragAttributes, isCompletion, onToggleCompletion }: {
  section: Section; count: number; appearance: { header: string; dot: string }
  onRename: (name: string) => void; onRemove: () => void; onAddTask: () => void
  dragListeners: DraggableSyntheticListeners; dragAttributes: DraggableAttributes
  isCompletion: boolean; onToggleCompletion: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(section.name)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => { setName(section.name) }, [section.name])

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== section.name) onRename(trimmed)
    else setName(section.name)
    setEditing(false)
  }

  return (
    <div className={cn('flex items-center justify-between px-2 py-2.5 rounded-t-xl', appearance.header)}>
      <div className="flex items-center gap-1.5 min-w-0">
        <div {...dragListeners} {...dragAttributes} className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0 touch-none" title="Drag to reorder column">
          <GripVertical size={14} />
        </div>
        <span className={cn('w-2 h-2 rounded-full shrink-0', appearance.dot)} />
        {editing ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(section.name); setEditing(false) } }}
            className="text-sm font-semibold text-slate-700 bg-transparent border-b border-slate-500 outline-none w-28" />
        ) : (
          <>
            <span className="text-sm font-semibold text-slate-700 truncate cursor-default" onDoubleClick={() => setEditing(true)}>{section.name}</span>
            {isCompletion && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
          </>
        )}
        <span className="text-xs font-medium text-slate-400 bg-white/70 rounded-full px-1.5 shrink-0">{count}</span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onAddTask} className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"><Plus size={15} /></button>
        <div className="relative">
          <button onClick={() => setShowMenu(m => !m)} className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"><MoreHorizontal size={15} /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 w-44">
                <button onClick={() => { setShowMenu(false); setEditing(true) }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><Pencil size={13} /> Rename</button>
                <button onClick={() => { setShowMenu(false); onToggleCompletion() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50">
                  <CheckCircle2 size={13} className={isCompletion ? 'text-emerald-500' : 'text-slate-400'} />
                  <span className={isCompletion ? 'text-emerald-600' : 'text-slate-700'}>{isCompletion ? 'Remove completion mark' : 'Mark as completion'}</span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button onClick={() => { setShowMenu(false); onRemove() }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={13} /> Remove section</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add section form ──────────────────────────────────────────────────

function AddSectionForm({ projectId, position, onDone }: { projectId: string; position: number; onDone: () => void }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { requestAnimationFrame(() => inputRef.current?.focus()) }, [])
  async function commit() {
    const trimmed = name.trim()
    if (!trimmed) { onDone(); return }
    setSaving(true)
    await supabase.from('sections').insert({ project_id: projectId, name: trimmed, position })
    setSaving(false); onDone()
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 w-56">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">New section</p>
      <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onDone() }}
        placeholder="Section name" disabled={saving}
        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary-400" />
    </div>
  )
}

// ── Main BoardView ─────────────────────────────────────────────────────

export function BoardView({ sections, tasks: allTasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
  const tasks = allTasks.filter(t => !t.parent_task_id)
  const { user } = useAuth()
  const [showAddSection, setShowAddSection] = useState(false)
  const [projectMembers, setProjectMembers] = useState<Member[]>([])
  const completionKey = `taskhi:completion-section:${projectId}`
  const [completionSectionId, setCompletionSectionId] = useState(() => localStorage.getItem(completionKey) ?? '')

  useEffect(() => { loadProjectMembers() }, [projectId])

  async function loadProjectMembers() {
    try {
      const { data } = await supabase.from('project_members').select('user_id, profile:profiles(id, name, avatar_color)').eq('project_id', projectId)
      const members: Member[] = (data as any[] ?? []).map(r => ({ id: r.user_id, name: (r.profile as any)?.name ?? r.user_id, color: (r.profile as any)?.avatar_color ?? '#94a3b8' }))
      if (user && !members.some(m => m.id === user.id)) {
        const { data: profile } = await supabase.from('profiles').select('name, avatar_color').eq('id', user.id).single()
        if (profile) members.unshift({ id: user.id, name: (profile as any).name ?? 'Me', color: (profile as any).avatar_color ?? '#94a3b8' })
      }
      setProjectMembers(members)
    } catch {}
  }

  function toggleCompletionSection(sectionId: string) {
    const next = completionSectionId === sectionId ? '' : sectionId
    setCompletionSectionId(next)
    if (next) localStorage.setItem(completionKey, next)
    else localStorage.removeItem(completionKey)
  }

  const [localSections, setLocalSections] = useState<Section[]>(sections)
  const localSectionsRef = useRef<Section[]>(sections)
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>(() => buildTaskOrder(tasks, sections))
  const taskOrderRef = useRef<Record<string, string[]>>(buildTaskOrder(tasks, sections))
  const isDraggingRef = useRef(false)
  const lastOverId = useRef<string | null>(null)
  const [activeDragType, setActiveDragType] = useState<'task' | 'column' | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeColId, setActiveColId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  useEffect(() => { if (!isDraggingRef.current) { setLocalSections(sections); localSectionsRef.current = sections } }, [sections])
  useEffect(() => { if (!isDraggingRef.current) { const o = buildTaskOrder(tasks, sections); setTaskOrder(o); taskOrderRef.current = o } }, [tasks, sections])

  function findSectionForTask(taskId: string): string {
    for (const [secId, ids] of Object.entries(taskOrderRef.current)) { if (ids.includes(taskId)) return secId }
    return ''
  }

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const activeType = args.active.data.current?.type as string | undefined
    if (activeType === 'column') return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => localSectionsRef.current.some(s => s.id === c.id)) })
    const within = pointerWithin(args)
    const candidates = within.length > 0 ? within : rectIntersection(args)
    if (candidates.length === 0) return lastOverId.current ? [{ id: lastOverId.current }] : []
    let overId = candidates[0].id as string
    const colItems = taskOrderRef.current[overId]
    if (colItems !== undefined && colItems.length > 0) {
      const inner = closestCenter({ ...args, droppableContainers: args.droppableContainers.filter(c => colItems.includes(c.id as string)) })
      if (inner.length > 0) overId = inner[0].id as string
    }
    lastOverId.current = overId
    return [{ id: overId }]
  }, [])

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true
    const type = event.active.data.current?.type as 'task' | 'column'
    setActiveDragType(type)
    if (type === 'task') setActiveTaskId(event.active.id as string)
    if (type === 'column') setActiveColId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const type = active.data.current?.type
    if (type === 'task') {
      const activeId = active.id as string; const overId = over.id as string
      const activeSec = findSectionForTask(activeId)
      const targetSec = over.data.current?.type === 'column' ? overId : findSectionForTask(overId)
      if (!targetSec || activeSec === targetSec) return
      const newOrder = { ...taskOrderRef.current }
      newOrder[activeSec] = (newOrder[activeSec] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetSec] ?? [])]
      const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetSec] = targetIds
      taskOrderRef.current = newOrder; setTaskOrder(newOrder)
    } else if (type === 'column') {
      if (over.data.current?.type !== 'column') return
      const secs = localSectionsRef.current
      const from = secs.findIndex(s => s.id === active.id); const to = secs.findIndex(s => s.id === over.id)
      if (from !== -1 && to !== -1 && from !== to) { const newSecs = arrayMove(secs, from, to); localSectionsRef.current = newSecs; setLocalSections(newSecs) }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false; lastOverId.current = null
    const type = event.active.data.current?.type
    setActiveDragType(null); setActiveTaskId(null); setActiveColId(null)
    if (type === 'task') {
      const taskId = event.active.id as string
      const originalTask = tasks.find(t => t.id === taskId)
      if (!originalTask) return
      if (event.over && event.over.id !== taskId && event.over.data.current?.type === 'task') {
        const activeSec = findSectionForTask(taskId); const overSec = findSectionForTask(event.over.id as string)
        if (activeSec === overSec) {
          const ids = taskOrderRef.current[activeSec] ?? []
          const from = ids.indexOf(taskId); const to = ids.indexOf(event.over.id as string)
          if (from !== -1 && to !== -1 && from !== to) { const newIds = arrayMove(ids, from, to); const newOrder = { ...taskOrderRef.current, [activeSec]: newIds }; taskOrderRef.current = newOrder; setTaskOrder(newOrder) }
        }
      }
      const finalSec = findSectionForTask(taskId)
      const finalIds = taskOrderRef.current[finalSec] ?? []
      const crossSection = finalSec !== originalTask.section_id
      const movedToCompletion = !!finalSec && finalSec === completionSectionId
      const movedFromCompletion = crossSection && originalTask.section_id === completionSectionId && !movedToCompletion
      await Promise.all(finalIds.map((id, idx) => {
        const upd: Record<string, unknown> = { position: idx }
        if (id === taskId) {
          if (crossSection) upd.section_id = finalSec
          if (movedToCompletion) upd.status = 'done'
          else if (movedFromCompletion && originalTask.status === 'done') upd.status = 'todo'
        }
        return supabase.from('tasks').update(upd).eq('id', id)
      }))
      if (crossSection || movedToCompletion) onRefresh()
    } else if (type === 'column') {
      await Promise.all(localSectionsRef.current.map((sec, idx) => supabase.from('sections').update({ position: idx }).eq('id', sec.id)))
      onRefresh()
    }
  }

  function handleDragCancel() {
    isDraggingRef.current = false; lastOverId.current = null
    setActiveDragType(null); setActiveTaskId(null); setActiveColId(null)
    const order = buildTaskOrder(tasks, sections); taskOrderRef.current = order; setTaskOrder(order)
    localSectionsRef.current = sections; setLocalSections(sections)
  }

  async function renameSection(id: string, newName: string) {
    setLocalSections(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    await supabase.from('sections').update({ name: newName }).eq('id', id); onRefresh()
  }

  async function removeSection(id: string) {
    setLocalSections(prev => prev.filter(s => s.id !== id))
    await supabase.from('sections').delete().eq('id', id); onRefresh()
  }

  const columnIds = localSections.map(s => s.id)
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null

  return (
    <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 p-5 overflow-x-auto h-full items-start">
          {localSections.map((section, idx) => (
            <SortableColumn
              key={section.id} section={section} colIdx={idx}
              taskIds={taskOrder[section.id] ?? []} tasks={tasks}
              memberMap={memberMap} members={projectMembers} completionSectionId={completionSectionId}
              onTaskClick={onTaskClick}
              onRename={name => renameSection(section.id, name)}
              onRemove={() => removeSection(section.id)}
              isTaskDragActive={activeDragType === 'task'}
              isCompletion={completionSectionId === section.id}
              onToggleCompletion={() => toggleCompletionSection(section.id)}
              projectId={projectId} onRefresh={onRefresh}
            />
          ))}
          <div className="shrink-0 w-56">
            {showAddSection
              ? <AddSectionForm projectId={projectId} position={localSections.length} onDone={() => { setShowAddSection(false); onRefresh() }} />
              : <button onClick={() => setShowAddSection(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-colors w-full"><Plus size={15} /> Add section</button>
            }
          </div>
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeDragType === 'task' && activeTask && <TaskCardGhost task={activeTask} />}
        {activeDragType === 'column' && activeColId && (
          <div className="w-64 bg-white/90 rounded-xl shadow-2xl border border-slate-200 p-3 flex items-center gap-2">
            <GripVertical size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-slate-600">{localSections.find(s => s.id === activeColId)?.name ?? 'Section'}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
