'use client';
import { useState } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { Plus, ChevronDown, ChevronRight, Filter, SortDesc, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types/task';

const MOCK_PROJECT = { id: '1', name: 'Website Redesign', color: '#6366f1' };

const MOCK_SECTIONS = [
  {
    id: 's1', title: 'Design', collapsed: false,
    tasks: [
      { id: 't1', title: 'Wireframes v2', status: 'done' as TaskStatus, priority: 'high' as TaskPriority, assignees: [{ userId: '1', name: 'Maya Chen' }], dueDate: '2026-05-20', subtasks: [], checklists: [], attachmentCount: 2, commentCount: 3, position: 0, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't2', title: 'Landing page mockup', status: 'in_progress' as TaskStatus, priority: 'high' as TaskPriority, assignees: [{ userId: '1', name: 'Maya Chen' }], dueDate: '2026-05-28', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 1, position: 1, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't3', title: 'Design system tokens', status: 'todo' as TaskStatus, priority: 'medium' as TaskPriority, assignees: [], dueDate: '2026-06-01', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 0, position: 2, projectId: '1', createdAt: '', updatedAt: '' },
    ],
  },
  {
    id: 's2', title: 'Development', collapsed: false,
    tasks: [
      { id: 't4', title: 'Set up Next.js project', status: 'done' as TaskStatus, priority: 'urgent' as TaskPriority, assignees: [{ userId: '2', name: 'Alex Rivera' }], dueDate: '2026-05-15', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 2, position: 0, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't5', title: 'Build navigation component', status: 'review' as TaskStatus, priority: 'high' as TaskPriority, assignees: [{ userId: '2', name: 'Alex Rivera' }], dueDate: '2026-05-27', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 4, position: 1, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't6', title: 'Fix mobile nav bug', status: 'blocked' as TaskStatus, priority: 'urgent' as TaskPriority, assignees: [{ userId: '2', name: 'Alex Rivera' }], dueDate: '2026-05-23', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 1, position: 2, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't7', title: 'Integrate CMS', status: 'todo' as TaskStatus, priority: 'medium' as TaskPriority, assignees: [], dueDate: '2026-06-10', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 0, position: 3, projectId: '1', createdAt: '', updatedAt: '' },
    ],
  },
  {
    id: 's3', title: 'Content', collapsed: false,
    tasks: [
      { id: 't8', title: 'Homepage copy', status: 'in_progress' as TaskStatus, priority: 'high' as TaskPriority, assignees: [{ userId: '3', name: 'James Park' }], dueDate: '2026-05-25', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 0, position: 0, projectId: '1', createdAt: '', updatedAt: '' },
      { id: 't9', title: 'Blog post: Product launch', status: 'todo' as TaskStatus, priority: 'low' as TaskPriority, assignees: [], dueDate: '2026-06-05', subtasks: [], checklists: [], attachmentCount: 0, commentCount: 0, position: 1, projectId: '1', createdAt: '', updatedAt: '' },
    ],
  },
];

function TaskRow({ task }: { task: Task & { title: string } }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
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
        {task.assignees.length > 0 ? (
          <Avatar name={task.assignees[0].name} size="xs" className="hidden sm:flex" />
        ) : (
          <span className="h-5 w-5 rounded-full border border-dashed border-[#cbd5e1] hidden sm:flex" />
        )}
        <span className={`text-xs w-16 text-right hidden sm:block ${isOverdue ? 'text-[#dc2626] font-medium' : 'text-[#94a3b8]'}`}>
          {task.dueDate ? formatDate(task.dueDate) : '—'}
        </span>
        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e2e8f0] text-[#94a3b8] transition-all">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: typeof MOCK_SECTIONS[0] }) {
  const [collapsed, setCollapsed] = useState(section.collapsed);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] group">
        <button onClick={() => setCollapsed(c => !c)} className="text-[#94a3b8] hover:text-[#334155]">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="font-semibold text-sm text-[#334155]">{section.title}</span>
        <span className="text-xs text-[#94a3b8]">{section.tasks.length}</span>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#6366f1] hover:underline transition-all"
        >
          <Plus className="h-3 w-3" /> Add task
        </button>
      </div>

      {!collapsed && (
        <>
          {section.tasks.map(task => <TaskRow key={task.id} task={task as any} />)}
          {adding && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-[#f1f5f9] bg-[#eff6ff]">
              <div className="w-5" />
              <input
                autoFocus
                placeholder="Task title…"
                className="flex-1 text-sm bg-transparent outline-none text-[#334155] placeholder:text-[#94a3b8]"
                onKeyDown={e => { if (e.key === 'Escape' || e.key === 'Enter') setAdding(false); }}
                onBlur={() => setAdding(false)}
              />
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#f1f5f9]">
            <div className="w-5" />
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add task
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function ListViewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-col h-full">
      {/* Project topbar */}
      <div className="border-b border-[#e2e8f0] bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="h-3 w-3 rounded-full bg-[#6366f1]" />
        <span className="font-semibold text-sm text-[#1e293b]">{MOCK_PROJECT.name}</span>
        <div className="flex items-center gap-1 ml-4">
          {[
            { label: 'Overview', href: `/projects/${projectId}/overview` },
            { label: 'List', href: `/projects/${projectId}/list` },
            { label: 'Board', href: `/projects/${projectId}/board` },
          ].map(({ label, href }) => (
            <Link key={label} href={href}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                label === 'List'
                  ? 'bg-[#6366f1]/10 text-[#6366f1]'
                  : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >{label}</Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#334155] px-2 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <Filter className="h-3.5 w-3.5" /> Filter
          </button>
          <button className="flex items-center gap-1.5 text-xs text-[#64748b] hover:text-[#334155] px-2 py-1.5 rounded hover:bg-[#f1f5f9] transition-colors">
            <SortDesc className="h-3.5 w-3.5" /> Sort
          </button>
          <Button size="xs" className="gap-1">
            <Plus className="h-3 w-3" /> Add task
          </Button>
        </div>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-medium text-[#94a3b8] flex-shrink-0">
        <div className="w-5" />
        <span className="flex-1">Task</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="w-20">Status</span>
          <span className="w-16 hidden md:block">Priority</span>
          <span className="w-5 hidden sm:block">Who</span>
          <span className="w-16 text-right hidden sm:block">Due</span>
          <span className="w-5" />
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto bg-white">
        {MOCK_SECTIONS.map(section => (
          <SectionBlock key={section.id} section={section} />
        ))}

        {/* Add section */}
        <div className="px-4 py-4">
          <button className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#6366f1] transition-colors">
            <Plus className="h-4 w-4" /> Add section
          </button>
        </div>
      </div>
    </div>
  );
}
