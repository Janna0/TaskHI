import Link from 'next/link';
import { Plus, CheckCircle2, Clock, AlertTriangle, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { getProjectColor, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { asProfile, asProjects, asTasks } from '@/lib/supabase/query';
import type { Project, Task } from '@/lib/supabase/types';

function ProjectCard({ project }: { project: Project }) {
  const color = getProjectColor(project.color);
  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  return (
    <Link href={`/projects/${project.id}/list`} className="block bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#6366f1]/40 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium text-sm text-[#1e293b] group-hover:text-[#6366f1] transition-colors line-clamp-1">{project.name}</span>
        </div>
        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
      </div>
      {project.description && (
        <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{project.description}</p>
      )}
      {project.deadline && (
        <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-[#dc2626]' : 'text-[#64748b]'}`}>
          <Clock className="h-3 w-3" />
          <span>{isOverdue ? 'Overdue · ' : 'Due '}{formatDate(project.deadline)}</span>
        </div>
      )}
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [profileRes, favRes, tasksRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('projects').select('*').eq('is_favorite', true).eq('status', 'active').order('updated_at', { ascending: false }).limit(6),
    supabase.from('tasks').select('*').contains('assignee_ids', [user!.id]).neq('status', 'done').order('due_date', { ascending: true }).limit(10),
  ]);

  const profile = asProfile(profileRes.data);
  const favorites = asProjects(favRes.data);
  const myTasks = asTasks(tasksRes.data);

  const displayName = profile?.full_name ?? profile?.name ?? '';
  const now = new Date();
  const overdue = myTasks.filter(t => t.due_date && new Date(t.due_date) < now);
  const dueThisWeek = myTasks.filter(t => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    const week = new Date(now); week.setDate(week.getDate() + 7);
    return d >= now && d <= week;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e293b]">
            Good morning{displayName ? `, ${displayName.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">Here&apos;s what&apos;s happening today.</p>
        </div>
        <Link href="/projects">
          <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />New project</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active tasks',  value: myTasks.length,   icon: CheckCircle2, color: 'text-[#6366f1]', bg: 'bg-[#eef2ff]' },
          { label: 'Overdue',       value: overdue.length,    icon: AlertTriangle, color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' },
          { label: 'Due this week', value: dueThisWeek.length, icon: Clock,       color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
          { label: 'Fav. projects', value: favorites.length,  icon: TrendingUp,   color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-[#e2e8f0] rounded-xl p-4">
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-[#1e293b]">{value}</p>
            <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1e293b]">Favorite projects</h2>
            <Link href="/projects" className="text-xs text-[#6366f1] hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </div>
      )}

      {/* My tasks */}
      {myTasks.length > 0 && (
        <div className="bg-white border border-[#e2e8f0] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-sm font-semibold text-[#1e293b]">My tasks</h2>
            <Link href="/my-tasks" className="text-xs text-[#6366f1] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {myTasks.map((task: Task) => {
              const isOverdueTask = task.due_date && new Date(task.due_date) < now;
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                  <StatusBadge status={task.status} />
                  <span className="flex-1 text-sm text-[#334155] truncate">{task.title}</span>
                  <PriorityBadge priority={task.priority} />
                  {task.due_date && (
                    <span className={`text-xs hidden sm:block ${isOverdueTask ? 'text-[#dc2626] font-medium' : 'text-[#94a3b8]'}`}>
                      {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {favorites.length === 0 && myTasks.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[#94a3b8] text-sm mb-4">No projects or tasks yet.</p>
          <Link href="/projects">
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Create your first project</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
