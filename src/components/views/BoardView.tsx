import { useState, useRef, useEffect } from 'react'
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

function colStyle(status: string) {
  return COLUMN_STYLES[status] ?? { header: 'bg-purple-50', dot: 'bg-purple-500' }
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

export function BoardView({ sections, tasks, projectId, memberMap, columns, onTaskClick, onTaskMoved, onColumnsChanged, onRefresh }: Props) {
  const [createStatus, setCreateStatus] = useState<string | null>(null)
  // Task dragging
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)
  // Column dragging
  const [draggingColStatus, setDraggingColStatus] = useState<string | null>(null)
  const [dragOverColStatus, setDragOverColStatus] = useState<string | null>(null)

  const [showAddColumn, setShowAddColumn] = useState(false)
  const addRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAddColumn(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // ── Task drop ──
  function handleTaskDrop(targetStatus: string) {
    if (!draggingTaskId) return
    const task = tasks.find(t => t.id === draggingTaskId)
    setDraggingTaskId(null)
    setDragOverStatus(null)
    if (!task || task.status === targetStatus) return
    onTaskMoved(draggingTaskId, targetStatus)
    supabase.from('tasks').update({ status: targetStatus }).eq('id', draggingTaskId)
  }

  // ── Column drop ──
  function handleColumnDrop(targetStatus: string) {
    if (!draggingColStatus || draggingColStatus === targetStatus) return
    const from = columns.findIndex(c => c.status === draggingColStatus)
    const to   = columns.findIndex(c => c.status === targetStatus)
    if (from === -1 || to === -1) return
    const next = [...columns]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onColumnsChanged(next)
    setDraggingColStatus(null)
    setDragOverColStatus(null)
  }

  function renameColumn(status: string, newName: string) {
    onColumnsChanged(columns.map(c => c.status === status ? { ...c, name: newName } : c))
  }

  function removeColumn(status: string) {
    onColumnsChanged(columns.filter(c => c.status !== status))
  }

  function addColumn(col: BoardColumnConfig) {
    onColumnsChanged([...columns, col])
    setShowAddColumn(false)
  }

  const usedStatuses = new Set(columns.map(c => c.status))
  const availableToAdd = ALL_STATUSES.filter(s => !usedStatuses.has(s.status))

  return (
    <div className="flex gap-4 p-5 overflow-x-auto h-full items-start">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)
        const style = colStyle(col.status)
        const isTaskOver   = !draggingColStatus && dragOverStatus === col.status
        const isColOver    = draggingColStatus && dragOverColStatus === col.status && draggingColStatus !== col.status
        const isBeingDragged = draggingColStatus === col.status

        return (
          <div
            key={col.status}
            className={cn(
              'flex flex-col w-64 shrink-0 transition-opacity',
              isBeingDragged && 'opacity-40'
            )}
            onDragOver={e => {
              e.preventDefault()
              if (draggingColStatus) setDragOverColStatus(col.status)
              else setDragOverStatus(col.status)
            }}
            onDragLeave={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverStatus(null)
                setDragOverColStatus(null)
              }
            }}
            onDrop={e => {
              e.preventDefault()
              if (draggingColStatus) handleColumnDrop(col.status)
              else handleTaskDrop(col.status)
            }}
          >
            <ColumnHeader
              col={col}
              count={colTasks.length}
              style={style}
              isColOver={!!isColOver}
              onRename={name => renameColumn(col.status, name)}
              onRemove={() => removeColumn(col.status)}
              onAddTask={() => setCreateStatus(col.status)}
              onColumnDragStart={() => setDraggingColStatus(col.status)}
              onColumnDragEnd={() => { setDraggingColStatus(null); setDragOverColStatus(null) }}
            />

            <div
              className={cn(
                'flex-1 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors',
                isTaskOver
                  ? 'bg-primary-50 outline outline-2 outline-primary-300 outline-offset-[-2px]'
                  : 'bg-slate-100/60'
              )}
              style={{ minHeight: '120px' }}
            >
              {colTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  memberMap={memberMap}
                  isDragging={draggingTaskId === task.id}
                  onClick={() => onTaskClick(task)}
                  onDragStart={() => setDraggingTaskId(task.id)}
                  onDragEnd={() => { setDraggingTaskId(null); setDragOverStatus(null) }}
                />
              ))}
              {colTasks.length === 0 && !isTaskOver && (
                <div className="flex items-center justify-center h-16 text-xs text-slate-400">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Add column */}
      <div ref={addRef} className="shrink-0 w-56">
        {showAddColumn && availableToAdd.length > 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
            <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Add column</p>
            {availableToAdd.map(s => {
              const style = colStyle(s.status)
              return (
                <button
                  key={s.status}
                  onClick={() => addColumn(s)}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', style.dot)} />
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
    </div>
  )
}

// ─── Column Header ────────────────────────────────────────────────────────────

function ColumnHeader({ col, count, style, isColOver, onRename, onRemove, onAddTask, onColumnDragStart, onColumnDragEnd }: {
  col: BoardColumnConfig
  count: number
  style: { header: string; dot: string }
  isColOver: boolean
  onRename: (name: string) => void
  onRemove: () => void
  onAddTask: () => void
  onColumnDragStart: () => void
  onColumnDragEnd: () => void
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
    <div className={cn(
      'flex items-center justify-between px-2 py-2.5 rounded-t-xl transition-all',
      style.header,
      isColOver && 'ring-2 ring-primary-400 ring-inset'
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        {/* Drag handle */}
        <div
          draggable
          onDragStart={e => { e.stopPropagation(); onColumnDragStart() }}
          onDragEnd={onColumnDragEnd}
          className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0"
          title="Drag to reorder"
        >
          <GripVertical size={14} />
        </div>

        <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />

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

// ─── Task Card ────────────────────────────────────────────────────────────────

interface CardProps {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  isDragging: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function TaskCard({ task, memberMap, isDragging, onClick, onDragStart, onDragEnd }: CardProps) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
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
