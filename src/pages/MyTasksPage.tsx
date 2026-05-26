import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Filter } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task } from '../types'
import { StatusBadge, PriorityBadge } from '../components/ui/Badge'
import { formatDate, isOverdue, cn, STATUS_LABELS, PRIORITY_LABELS } from '../lib/utils'

export function MyTasksPage() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('created_by', user!.id)
      .order('due_date', { ascending: true, nullsFirst: false })
    if (data) setTasks(data)
    setLoading(false)
  }

  const filtered = tasks.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const selectClass = 'h-8 px-2 text-xs rounded-md border border-slate-200 bg-white text-slate-600 focus:outline-none'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">My Tasks</h1>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select className={selectClass} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className={selectClass} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
            <option value="all">All priorities</option>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <CheckSquare size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No tasks found</p>
          <p className="text-slate-400 text-sm mt-1">
            {tasks.length === 0 ? 'Create tasks in your projects.' : 'Try adjusting the filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span className="flex-1">Task</span>
            <span className="w-28 text-center">Status</span>
            <span className="w-24 text-center">Priority</span>
            <span className="w-24 text-center">Due date</span>
          </div>
          {filtered.map(task => {
            const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
            return (
              <Link
                key={task.id}
                to={`/projects/${task.project_id}`}
                className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
              >
                <span className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
                  {task.title}
                </span>
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
          })}
        </div>
      )}
    </div>
  )
}
