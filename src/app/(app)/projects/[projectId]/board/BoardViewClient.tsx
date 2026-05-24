'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Loader2 } from 'lucide-react';
import { PriorityBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
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

function AddTaskCard({ projectId, status, taskCount, onSaved }: {
  projectId: string;
  status: Task['status'];
  taskCount: number;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const calledRef = useRef(false);

  async function save() {
    if (calledRef.current) return;
    const trimmed = title.trim();
    if (!trimmed) { onSaved(); return; }
    calledRef.current = true;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('tasks').insert({
      project_id: projectId,
      title: trimmed,
      status,
      priority: 'medium',
      position: taskCount,
      depth: 0,
    });
    setSaving(false);
    if (err) {
      calledRef.current = false;
      setError(`Failed: ${err.message}`);
      return;
    }
    onSaved();
  }

  return (
    <div className="bg-white border border-[#6366f1]/40 rounded-lg p-3 shadow-sm">
      <textarea
        autoFocus
        rows={2}
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title…"
        className="w-full text-sm bg-transparent outline-none text-[#334155] placeholder:text-[#94a3b8] resize-none"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
          if (e.key === 'Escape') { setTitle(''); onSaved(); }
        }}
        onBlur={save}
      />
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366f1] mt-1" />}
      {error && <p className="text-xs text-[#dc2626] mt-1">{error}</p>}
    </div>
  );
}

export default function BoardViewClient({ project, tasks }: { project: { id: string; name: string; color: string }; tasks: Task[] }) {
  const color = getProjectColor(project.color);
  const router = useRouter();
  const [addingTo, setAddingTo] = useState<Task['status'] | null>(null);

  function refresh() {
    router.refresh();
  }

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
            const isAdding = addingTo === col.id;
            return (
              <div key={col.id} className="flex flex-col w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                    <span className="text-xs font-semibold text-[#334155]">{col.label}</span>
                    <span className="text-xs text-[#94a3b8] bg-[#f1f5f9] rounded px-1.5 py-0.5">{colCards.length}</span>
                  </div>
                  <button
                    onClick={() => setAddingTo(col.id)}
                    className="text-[#94a3b8] hover:text-[#334155] p-0.5 rounded hover:bg-[#f1f5f9]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2">
                  {colCards.map(task => <TaskCard key={task.id} task={task} />)}
                  {isAdding && (
                    <AddTaskCard
                      projectId={project.id}
                      status={col.id}
                      taskCount={colCards.length}
                      onSaved={() => { setAddingTo(null); refresh(); }}
                    />
                  )}
                  {colCards.length === 0 && !isAdding && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#94a3b8] min-h-20">
                      No tasks
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setAddingTo(col.id)}
                  className="mt-2 flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] px-1 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors"
                >
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
