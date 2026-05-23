'use client';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { TaskStatus, TaskPriority } from '@/types/task';

const SECTIONS = [
  {
    label: 'Overdue',
    color: 'text-[#dc2626]',
    tasks: [
      { id: 't1', title: 'Fix mobile nav bug', status: 'blocked' as TaskStatus, priority: 'urgent' as TaskPriority, dueDate: '2026-05-23', project: 'Website Redesign' },
      { id: 't2', title: 'Set up email campaign', status: 'todo' as TaskStatus, priority: 'urgent' as TaskPriority, dueDate: '2026-05-24', project: 'Q3 Marketing' },
    ],
  },
  {
    label: 'Today',
    color: 'text-[#334155]',
    tasks: [
      { id: 't3', title: 'Finalize landing page copy', status: 'in_progress' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-05-25', project: 'Website Redesign' },
    ],
  },
  {
    label: 'This week',
    color: 'text-[#334155]',
    tasks: [
      { id: 't4', title: 'Review design system tokens', status: 'todo' as TaskStatus, priority: 'medium' as TaskPriority, dueDate: '2026-05-27', project: 'Website Redesign' },
      { id: 't5', title: 'Build navigation component', status: 'review' as TaskStatus, priority: 'high' as TaskPriority, dueDate: '2026-05-27', project: 'Website Redesign' },
      { id: 't6', title: 'User research interviews', status: 'review' as TaskStatus, priority: 'medium' as TaskPriority, dueDate: '2026-05-28', project: 'Mobile App MVP' },
    ],
  },
  {
    label: 'Upcoming',
    color: 'text-[#64748b]',
    tasks: [
      { id: 't7', title: 'Blog post draft', status: 'todo' as TaskStatus, priority: 'low' as TaskPriority, dueDate: '2026-06-05', project: 'Q3 Marketing' },
      { id: 't8', title: 'Integrate CMS', status: 'todo' as TaskStatus, priority: 'medium' as TaskPriority, dueDate: '2026-06-10', project: 'Website Redesign' },
    ],
  },
];

export default function MyTasksPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1e293b]">My Tasks</h1>
        <p className="text-sm text-[#64748b] mt-0.5">All tasks assigned to you, across every project.</p>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => (
          <div key={section.label}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${section.color}`}>{section.label}</h2>
            <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
              {section.tasks.map((task, i) => (
                <div key={task.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f8fafc] transition-colors ${i < section.tasks.length - 1 ? 'border-b border-[#f1f5f9]' : ''}`}>
                  <StatusBadge status={task.status} />
                  <span className="flex-1 text-sm text-[#334155]">{task.title}</span>
                  <span className="text-xs text-[#94a3b8] hidden sm:block px-2 py-0.5 bg-[#f1f5f9] rounded">{task.project}</span>
                  <PriorityBadge priority={task.priority} className="hidden md:flex" />
                  <span className="text-xs text-[#94a3b8] w-14 text-right">{formatDate(task.dueDate)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
