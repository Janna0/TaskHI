import { useState, useRef, useEffect, useCallback } from 'react'
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
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

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

function getColColor(idx: number) {
  return COL_COLORS[idx % COL_COLORS.length]
}

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

// ── Sortable task card ───────────────────────────────────────────────────────────────────────

function SortableTaskCard({ task, memberMap, onClick }: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  onClick: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' },
  })

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
      <p className={cn(
        'text-sm font-medium mb-2.5 leading-snug',
        task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700'
      )}>
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-1 flex-wrap">
        <PriorityBadge priority={task.priority} />
        <div className="flex items-center gap-1.5">
          {task.due_date && (
            <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
              {formatDate(task.due_date)}
            </span>
          )}
          {assignees.length > 0 && (
            <div className="flex -space-x-1">
              {assignees.slice(0, 2).map((a, i) => (
                <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0 border border-white"
                  style={{ background: a.color }} title={a.name}>
                  {getInitials(a.name)}
                </div>
              ))}
              {assignees.length > 2 && (
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-medium text-slate-600 border border-white">
                  +{assignees.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Task ghost for DragOverlay ──────────────────────────────────────────────────────────────────────

function TaskCardGhost({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-xl opacity-95 w-64">
      <p className="text-sm font-medium text-slate-700 leading-snug">{task.title}</p>
    </div>
  )
}

// ── Sortable column ──────────────────────────────────────────────────────────────────────────

function SortableColumn({ section, colIdx, taskIds, tasks, memberMap, onTaskClick, onRename, onRemove, onAddTask, isTaskDragActive, isCompletion, onToggleCompletion }: {
  section: Section
  colIdx: number
  taskIds: string[]
  tasks: Task[]
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRename: (name: string) => void
  onRemove: () => void
  onAddTask: () => void
  isTaskDragActive: boolean
  isCompletion: boolean
  onToggleCompletion: () => void
}) {
  const appearance = getColColor(colIdx)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    data: { type: 'column' },
  })
  const colTasks = taskIds.map(id => tasks.find(t => t.id === id)).filter((t): t is Task => !!t)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('flex flex-col w-64 shrink-0', isDragging && 'opacity-40')}
    >
      <ColumnHeader
        section={section}
        count={colTasks.length}
        appearance={appearance}
        onRename={onRename}
        onRemove={onRemove}
        onAddTask={onAddTask}
        dragListeners={listeners}
        dragAttributes={attributes}
        isCompletion={isCompletion}
        onToggleCompletion={onToggleCompletion}
      />

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          className={cn(
            'flex-1 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors',
            isTaskDragActive ? 'bg-primary-50/40' : 'bg-slate-100/60'
          )}
          style={{ minHeight: '120px' }}
        >
          {colTasks.map(task => (
            <SortableTaskCard
              key={task.id}
              task={task}
              memberMap={memberMap}
              onClick={() => onTaskClick(task)}
            />
          ))}
          {colTasks.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-slate-400">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Column header ─────────────────────────────────────────────────────────────────────────

function ColumnHeader({ section, count, appearance, onRename, onRemove, onAddTask, dragListeners, dragAttributes, isCompletion, onToggleCompletion }: {
  section: Section
  count: number
  appearance: { header: string; dot: string }
  onRename: (name: string) => void
  onRemove: () => void
  onAddTask: () => void
  dragListeners: DraggableSyntheticListeners
  dragAttributes: DraggableAttributes
  isCompletion: boolean
  onToggleCompletion: () => void
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
        <div
          {...dragListeners}
          {...dragAttributes}
          className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0 touch-none"
          title="Drag to reorder column"
        >
          <GripVertical size={14} />
        </div>

        <span className={cn('w-2 h-2 rounded-full shrink-0', appearance.dot)} />

        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={commit}
            onKeyDown={e => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') { setName(section.name); setEditing(false) }
            }}
            className="text-sm font-semibold text-slate-700 bg-transparent border-b border-slate-500 outline-none w-28"
          />
        ) : (
          <>
            <span
              className="text-sm font-semibold text-slate-700 truncate cursor-default"
              onDoubleClick={() => setEditing(true)}
            >
              {section.name}
            </span>
            {isCompletion && <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />}
          </>
        )}

        <span className="text-xs font-medium text-slate-400 bg-white/70 rounded-full px-1.5 shrink-0">
          {count}
        </span>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={onAddTask} className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors">
          <Plus size={15} />
        </button>
        <div className="relative">
          <button onClick={() => setShowMenu(m => !m)} className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors">
            <MoreHorizontal size={15} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 w-48">
                <button
                  onClick={() => { setShowMenu(false); setEditing(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  onClick={() => { setShowMenu(false); onToggleCompletion() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <CheckCircle2 size={13} className={isCompletion ? 'text-emerald-500' : 'text-slate-400'} />
                  <span className={isCompletion ? 'text-emerald-600' : 'text-slate-700'}>
                    {isCompletion ? 'Remove completion mark' : 'Mark as completion'}
                  </span>
                </button>
                <div className="border-t border-slate-100 my-1" />
                <button
                  onClick={() => { setShowMenu(false); onRemove() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} /> Remove section
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add section form ──────────────────────────────────────────────────────────────────────────

function AddSectionForm({ projectId, position, onDone }: {
  projectId: string
  position: number
  onDone: () => void
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  async function commit() {
    const trimmed = name.trim()
    if (!trimmed) { onDone(); return }
    setSaving(true)
    await supabase.from('sections').insert({ project_id: projectId, name: trimmed, position })
    setSaving(false)
    onDone()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 w-56">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">New section</p>
      <input
        ref={inputRef}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Section name"
        disabled={saving}
        className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-primary-400"
      />
    </div>
  )
}

// ── Main BoardView ───────────────────────────────────────────────────────────────────────────

export function BoardView({ sections, tasks: allTasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
  const tasks = allTasks.filter(t => !t.parent_task_id)
  const [createSectionId, setCreateSectionId] = useState<string | null>(null)
  const [showAddSection, setShowAddSection] = useState(false)
  const completionKey = `taskhi:completion-section:${projectId}`
  const [completionSectionId, setCompletionSectionId] = useState(() => localStorage.getItem(completionKey) ?? '')

  function toggleCompletionSection(sectionId: string) {
    const next = completionSectionId === sectionId ? '' : sectionId
    setCompletionSectionId(next)
    if (next) localStorage.setItem(completionKey, next)
    else localStorage.removeItem(completionKey)
  }

  // Local section order (optimistic during column drag)
  const [localSections, setLocalSections] = useState<Section[]>(sections)
  const localSectionsRef = useRef<Section[]>(sections)

  // Local task order per section — lazy init so tasks render immediately
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>(
    () => buildTaskOrder(tasks, sections)
  )
  const taskOrderRef = useRef<Record<string, string[]>>(buildTaskOrder(tasks, sections))
  const isDraggingRef = useRef(false)
  const lastOverId = useRef<string | null>(null)

  // Active drag info
  const [activeDragType, setActiveDragType] = useState<'task' | 'column' | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeColId, setActiveColId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  // Sync sections prop → local (skip during drag)
  useEffect(() => {
    if (isDraggingRef.current) return
    setLocalSections(sections)
    localSectionsRef.current = sections
  }, [sections])

  // Sync tasks prop → taskOrder (skip during drag)
  useEffect(() => {
    if (isDraggingRef.current) return
    const order = buildTaskOrder(tasks, sections)
    setTaskOrder(order)
    taskOrderRef.current = order
  }, [tasks, sections])

  function findSectionForTask(taskId: string): string {
    for (const [secId, ids] of Object.entries(taskOrderRef.current)) {
      if (ids.includes(taskId)) return secId
    }
    return ''
  }

  // Multi-container collision detection:
  // - Column drags: closestCenter among section droppables only
  // - Task drags: pointerWithin → rectIntersection, drill into column with closestCenter
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const activeType = args.active.data.current?.type as string | undefined
    if (activeType === 'column') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          c => localSectionsRef.current.some(s => s.id === c.id)
        ),
      })
    }
    const within = pointerWithin(args)
    const candidates = within.length > 0 ? within : rectIntersection(args)
    if (candidates.length === 0) {
      return lastOverId.current ? [{ id: lastOverId.current }] : []
    }
    let overId = candidates[0].id as string
    const colItems = taskOrderRef.current[overId]
    if (colItems !== undefined) {
      if (colItems.length > 0) {
        const inner = closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            c => colItems.includes(c.id as string)
          ),
        })
        if (inner.length > 0) overId = inner[0].id as string
      }
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
      const activeId = active.id as string
      const overId = over.id as string
      const activeSec = findSectionForTask(activeId)
      const overType = over.data.current?.type

      const targetSec = overType === 'column' ? overId : findSectionForTask(overId)
      if (!targetSec) return

      // Skip same-section reorders — finalized in handleDragEnd to avoid transform conflicts
      if (activeSec === targetSec) return

      // Cross-section move: update state so card appears in the new column
      const cur = taskOrderRef.current
      const newOrder = { ...cur }
      newOrder[activeSec] = (newOrder[activeSec] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetSec] ?? [])]
      const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetSec] = targetIds
      taskOrderRef.current = newOrder
      setTaskOrder(newOrder)
    } else if (type === 'column') {
      if (over.data.current?.type !== 'column') return
      const secs = localSectionsRef.current
      const from = secs.findIndex(s => s.id === active.id)
      const to = secs.findIndex(s => s.id === over.id)
      if (from !== -1 && to !== -1 && from !== to) {
        const newSecs = arrayMove(secs, from, to)
        localSectionsRef.current = newSecs
        setLocalSections(newSecs)
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    lastOverId.current = null
    const type = event.active.data.current?.type
    setActiveDragType(null)
    setActiveTaskId(null)
    setActiveColId(null)

    if (type === 'task') {
      const taskId = event.active.id as string
      const originalTask = tasks.find(t => t.id === taskId)
      if (!originalTask) return

      // Apply same-section reorder now (skipped during dragOver)
      if (event.over && event.over.id !== taskId) {
        const overId = event.over.id as string
        const overType = event.over.data.current?.type
        if (overType === 'task') {
          const activeSec = findSectionForTask(taskId)
          const overSec = findSectionForTask(overId)
          if (activeSec === overSec) {
            const ids = taskOrderRef.current[activeSec] ?? []
            const from = ids.indexOf(taskId)
            const to = ids.indexOf(overId)
            if (from !== -1 && to !== -1 && from !== to) {
              const newIds = arrayMove(ids, from, to)
              const newOrder = { ...taskOrderRef.current, [activeSec]: newIds }
              taskOrderRef.current = newOrder
              setTaskOrder(newOrder)
            }
          }
        }
      }

      const finalSec = findSectionForTask(taskId)
      const finalIds = taskOrderRef.current[finalSec] ?? []
      const crossSection = finalSec !== originalTask.section_id
      const movedToCompletion = !!finalSec && finalSec === completionSectionId

      await Promise.all(
        finalIds.map((id, idx) => {
          const upd: Record<string, unknown> = { position: idx }
          if (id === taskId) {
            if (crossSection) upd.section_id = finalSec
            if (movedToCompletion) upd.status = 'done'
          }
          return supabase.from('tasks').update(upd).eq('id', id)
        })
      )

      if (crossSection || movedToCompletion) onRefresh()
    } else if (type === 'column') {
      // Persist new section positions
      const newSecs = localSectionsRef.current
      await Promise.all(
        newSecs.map((sec, idx) =>
          supabase.from('sections').update({ position: idx }).eq('id', sec.id)
        )
      )
      onRefresh()
    }
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    lastOverId.current = null
    setActiveDragType(null)
    setActiveTaskId(null)
    setActiveColId(null)
    const order = buildTaskOrder(tasks, sections)
    taskOrderRef.current = order
    setTaskOrder(order)
    localSectionsRef.current = sections
    setLocalSections(sections)
  }

  async function renameSection(id: string, newName: string) {
    setLocalSections(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    await supabase.from('sections').update({ name: newName }).eq('id', id)
    onRefresh()
  }

  async function removeSection(id: string) {
    setLocalSections(prev => prev.filter(s => s.id !== id))
    await supabase.from('sections').delete().eq('id', id)
    onRefresh()
  }

  const columnIds = localSections.map(s => s.id)
  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-4 p-5 overflow-x-auto h-full items-start">
          {localSections.map((section, idx) => (
            <SortableColumn
              key={section.id}
              section={section}
              colIdx={idx}
              taskIds={taskOrder[section.id] ?? []}
              tasks={tasks}
              memberMap={memberMap}
              onTaskClick={onTaskClick}
              onRename={name => renameSection(section.id, name)}
              onRemove={() => removeSection(section.id)}
              onAddTask={() => setCreateSectionId(section.id)}
              isTaskDragActive={activeDragType === 'task'}
              isCompletion={completionSectionId === section.id}
              onToggleCompletion={() => toggleCompletionSection(section.id)}
            />
          ))}

          {/* Add section */}
          <div className="shrink-0 w-56">
            {showAddSection ? (
              <AddSectionForm
                projectId={projectId}
                position={localSections.length}
                onDone={() => { setShowAddSection(false); onRefresh() }}
              />
            ) : (
              <button
                onClick={() => setShowAddSection(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-colors w-full"
              >
                <Plus size={15} /> Add section
              </button>
            )}
          </div>
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeDragType === 'task' && activeTask && (
          <TaskCardGhost task={activeTask} />
        )}
        {activeDragType === 'column' && activeColId && (
          <div className="w-64 bg-white/90 rounded-xl shadow-2xl border border-slate-200 p-3 flex items-center gap-2">
            <GripVertical size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-slate-600">
              {localSections.find(s => s.id === activeColId)?.name ?? 'Section'}
            </span>
          </div>
        )}
      </DragOverlay>

      {createSectionId !== null && (
        <CreateTaskModal
          open={true}
          onClose={() => setCreateSectionId(null)}
          onCreated={() => { setCreateSectionId(null); onRefresh() }}
          projectId={projectId}
          sections={sections}
          defaultSectionId={createSectionId}
        />
      )}
    </DndContext>
  )
}
