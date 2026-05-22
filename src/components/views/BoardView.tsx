import { useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, STATUS_LABELS } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

const COLUMNS: { status: string; headerColor: string; dotColor: string }[] = [
  { status: 'todo',        headerColor: 'bg-slate-100',  dotColor: 'bg-slate-400' },
  { status: 'in_progress', headerColor: 'bg-blue-50',    dotColor: 'bg-blue-500'  },
  { status: 'review',      headerColor: 'bg-amber-50',   dotColor: 'bg-amber-500' },
  { status: 'done',        headerColor: 'bg-green-50',   dotColor: 'bg-green-500' },
]

export function BoardView({ sections, tasks, projectId, onTaskClick, onRefresh }: Props) {
  const [createStatus, setCreateStatus] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null)

  async function handleDrop(newStatus: string) {
    if (!draggingId) return
    const task = tasks.find(t => t.id === draggingId)
    setDraggingId(null)
    setDragOverStatus(null)
    if (!task || task.status === newStatus) return
    await supabase.from('tasks').update({ status: newStatus }).eq('id', draggingId)
    onRefresh()
  }

  return (
    <div className="flex gap-4 p-5 overflow-x-auto h-full">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)
        const isOver = dragOverStatus === col.status

        return (
          <div
            key={col.status}
            className="flex flex-col w-64 shrink-0"
            onDragOver={e => { e.preventDefault(); setDragOverStatus(col.status) }}
            onDragLeave={e => {
              // Only clear if leaving the column entirely (not into a child)
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverStatus(null)
              }
            }}
            onDrop={e => { e.preventDefault(); handleDrop(col.status) }}
          >
            {/* Column header */}
            <div className={cn('flex items-center justify-between px-3 py-2.5 rounded-t-xl', col.headerColor)}>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', col.dotColor)} />
                <span className="text-sm font-semibold text-slate-700">
                  {STATUS_LABELS[col.status]}
                </span>
                <span className="text-xs font-medium text-slate-400 bg-white/70 rounded-full px-1.5">
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => setCreateStatus(col.status)}
                className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Cards area */}
            <div
              className={cn(
                'flex-1 rounded-b-xl p-2 space-y-2 overflow-y-auto transition-colors',
                isOver ? 'bg-primary-50 outline outline-2 outline-primary-300 outline-offset-[-2px]' : 'bg-slate-100/60'
              )}
              style={{ minHeight: '120px' }}
            >
              {colTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isDragging={draggingId === task.id}
                  onClick={() => onTaskClick(task)}
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverStatus(null) }}
                />
              ))}

              {colTasks.length === 0 && !isOver && (
                <div className="flex items-center justify-center h-16 text-xs text-slate-400">
                  Drop tasks here
                </div>
              )}
            </div>
          </div>
        )
      })}

      {createStatus && (
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

interface CardProps {
  task: Task
  isDragging: boolean
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function TaskCard({ task, isDragging, onClick, onDragStart, onDragEnd }: CardProps) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg p-3 border border-slate-100 cursor-grab active:cursor-grabbing transition-all select-none',
        isDragging
          ? 'opacity-40 shadow-none scale-95'
          : 'shadow-sm hover:shadow-md hover:border-primary-200'
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
        {task.due_date && (
          <span className={cn('text-xs', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  )
}
