import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, Clock, AlertCircle, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Task, Project } from '../types'
import { StatusBadge, PriorityBadge } from '../components/ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../lib/utils'
import { withFavorites } from '../lib/favorites'
import { getCached, setCached } from '../lib/pageCache'

interface HomeCache { tasks: Task[]; projects: Project[]; memberMap: Record<string, { name: string; color: string }> }

export function DashboardPage() {
  const { user, profile } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [memberMap, setMemberMap] = useState<Record<string, { name: string; color: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const key = `home:${user.id}`
    const cached = getCached<HomeCache>(key)
    if (cached) {
      setTasks(cached.tasks)
      setProjects(cached.projects)
      setMemberMap(cached.memberMap)
      setLoading(false)
      loadData(false)
    } else {
      loadData(true)
    }
  }, [user])

  async function loadData(showLoader = true) {
    if (showLoader) setLoading(true)
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user!.id)
        .neq('status', 'done')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10),
      supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6),
    ])
    let map: Record<string, { name: string; color: string }> = {}
    if (t) {
      setTasks(t)
      const allIds = [...new Set(t.flatMap((task: Task) => task.assignee_ids ?? []))]
      if (allIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, name, avatar_color').in('id', allIds)
        for (const pr of profiles ?? []) map[pr.id] = { name: pr.name ?? pr.id, color: pr.avatar_color ?? '#94a3b8' }
        setMemberMap(map)
      }
    }
    const projs = p ? await withFavorites(p, user!.id) : []
    if (p) setProjects(projs)
    setCached(`home:${user!.id}`, { tasks: t ?? [], projects: projs, memberMap: map })
    if (showLoader) setLoading(false)
  }

  const overdueTasks = tasks.filter(t => t.due_date && isOverdue(t.due_date))
  const favorites = projects.filter(p => p.is_favorite)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        Loading...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-20 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good {getGreeting()}, {profile?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's what's on your plate today.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<CheckSquare size={18} className="text-primary-500" />} label="Open tasks" value={tasks.length} color="bg-primary-50" />
        <StatCard icon={<AlertCircle size={18} className="text-red-500" />} label="Overdue" value={overdueTasks.length} color="bg-red-50" />
        <StatCard icon={<Star size={18} className="text-amber-500" />} label="Favorites" value={favorites.length} color="bg-amber-50" />
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-1.5 mb-3">
            <AlertCircle size={14} /> Overdue tasks
          </h2>
          <div className="space-y-1">
            {overdueTasks.map(task => <TaskRow key={task.id} task={task} memberMap={memberMap} />)}
          </div>
        </section>
      )}

      {/* Upcoming tasks */}
      <section>
        <h2 className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 mb-3">
          <Clock size={14} /> Upcoming tasks
        </h2>
        {tasks.filter(t => !isOverdue(t.due_date ?? '')).length === 0 && tasks.length === 0 ? (
          <p className="text-sm text-slate-400">No open tasks — great job!</p>
        ) : (
          <div className="space-y-1">
            {tasks.filter(t => !(t.due_date && isOverdue(t.due_date))).slice(0, 8).map(task => (
              <TaskRow key={task.id} task={task} memberMap={memberMap} />
            ))}
          </div>
        )}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-600 flex items-center gap-1.5 mb-3">
            <Star size={14} /> Favorite projects
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {favorites.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}

      {/* Recent projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-600">Recent projects</h2>
          <Link to="/projects" className="text-xs text-primary-600 hover:underline">View all</Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400">No projects yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {projects.slice(0, 4).map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-xl p-4 flex items-center gap-3', color)}>
      <div className="shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  )
}

function TaskRow({ task, memberMap }: { task: Task; memberMap: Record<string, { name: string; color: string }> }) {
  const overdue = task.due_date && isOverdue(task.due_date)
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  return (
    <Link
      to={`/projects/${task.project_id}?task=${task.id}`}
      className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
    >
      <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
      {assignees.length > 0 && (
        <div className="flex -space-x-1.5 shrink-0">
          {assignees.slice(0, 3).map((a, i) => (
            <div key={i} title={a.name}
              className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-semibold"
              style={{ background: a.color }}>
              {getInitials(a.name)}
            </div>
          ))}
          {assignees.length > 3 && (
            <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600">
              +{assignees.length - 3}
            </div>
          )}
        </div>
      )}
      <StatusBadge status={task.status} />
      <PriorityBadge priority={task.priority} />
      <span className={cn('text-xs shrink-0 w-14 text-right', overdue ? 'text-red-500 font-medium' : task.due_date ? 'text-slate-400' : 'text-slate-300')}>
        {task.due_date ? formatDate(task.due_date) : '—'}
      </span>
    </Link>
  )
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-primary-200 hover:shadow-sm transition-all"
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: project.color }} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{project.name}</p>
        {project.description && (
          <p className="text-xs text-slate-400 truncate mt-0.5">{project.description}</p>
        )}
      </div>
      {project.is_favorite && <Star size={13} className="ml-auto shrink-0 text-amber-400 fill-amber-400" />}
    </Link>
  )
}
