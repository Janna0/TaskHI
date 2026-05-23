import { use } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/server';
import { asProject, asTasks, asProfiles } from '@/lib/supabase/query';
import type { Profile, Task } from '@/lib/supabase/types';

export default async function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const supabase = await createClient();

  const [projRes, taskRes, memberRes] = await Promise.all([
    supabase.from('projects').select('*').eq('id', projectId).single(),
    supabase.from('tasks').select('*').eq('project_id', projectId).is('parent_task_id', null),
    supabase.from('project_members').select('user_id, role').eq('project_id', projectId),
  ]);

  const project = asProject(projRes.data);
  const tasks = asTasks(taskRes.data);
  const members = ((memberRes.data ?? []) as { user_id: string; role: string }[]);

  let memberProfiles: Profile[] = [];
  if (members.length > 0) {
    const { data } = await supabase.from('profiles').select('*').in('id', members.map(m => m.user_id));
    memberProfiles = asProfiles(data);
  }

  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const color = project ? getProjectColor(project.color) : '#6366f1';

  const upcoming = tasks
    .filter(t => t.status !== 'done' && t.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#e2e8f0] bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm text-[#1e293b]">{project?.name ?? 'Project'}</span>
        <div className="flex items-center gap-1 ml-4">
          {(['Overview', 'List', 'Board'] as const).map(label => (
            <Link key={label} href={`/projects/${projectId}/${label.toLowerCase()}`}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                label === 'Overview' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}>{label}</Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Health */}
          <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#6366f1]" /> Project health
            </h2>
            <div className="flex items-center gap-6 mb-4">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#1e293b]">{pct}%</span>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {[
                  { label: 'Total tasks', value: total, icon: CheckCircle2, color: 'text-[#64748b]' },
                  { label: 'Completed', value: done, icon: CheckCircle2, color: 'text-[#22c55e]' },
                  { label: 'In progress', value: inProgress, icon: Clock, color: 'text-[#3b82f6]' },
                  { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-[#dc2626]' },
                ].map(({ label, value, icon: Icon, color: c }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${c}`} />
                    <div>
                      <p className="text-lg font-bold text-[#1e293b] leading-none">{value}</p>
                      <p className="text-xs text-[#94a3b8]">{label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-[#64748b] mb-1">
                <span>Overall progress</span><span>{pct}%</span>
              </div>
              <div className="h-2 bg-[#e2e8f0] rounded-full">
                <div className="h-full bg-[#6366f1] rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#6366f1]" /> Members ({members.length})
            </h2>
            {memberProfiles.length > 0 ? (
              <div className="space-y-3">
                {memberProfiles.map(p => {
                  const member = members.find(m => m.user_id === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <Avatar name={p.full_name ?? p.email} avatarUrl={p.avatar_url ?? undefined} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#334155]">{p.full_name ?? p.email}</p>
                        <p className="text-xs text-[#94a3b8] capitalize">{member?.role}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-[#94a3b8]">No members yet.</p>
            )}
          </div>

          {/* Upcoming tasks */}
          {upcoming.length > 0 && (
            <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#6366f1]" /> Upcoming tasks
              </h2>
              <div className="space-y-2">
                {upcoming.map((task: Task) => (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[#f1f5f9] last:border-0">
                    <StatusBadge status={task.status} />
                    <span className="flex-1 text-sm text-[#334155]">{task.title}</span>
                    <span className="text-xs text-[#94a3b8]">{formatDate(task.due_date!)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {project?.description && (
            <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#1e293b] mb-3">About</h2>
              <p className="text-sm text-[#64748b] leading-relaxed">{project.description}</p>
              {project.deadline && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-[#94a3b8]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Due {formatDate(project.deadline)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
