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
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section, BoardColumnConfig } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

const ALL_STATUSES: BoardColumnConfig[] = [
  { status: 'todo',        name: 'To Do'       },
  { status: 'in_progress', name: 'In Progress'  },
  { status: 'review',      name: 'Review'       },
  { status: 'blocked',     name: 'Blocked'      },
  { status: 'done',        name: 'Done'         },
]

const COLUMN_STYLES: Record<string, { header: string; dot: string }> = {
  todo:        { header: 'bg-slate-100', dot: 'bg-slate-400' },
  in_progress: { header: 'bg-blue-50',   dot: 'bg-blue-500'  },
  review:      { header: 'bg-amber-50',  dot: 'bg-amber-500' },
  blocked:     { header: 'bg-red-50',    dot: 'bg-red-500'   },
  done:        { header: 'bg-green-50',  dot: 'bg-green-500' },
}

function getColStyle(status: string) {
  return COLUMN_STYLES[status] ?? { header: 'bg-purple-50', dot: 'bg-purple-500' }
}

function buildTaskOrder(tasks: Task[], columns: BoardColumnConfig[]): Record<string, string[]> {
  const order: Record<string, string[]> = {}
  for (const col of columns) {
    order[col.status] = tasks
      .filter(t => t.status === col.status)
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
  columns: BoardColumnConfig[]
  onTaskClick: (task: Task) => void
  onTaskMoved: (taskId: string, newStatus: string) => void
  onColumnsChanged: (cols: BoardColumnConfig[]) => void
  onRefresh: () => void
}

// ── Sortable task card ───────────────────────────────────────────────────────────────────

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

// ── Task ghost for DragOverlay ──────────────────────────────────────────────────────────────

function TaskCardGhost({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-primary-200 shadow-xl opacity-95 w-64">
      <p className="text-sm font-medium text-slate-700 leading-snug">{task.title}</p>
    </div>
  )
}

// ── Sortable column ───────────────────────────────────────────────────────────────────────

function SortableColumn({ col, taskIds, tasks, memberMap, onTaskClick, onRename, onRemove, onAddTask, isTaskDragActive }: {
  col: BoardColumnConfig
  taskIds: string[]
  tasks: Task[]
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRename: (name: string) => void
  onRemove: () => void
  onAddTask: () => void
  isTaskDragActive: boolean
}) {
  const appearance = getColStyle(col.status)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: col.status,
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
        col={col}
        count={colTasks.length}
        appearance={appearance}
        onRename={onRename}
        onRemove={onRemove}
        onAddTask={onAddTask}
        dragListeners={listeners}
        dragAttributes={attributes}
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

// ── Column header ───────────────────────────────────────────────────────────────────────

function ColumnHeader({ col, count, appearance, onRename, onRemove, onAddTask, dragListeners, dragAttributes }: {
  col: BoardColumnConfig
  count: number
  appearance: { header: string; dot: string }
  onRename: (name: string) => void
  onRemove: () => void
  onAddTask: () => void
  dragListeners: DraggableSyntheticListeners
  dragAttributes: DraggableAttributes
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(col.name)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => { setName(col.name) }, [col.name])

  function commit() {
    const trimmed = name.trim()
    if (trimmed && trimmed !== col.name) onRename(trimmed)
    else setName(col.name)
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
              if (e.key === 'Escape') { setName(col.name); setEditing(false) }
            }}
            className="text-sm font-semibold text-slate-700 bg-transparent border-b border-slate-500 outline-none w-28"
          />
        ) : (
          <span
            className="text-sm font-semibold text-slate-700 truncate cursor-default"
            onDoubleClick={() => setEditing(true)}
          >
            {col.name}
          </span>
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
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 w-40">
                <button
                  onClick={() => { setShowMenu(false); setEditing(true) }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={13} /> Rename
                </button>
                <button
                  onClick={() => { setShowMenu(false); onRemove() }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} /> Remove column
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main BoardView ───────────────────────────────────────────────────────────────────

export function BoardView({ sections, tasks, projectId, memberMap, columns, onTaskClick, onTaskMoved, onColumnsChanged, onRefresh }: Props) {
  const [createStatus, setCreateStatus] = useState<string | null>(null)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  // Local column order (optimistic during column drag)
  const [localColumns, setLocalColumns] = useState<BoardColumnConfig[]>(columns)
  const localColumnsRef = useRef<BoardColumnConfig[]>(columns)

  // Local task order per status — lazy init so tasks render immediately
  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>(
    () => buildTaskOrder(tasks, columns)
  )
  const taskOrderRef = useRef<Record<string, string[]>>(buildTaskOrder(tasks, columns))
  const isDraggingRef = useRef(false)
  const lastOverId = useRef<string | null>(null)

  // Active drag info
  const [activeDragType, setActiveDragType] = useState<'task' | 'column' | null>(null)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [activeColStatus, setActiveColStatus] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  // Sync columns prop → local (skip during drag)
  useEffect(() => {
    if (isDraggingRef.current) return
    setLocalColumns(columns)
    localColumnsRef.current = columns
  }, [columns])

  // Sync tasks prop → taskOrder (skip during drag)
  useEffect(() => {
    if (isDraggingRef.current) return
    const order = buildTaskOrder(tasks, columns)
    setTaskOrder(order)
    taskOrderRef.current = order
  }, [tasks, columns])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAddColumn(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function findStatusForTask(taskId: string): string {
    for (const [status, ids] of Object.entries(taskOrderRef.current)) {
      if (ids.includes(taskId)) return status
    }
    return ''
  }

  // Multi-container collision detection:
  // - For column drags: closestCenter among column droppables only
  // - For task drags: pointerWithin → rectIntersection, then if result is a column,
  //   drill in with closestCenter among that column's tasks
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const activeType = args.active.data.current?.type as string | undefined
    if (activeType === 'column') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          c => localColumnsRef.current.some(col => col.status === c.id)
        ),
      })
    }
    const within = pointerWithin(args)
    const candidates = within.length > 0 ? within : rectIntersection(args)
    if (candidates.length === 0) {
      return lastOverId.current ? [{ id: lastOverId.current }] : []
    }
    let overId = candidates[0].id as string
    // If we landed on a column container, find the closest task inside it
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
    if (type === 'column') setActiveColStatus(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const type = active.data.current?.type

    if (type === 'task') {
      const activeId = active.id as string
      const overId = over.id as string
      const activeStatus = findStatusForTask(activeId)
      const overType = over.data.current?.type

      const targetStatus = overType === 'column' ? overId : findStatusForTask(overId)
      if (!targetStatus) return

      // Skip same-column reorders — useSortable handles the visual via transforms;
      // we finalize the order in handleDragEnd to avoid transform/state conflicts.
      if (activeStatus === targetStatus) return

      // Cross-column move: update state so the card appears in the new column
      const cur = taskOrderRef.current
      const newOrder = { ...cur }
      newOrder[activeStatus] = (newOrder[activeStatus] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetStatus] ?? [])]
      const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetStatus] = targetIds
      taskOrderRef.current = newOrder
      setTaskOrder(newOrder)
    } else if (type === 'column') {
      if (over.data.current?.type !== 'column') return
      const cols = localColumnsRef.current
      const from = cols.findIndex(c => c.status === active.id)
      const to = cols.findIndex(c => c.status === over.id)
      if (from !== -1 && to !== -1 && from !== to) {
        const newCols = arrayMove(cols, from, to)
        localColumnsRef.current = newCols
        setLocalColumns(newCols)
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    lastOverId.current = null
    const type = event.active.data.current?.type
    setActiveDragType(null)
    setActiveTaskId(null)
    setActiveColStatus(null)

    if (type === 'task') {
      const taskId = event.active.id as string
      const originalTask = tasks.find(t => t.id === taskId)
      if (!originalTask) return

      // Apply same-column reorder now (skipped during dragOver)
      if (event.over && event.over.id !== taskId) {
        const overId = event.over.id as string
        const overType = event.over.data.current?.type
        if (overType === 'task') {
          const activeStatus = findStatusForTask(taskId)
          const overStatus = findStatusForTask(overId)
          if (activeStatus === overStatus) {
            const ids = taskOrderRef.current[activeStatus] ?? []
            const from = ids.indexOf(taskId)
            const to = ids.indexOf(overId)
            if (from !== -1 && to !== -1 && from !== to) {
              const newIds = arrayMove(ids, from, to)
              const newOrder = { ...taskOrderRef.current, [activeStatus]: newIds }
              taskOrderRef.current = newOrder
              setTaskOrder(newOrder)
            }
          }
        }
      }

      const finalStatus = findStatusForTask(taskId)
      const finalIds = taskOrderRef.current[finalStatus] ?? []

      if (finalStatus !== originalTask.status) {
        onTaskMoved(taskId, finalStatus)
      }

      await Promise.all(
        finalIds.map((id, idx) => {
          const upd: Record<string, unknown> = { position: idx }
          if (id === taskId && finalStatus !== originalTask.status) upd.status = finalStatus
          return supabase.from('tasks').update(upd).eq('id', id)
        })
      )
    } else if (type === 'column') {
      onColumnsChanged(localColumnsRef.current)
    }
  }

  function handleDragCancel() {
    isDraggingRef.current = false
    lastOverId.current = null
    setActiveDragType(null)
    setActiveTaskId(null)
    setActiveColStatus(null)
    // Revert to last known good state from props
    const order = buildTaskOrder(tasks, columns)
    taskOrderRef.current = order
    setTaskOrder(order)
    localColumnsRef.current = columns
    setLocalColumns(columns)
  }

  function renameColumn(status: string, newName: string) {
    const next = localColumnsRef.current.map(c => c.status === status ? { ...c, name: newName } : c)
    localColumnsRef.current = next
    setLocalColumns(next)
    onColumnsChanged(next)
  }

  function removeColumn(status: string) {
    const next = localColumnsRef.current.filter(c => c.status !== status)
    localColumnsRef.current = next
    setLocalColumns(next)
    onColumnsChanged(next)
  }

  function addColumn(col: BoardColumnConfig) {
    const next = [...localColumnsRef.current, col]
    localColumnsRef.current = next
    setLocalColumns(next)
    onColumnsChanged(next)
    setShowAddColumn(false)
  }

  const columnIds = localColumns.map(c => c.status)
  const usedStatuses = new Set(localColumns.map(c => c.status))
  const availableToAdd = ALL_STATUSES.filter(s => !usedStatuses.has(s.status))
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
          {localColumns.map(col => (
            <SortableColumn
              key={col.status}
              col={col}
              taskIds={taskOrder[col.status] ?? []}
              tasks={tasks}
              memberMap={memberMap}
              onTaskClick={onTaskClick}
              onRename={name => renameColumn(col.status, name)}
              onRemove={() => removeColumn(col.status)}
              onAddTask={() => setCreateStatus(col.status)}
              isTaskDragActive={activeDragType === 'task'}
            />
          ))}

          {/* Add column */}
          <div ref={addRef} className="shrink-0 w-56">
            {showAddColumn && availableToAdd.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Add column</p>
                {availableToAdd.map(s => {
                  const sStyle = getColStyle(s.status)
                  return (
                    <button
                      key={s.status}
                      onClick={() => addColumn(s)}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', sStyle.dot)} />
                      {s.name}
                    </button>
                  )
                })}
              </div>
            ) : availableToAdd.length > 0 ? (
              <button
                onClick={() => setShowAddColumn(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-white/60 rounded-xl transition-colors w-full"
              >
                <Plus size={15} /> Add column
              </button>
            ) : null}
          </div>
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activeDragType === 'task' && activeTask && (
          <TaskCardGhost task={activeTask} />
        )}
        {activeDragType === 'column' && activeColStatus && (
          <div className="w-64 bg-white/90 rounded-xl shadow-2xl border border-slate-200 p-3 flex items-center gap-2">
            <GripVertical size={14} className="text-slate-300" />
            <span className="text-sm font-semibold text-slate-600">
              {localColumns.find(c => c.status === activeColStatus)?.name ?? 'Column'}
            </span>
          </div>
        )}
      </DragOverlay>

      {createStatus !== null && (
        <CreateTaskModal
          open={true}
          onClose={() => setCreateStatus(null)}
          onCreated={() => { setCreateStatus(null); onRefresh() }}
          projectId={projectId}
          sections={sections}
          defaultSectionId={sections[0]?.id ?? null}
        />
      )}
    </DndContext>
  )
}
