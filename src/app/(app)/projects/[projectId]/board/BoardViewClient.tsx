'use client';
import Link from 'next/link';
import { Plus, MessageSquare } from 'lucide-react';
import { PriorityBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import type { Task } from '@/lib/supabase/types';

const COLUMNS: { id: Task['status']; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',      color: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'review',      label: 'Review',      color: '#8b5cf6' },
  { id: 'blocked',     label: 'Blocked',     color: '#ef4444' },
  { id: 'done',        label: 'Done',        color: '#22c55e' },
];

const PRIORITY_BORDER: Record<Task['priority'], string> = {
  low: 'border-l-[#22c55e]', medium: 'border-l-[#f59e0b]',
  high: 'border-l-[#ef4444]', urgent: 'border-l-[#7c3aed]',
};

function TaskCard({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div className={`bg-white border border-[#e2e8f0] border-l-2 ${PRIORITY_BORDER[task.priority]} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer`}>
      <p className="text-sm text-[#334155] leading-snug mb-2">{task.title}</p>
      <div className="mb-2">
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
        {task.due_date && (
          <span className={isOverdue ? 'text-[#dc2626] font-medium' : ''}>
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function BoardViewClient({ project, tasks }: { project: { id: string; name: string; color: string }; tasks: Task[] }) {
  const color = getProjectColor(project.color);

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-[#e2e8f0] bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm text-[#1e293b]">{project.name}</span>
        <div className="flex items-center gap-1 ml-4">
          {(['Overview', 'List', 'Board'] as const).map(label => (
            <Link key={label} href={`/projects/${project.id}/${label.toLowerCase()}`}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                label === 'Board' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}>{label}</Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full" style={{ minWidth: `${COLUMNS.length * 272 + (COLUMNS.length - 1) * 12}px` }}>
          {COLUMNS.map(col => {
            const colCards = tasks.filter(t => t.status === col.id);
            return (
              <div key={col.id} className="flex flex-col w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-[#334155]">{col.label}</span>
                    <span className="text-xs text-[#94a3b8] bg-[#f1f5f9] rounded px-1.5 py-0.5">{colCards.length}</span>
                  </div>
                  <button className="text-[#94a3b8] hover:text-[#334155] p-0.5 rounded hover:bg-[#f1f5f9]">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2">
                  {colCards.map(task => <TaskCard key={task.id} task={task} />)}
                  {colCards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#94a3b8] min-h-20">
                      No tasks
                    </div>
                  )}
                </div>

                <button className="mt-2 flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] px-1 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
