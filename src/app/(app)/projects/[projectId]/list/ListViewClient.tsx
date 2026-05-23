'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, ChevronRight, Filter, SortDesc, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import type { Section, Task } from '@/lib/supabase/types';

interface Props {
  project: { id: string; name: string; color: string };
  sections: Section[];
  tasks: Task[];
}

function TaskRow({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDone = task.status === 'done';

  return (
    <div className={`flex items-center gap-3 px-4 py-2 hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9] group ${isDone ? 'opacity-60' : ''}`}>
      <div className="w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isDone ? 'line-through text-[#94a3b8]' : 'text-[#334155]'}`}>{task.title}</span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} className="hidden md:flex" />
        <span className={`text-xs w-16 text-right hidden sm:block ${isOverdue ? 'text-[#dc2626] font-medium' : 'text-[#94a3b8]'}`}>
          {task.due_date ? formatDate(task.due_date) : '—'}
        </span>
        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e2e8f0] text-[#94a3b8] transition-all">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SectionBlock({ section, tasks }: { section: Section; tasks: Task[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] group">
        <button onClick={() => setCollapsed(c => !c)} className="text-[#94a3b8] hover:text-[#334155]">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="font-semibold text-sm text-[#334155]">{section.name}</span>
        <span className="text-xs text-[#94a3b8]">{tasks.length}</span>
        <button onClick={() => setAdding(true)}
          className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#6366f1] hover:underline transition-all">
          <Plus className="h-3 w-3" /> Add task
        </button>
      </div>

      {!collapsed && (
        <>
          {tasks.map(task => <TaskRow key={task.id} task={task} />)}
          {adding && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#f1f5f9] bg-[#eff6ff]">
              <div className="w-5" />
              <input autoFocus placeholder="Task title…"
                className="flex-1 text-sm bg-transparent outline-none text-[#334155] placeholder:text-[#94a3b8]"
                onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setAdding(false); }}
                onBlur={() => setAdding(false)} />
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#f1f5f9]">
            <div className="w-5" />
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add task
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function UnsectionedTasks({ tasks, projectId }: { tasks: Task[]; projectId: string }) {
  const [adding, setAdding] = useState(false);
  if (tasks.length === 0 && !adding) return null;

  return (
    <div>
      {tasks.map(task => <TaskRow key={task.id} task={task} />)}
      {adding && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#f1f5f9] bg-[#eff6ff]">
          <div className="w-5" />
          <input autoFocus placeholder="Task title…"
            className="flex-1 text-sm bg-transparent outline-none text-[#334155] placeholder:text-[#94a3b8]"
            onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setAdding(false); }}
            onBlur={() => setAdding(false)} />
        </div>
      )}
    </div>
  );
}

export default function ListViewClient({ project, sections, tasks }: Props) {
  const color = getProjectColor(project.color);
  const unsectioned = tasks.filter(t => !t.section_id);

  return (
    <div className="flex flex-col h-full">
      {/* Project topbar */}
      <div className="border-b border-[#e2e8f0] bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-semibold text-sm text-[#1e293b]">{project.name}</span>
        <div className="flex items-center gap-1 ml-4">
          {(['Overview', 'List', 'Board'] as const).map(label => (
            <Link key={label}
              href={`/projects/${project.id}/${label.toLowerCase()}`}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                label === 'List' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}>{label}</Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#334155] px-2 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
          <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#334155] px-2 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <SortDesc className="h-3.5 w-3.5" /> Sort
          </button>
          <Button size="xs" className="gap-1"><Plus className="h-3 w-3" /> Add task</Button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-medium text-[#94a3b8] flex-shrink-0">
        <div className="w-5" />
        <span className="flex-1">Task</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="w-20">Status</span>
          <span className="w-16 hidden md:block">Priority</span>
          <span className="w-16 text-right hidden sm:block">Due</span>
          <span className="w-5" />
        </div>
      </div>

      {/* Sections + tasks */}
      <div className="flex-1 overflow-y-auto bg-white">
        <UnsectionedTasks tasks={unsectioned} projectId={project.id} />
        {sections.map(section => (
          <SectionBlock key={section.id} section={section}
            tasks={tasks.filter(t => t.section_id === section.id)} />
        ))}

        {tasks.length === 0 && sections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-[#94a3b8]">
            <p className="text-sm mb-3">No tasks yet.</p>
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add first task</Button>
          </div>
        )}

        <div className="px-4 py-4">
          <button className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#6366f1] transition-colors">
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>
      </div>
    </div>
  );
}
