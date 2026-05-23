'use client';
import Link from 'next/link';
import { Star, Plus, CheckCircle2, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { getProjectColor, formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import type { TaskStatus, TaskPriority } from '@/types/task';

const MOCK_FAVORITES = [
  { id: '1', name: 'Website Redesign', color: 'indigo', taskCount: 24, completedTaskCount: 16, deadline: '2026-06-15' },
  { id: '2', name: 'Q3 Marketing Campaign', color: 'orange', taskCount: 18, completedTaskCount: 11, deadline: '2026-06-30' },
  { id: '3', name: 'Mobile App MVP', color: 'violet', taskCount: 45, completedTaskCount: 20, deadline: '2026-07-31' },
];

const MOCK_MY_TASKS: { id: string; title: string; status: TaskStatus; priority: TaskPriority; dueDate: string; project: string }[] = [
  { id: 't1', title: 'Finalize landing page copy', status: 'in_progress', priority: 'high', dueDate: '2026-05-25', project: 'Website Redesign' },
  { id: 't2', title: 'Review design system tokens', status: 'todo', priority: 'medium', dueDate: '2026-05-27', project: 'Website Redesign' },
  { id: 't3', title: 'Set up email campaign', status: 'todo', priority: 'urgent', dueDate: '2026-05-24', project: 'Q3 Marketing' },
  { id: 't4', title: 'User research interviews', status: 'review', priority: 'medium', dueDate: '2026-05-28', project: 'Mobile App MVP' },
  { id: 't5', title: 'Fix nav on mobile', status: 'blocked', priority: 'high', dueDate: '2026-05-23', project: 'Website Redesign' },
];

const MOCK_ACTIVITY = [
  { id: 'a1', user: 'Maya Chen', avatar: undefined, action: 'completed', target: 'Wireframes v2', project: 'Website Redesign', time: '10 min ago' },
  { id: 'a2', user: 'James Park', avatar: undefined, action: 'commented on', target: 'Email campaign brief', project: 'Q3 Marketing', time: '42 min ago' },
  { id: 'a3', user: 'Alex Rivera', avatar: undefined, action: 'assigned you to', target: 'Fix nav on mobile', project: 'Website Redesign', time: '1h ago' },
  { id: 'a4', user: 'Maya Chen', avatar: undefined, action: 'created', target: 'Auth flow redesign', project: 'Mobile App MVP', time: '2h ago' },
];

function ProjectCard({ project }: { project: typeof MOCK_FAVORITES[0] }) {
  const pct = Math.round((project.completedTaskCount / project.taskCount) * 100);
  const color = getProjectColor(project.color);
  const isOverdue = new Date(project.deadline) < new Date();

  return (
    <Link href={`/projects/${project.id}/list`} className="block bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#6366f1]/40 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="font-medium text-sm text-[#1e293b] group-hover:text-[#6366f1] transition-colors line-clamp-1">{project.name}</span>
        </div>
        <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#64748b] mb-1.5">
          <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
          <div className="h-full bg-[#6366f1] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-[#dc2626]' : 'text-[#64748b]'}`}>
        <Clock className="h-3 w-3" />
        <span>{isOverdue ? 'Overdue · ' : 'Due '}{formatDate(project.deadline)}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const overdueTasks = MOCK_MY_TASKS.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'done');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e293b]">
            Good morning{user ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-sm text-[#64748b] mt-0.5">Here&apos;s what&apos;s happening today.</p>
        </div>
        <Link href="/projects">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active tasks', value: MOCK_MY_TASKS.filter(t => t.status !== 'done').length, icon: CheckCircle2, color: 'text-[#6366f1]', bg: 'bg-[#eef2ff]' },
          { label: 'Overdue', value: overdueTasks.length, icon: AlertTriangle, color: 'text-[#dc2626]', bg: 'bg-[#fef2f2]' },
          { label: 'Due this week', value: 3, icon: Clock, color: 'text-[#f59e0b]', bg: 'bg-[#fffbeb]' },
          { label: 'Completed', value: 12, icon: TrendingUp, color: 'text-[#16a34a]', bg: 'bg-[#f0fdf4]' },
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
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1e293b]">Favorite projects</h2>
          <Link href="/projects" className="text-xs text-[#6366f1] hover:underline">View all</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_FAVORITES.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My tasks */}
        <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-sm font-semibold text-[#1e293b]">My tasks</h2>
            <Link href="/my-tasks" className="text-xs text-[#6366f1] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {MOCK_MY_TASKS.map(task => {
              const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
              return (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                  <StatusBadge status={task.status} />
                  <span className="flex-1 text-sm text-[#334155] truncate">{task.title}</span>
                  <span className="text-xs text-[#94a3b8] hidden sm:block">{task.project}</span>
                  <PriorityBadge priority={task.priority} />
                  <span className={`text-xs ${isOverdue ? 'text-[#dc2626] font-medium' : 'text-[#94a3b8]'} hidden sm:block`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl">
          <div className="px-4 py-3 border-b border-[#e2e8f0]">
            <h2 className="text-sm font-semibold text-[#1e293b]">Team activity</h2>
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {MOCK_ACTIVITY.map(event => (
              <div key={event.id} className="flex gap-3 px-4 py-3">
                <Avatar name={event.user} size="sm" className="mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#334155] leading-snug">
                    <span className="font-medium">{event.user}</span>
                    {' '}{event.action}{' '}
                    <span className="font-medium text-[#6366f1]">{event.target}</span>
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-0.5">{event.project} · {event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
