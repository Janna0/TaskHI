import { createClient } from '@/lib/supabase/server';
import { asTasks } from '@/lib/supabase/query';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Task } from '@/lib/supabase/types';
import { Plus } from 'lucide-react';

function groupTasks(tasks: Task[]) {
  const now = new Date();
  const weekOut = new Date(now); weekOut.setDate(weekOut.getDate() + 7);
  const overdue: Task[] = [], today: Task[] = [], thisWeek: Task[] = [], upcoming: Task[] = [], noDue: Task[] = [];
  for (const t of tasks) {
    if (!t.due_date) { noDue.push(t); continue; }
    const d = new Date(t.due_date);
    if (d < now) overdue.push(t);
    else if (d.toDateString() === now.toDateString()) today.push(t);
    else if (d <= weekOut) thisWeek.push(t);
    else upcoming.push(t);
  }
  return { overdue, today, thisWeek, upcoming, noDue };
}

function TaskGroup({ tasks, label, accent }: { tasks: Task[]; label: string; accent: string }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${accent}`}>{label}</h2>
      <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
        {tasks.map((task, i) => (
          <div key={task.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors ${i < tasks.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}>
            <StatusBadge status={task.status} />
            <span className="flex-1 text-sm text-[#334155]">{task.title}</span>
            <PriorityBadge priority={task.priority} className="hidden md:flex" />
            {task.due_date && (
              <span className="text-xs text-[#94a3b8] w-14 text-right">{formatDate(task.due_date)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function MyTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: raw } = await supabase
    .from('tasks')
    .select('*')
    .contains('assignee_ids', [user!.id])
    .neq('status', 'done')
    .order('due_date', { ascending: true, nullsFirst: false });

  const tasks = asTasks(raw);
  const { overdue, today, thisWeek, upcoming, noDue } = groupTasks(tasks);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">My Tasks</h1>
        <p className="text-sm text-[#64748b] mt-0.5">
          {tasks.length === 0 ? 'No tasks assigned to you.' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} assigned to you.`}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20 text-[#94a3b8] text-sm">
          You&apos;re all caught up! 🎉
        </div>
      ) : (
        <div className="space-y-6">
          <TaskGroup tasks={overdue}  label="Overdue"      accent="text-[#dc2626]" />
          <TaskGroup tasks={today}    label="Today"        accent="text-[#334155]" />
          <TaskGroup tasks={thisWeek} label="This week"    accent="text-[#334155]" />
          <TaskGroup tasks={upcoming} label="Upcoming"     accent="text-[#64748b]" />
          <TaskGroup tasks={noDue}    label="No due date"  accent="text-[#94a3b8]" />
        </div>
      )}
    </div>
  );
}
