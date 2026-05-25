import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Plus, ChevronDown, ChevronRight, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { StatusBadge, PriorityBadge } from '../ui/Badge'
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

// ── Droppable section wrapper ───────────────────────────────────────────────────

function DroppableSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={cn('min-h-[4px] transition-colors', isOver && 'bg-primary-50')}
    >
      {children}
    </div>
  )
}

// ── Inline add-task row ─────────────────────────────────────────────────────────

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

// ── Draggable task row ───────────────────────────────────────────────────────────

function TaskRow({
  task,
  memberMap,
  onClick,
}: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  onClick: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 group',
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

      <span className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {task.title}
      </span>
      <div className="w-28 flex justify-center">
        <StatusBadge status={task.status} />
      </div>
      <div className="w-24 flex justify-center">
        <PriorityBadge priority={task.priority} />
      </div>
      <div className={cn('w-24 text-xs text-center', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
        {task.due_date ? formatDate(task.due_date) : '—'}
      </div>
      <div className="w-10 flex justify-center">
        <div className="flex -space-x-1.5">
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
        </div>
      </div>
    </div>
  )
}

// ── Ghost shown in DragOverlay ────────────────────────────────────────────────────

function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-primary-200 rounded-lg shadow-lg opacity-95">
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
      <StatusBadge status={task.status} />
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

export function ListView({ sections, tasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [inlineAdding, setInlineAdding] = useState<string | null>(null)
  const [createSection, setCreateSection] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [sectionOverrides, setSectionOverrides] = useState<Record<string, string>>({})
  const sectionInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const effectiveTasks = tasks.map(t =>
    t.id in sectionOverrides ? { ...t, section_id: sectionOverrides[t.id] } : t
  )

  function toggle(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Only clears inlineAdding if the section that finished is still the active one,
  // so clicking a different section's row mid-save doesn't clobber the new active row.
  function handleAddDone(sectionId: string) {
    setInlineAdding(prev => prev === sectionId ? null : prev)
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
    const task = effectiveTasks.find(t => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return
    const taskId = active.id as string
    const newSectionId = over.id as string
    const task = effectiveTasks.find(t => t.id === taskId)
    if (!task || task.section_id === newSectionId) return
    const prevSectionId = task.section_id
    setSectionOverrides(prev => ({ ...prev, [taskId]: newSectionId }))
    const { error } = await supabase.from('tasks').update({ section_id: newSectionId }).eq('id', taskId)
    if (error) {
      setSectionOverrides(prev => ({ ...prev, [taskId]: prevSectionId ?? '' }))
    }
  }

  const ungrouped = effectiveTasks.filter(t => !t.section_id)

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-1">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <span className="w-3.5 shrink-0" />
          <span className="flex-1">Task</span>
          <span className="w-28 text-center">Status</span>
          <span className="w-24 text-center">Priority</span>
          <span className="w-24 text-center">Due date</span>
          <span className="w-8" />
        </div>

        {sections.map(section => {
          const sectionTasks = effectiveTasks.filter(t => t.section_id === section.id)
          const isCollapsed = collapsed[section.id]
          return (
            <div key={section.id}>
              <div
                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50 group"
                onClick={() => toggle(section.id)}
              >
                {isCollapsed
                  ? <ChevronRight size={14} className="text-slate-400" />
                  : <ChevronDown size={14} className="text-slate-400" />}
                <span className="text-sm font-semibold text-slate-600">{section.name}</span>
                <span className="text-xs text-slate-400">({sectionTasks.length})</span>
                <button
                  className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                  onClick={e => { e.stopPropagation(); setInlineAdding(section.id) }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {!isCollapsed && (
                <DroppableSection id={section.id}>
                  {sectionTasks.map(task => (
                    <TaskRow key={task.id} task={task} memberMap={memberMap} onClick={() => onTaskClick(task)} />
                  ))}
                  <AddTaskInlineRow
                    projectId={projectId}
                    sectionId={section.id}
                    position={sectionTasks.length}
                    isActive={inlineAdding === section.id}
                    onActivate={() => setInlineAdding(section.id)}
                    onDone={() => handleAddDone(section.id)}
                  />
                </DroppableSection>
              )}
            </div>
          )
        })}

        {/* Ungrouped tasks */}
        {ungrouped.length > 0 && (
          <div>
            {sections.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-sm font-semibold text-slate-500">No section</span>
              </div>
            )}
            {ungrouped.map(task => (
              <TaskRow key={task.id} task={task} memberMap={memberMap} onClick={() => onTaskClick(task)} />
            ))}
          </div>
        )}

        {/* Add section */}
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
