'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MoreHorizontal, Loader2 } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Section, Task } from '@/lib/supabase/types';

const COL_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

function TaskCard({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  return (
    <div className="bg-white border border-[#e2e8f0] rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group">
      <p className="text-sm text-[#334155] leading-snug mb-2">{task.title}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
      </div>
      {task.due_date && (
        <p className={`text-xs mt-2 ${isOverdue ? 'text-[#dc2626] font-medium' : 'text-[#94a3b8]'}`}>
          {formatDate(task.due_date)}
        </p>
      )}
    </div>
  );
}

function AddTaskCard({ projectId, sectionId, taskCount, onSaved }: {
  projectId: string;
  sectionId: string;
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
      section_id: sectionId,
      title: trimmed,
      status: 'todo',
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
    <div className="bg-white border border-[#6366f1]/40 rounded-lg p-3">
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

function AddColumnInput({ projectId, sectionCount, onSaved, onCancel }: {
  projectId: string;
  sectionCount: number;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const calledRef = useRef(false);

  async function save() {
    if (calledRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) { onCancel(); return; }
    calledRef.current = true;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('sections').insert({
      project_id: projectId,
      name: trimmed,
      position: sectionCount,
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
    <div className="flex-shrink-0 w-64">
      <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-xl p-3">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Column name…"
          className="w-full text-sm font-semibold bg-white border border-[#e2e8f0] rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] text-[#334155] placeholder:text-[#94a3b8]"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') { setName(''); onCancel(); }
          }}
          onBlur={save}
        />
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366f1] mt-2" />}
        {error && <p className="text-xs text-[#dc2626] mt-1">{error}</p>}
        <p className="text-xs text-[#94a3b8] mt-1.5">Enter to save · Esc to cancel</p>
      </div>
    </div>
  );
}

interface Props {
  project: { id: string; name: string; color: string };
  sections: Section[];
  tasks: Task[];
}

export default function BoardViewClient({ project, sections, tasks }: Props) {
  const color = getProjectColor(project.color);
  const router = useRouter();
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);

  function refresh() { router.refresh(); }

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
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

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full items-start">

          {sections.map((section, idx) => {
            const colTasks = tasks.filter(t => t.section_id === section.id);
            const dot = COL_COLORS[idx % COL_COLORS.length];
            const isAddingHere = addingTaskTo === section.id;
            return (
              <div key={section.id} className="flex-shrink-0 w-64 flex flex-col bg-[#f8fafc] border border-[#e2e8f0] rounded-xl overflow-hidden">
                {/* Column header */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e2e8f0]">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                  <span className="text-xs font-semibold text-[#334155] flex-1 truncate">{section.name}</span>
                  <span className="text-xs text-[#94a3b8] bg-white border border-[#e2e8f0] rounded px-1.5 py-0.5">{colTasks.length}</span>
                  <button
                    onClick={() => setAddingTaskTo(section.id)}
                    className="text-[#94a3b8] hover:text-[#6366f1] p-0.5 rounded hover:bg-[#e2e8f0] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button className="text-[#94a3b8] hover:text-[#334155] p-0.5 rounded hover:bg-[#e2e8f0] transition-colors">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2 p-2 min-h-[80px]">
                  {colTasks.map(task => <TaskCard key={task.id} task={task} />)}
                  {isAddingHere && (
                    <AddTaskCard
                      projectId={project.id}
                      sectionId={section.id}
                      taskCount={colTasks.length}
                      onSaved={() => { setAddingTaskTo(null); refresh(); }}
                    />
                  )}
                  {colTasks.length === 0 && !isAddingHere && (
                    <div className="flex items-center justify-center border-2 border-dashed border-[#e2e8f0] rounded-lg text-xs text-[#94a3b8] min-h-[60px]">
                      Drop tasks here
                    </div>
                  )}
                </div>

                {/* Add task footer */}
                <button
                  onClick={() => setAddingTaskTo(section.id)}
                  className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] px-3 py-2.5 border-t border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add task
                </button>
              </div>
            );
          })}

          {/* Add column */}
          {addingColumn ? (
            <AddColumnInput
              projectId={project.id}
              sectionCount={sections.length}
              onSaved={() => { setAddingColumn(false); refresh(); }}
              onCancel={() => setAddingColumn(false)}
            />
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="flex-shrink-0 flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#6366f1] px-3 py-2 rounded-lg hover:bg-[#f1f5f9] transition-colors"
            >
              <Plus className="h-4 w-4" /> Add column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
