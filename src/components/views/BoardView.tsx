import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Task, Section } from '../../types'
import { StatusBadge, PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, STATUS_LABELS } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

const COLUMNS: { status: string; color: string }[] = [
  { status: 'todo', color: 'bg-slate-100' },
  { status: 'in_progress', color: 'bg-blue-50' },
  { status: 'review', color: 'bg-amber-50' },
  { status: 'done', color: 'bg-green-50' },
]

export function BoardView({ sections, tasks, projectId, onTaskClick, onRefresh }: Props) {
  const [createStatus, setCreateStatus] = useState<string | null>(null)

  return (
    <div className="flex gap-4 p-4 overflow-x-auto min-h-0 h-full">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status)
        return (
          <div key={col.status} className="flex flex-col w-64 shrink-0">
            {/* Column header */}
            <div className={cn('flex items-center justify-between px-3 py-2 rounded-t-lg', col.color)}>
              <span className="text-sm font-semibold text-slate-700">
                {STATUS_LABELS[col.status]}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">{colTasks.length}</span>
                <button
                  onClick={() => setCreateStatus(col.status)}
                  className="p-0.5 rounded hover:bg-white/60 text-slate-400 hover:text-slate-600"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 bg-slate-50 rounded-b-lg p-2 space-y-2 overflow-y-auto min-h-16">
              {colTasks.map(task => (
                <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
              ))}
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

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md hover:border-primary-200 cursor-pointer transition-all"
    >
      <p className={cn('text-sm font-medium mb-2', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
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
