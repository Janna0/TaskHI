'use client';
import { use } from 'react';
import Link from 'next/link';
import { Plus, MoreHorizontal, MessageSquare, Paperclip } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import type { TaskStatus, TaskPriority } from '@/types/task';

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo',        label: 'To Do',       color: '#94a3b8' },
  { id: 'in_progress', label: 'In Progress',  color: '#3b82f6' },
  { id: 'review',      label: 'Review',       color: '#8b5cf6' },
  { id: 'blocked',     label: 'Blocked',      color: '#ef4444' },
  { id: 'done',        label: 'Done',         color: '#22c55e' },
];

const MOCK_CARDS: { id: string; title: string; status: TaskStatus; priority: TaskPriority; assignees: { name: string }[]; dueDate?: string; commentCount: number; attachmentCount: number }[] = [
  { id: 't1', title: 'Design system tokens', status: 'todo', priority: 'medium', assignees: [], dueDate: '2026-06-01', commentCount: 0, attachmentCount: 0 },
  { id: 't2', title: 'Integrate CMS', status: 'todo', priority: 'medium', assignees: [], dueDate: '2026-06-10', commentCount: 0, attachmentCount: 0 },
  { id: 't3', title: 'Blog post: Product launch', status: 'todo', priority: 'low', assignees: [], dueDate: '2026-06-05', commentCount: 0, attachmentCount: 0 },
  { id: 't4', title: 'Landing page mockup', status: 'in_progress', priority: 'high', assignees: [{ name: 'Maya Chen' }], dueDate: '2026-05-28', commentCount: 1, attachmentCount: 0 },
  { id: 't5', title: 'Homepage copy', status: 'in_progress', priority: 'high', assignees: [{ name: 'James Park' }], dueDate: '2026-05-25', commentCount: 0, attachmentCount: 0 },
  { id: 't6', title: 'Build navigation component', status: 'review', priority: 'high', assignees: [{ name: 'Alex Rivera' }], dueDate: '2026-05-27', commentCount: 4, attachmentCount: 0 },
  { id: 't7', title: 'Fix mobile nav bug', status: 'blocked', priority: 'urgent', assignees: [{ name: 'Alex Rivera' }], dueDate: '2026-05-23', commentCount: 1, attachmentCount: 0 },
  { id: 't8', title: 'Wireframes v2', status: 'done', priority: 'high', assignees: [{ name: 'Maya Chen' }], dueDate: '2026-05-20', commentCount: 3, attachmentCount: 2 },
  { id: 't9', title: 'Set up Next.js project', status: 'done', priority: 'urgent', assignees: [{ name: 'Alex Rivera' }], dueDate: '2026-05-15', commentCount: 2, attachmentCount: 0 },
];

function TaskCard({ card }: { card: typeof MOCK_CARDS[0] }) {
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date() && card.status !== 'done';
  const PRIORITY_BORDER: Record<TaskPriority, string> = {
    low: 'border-l-[#22c55e]', medium: 'border-l-[#f59e0b]',
    high: 'border-l-[#ef4444]', urgent: 'border-l-[#7c3aed]',
  };

  return (
    <div className={`bg-white border border-[#e2e8f0] border-l-2 ${PRIORITY_BORDER[card.priority]} rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm text-[#334155] leading-snug">{card.title}</p>
        <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#f1f5f9] text-[#94a3b8] flex-shrink-0 transition-all">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <PriorityBadge priority={card.priority} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
          {card.commentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-3 w-3" />{card.commentCount}
            </span>
          )}
          {card.attachmentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip className="h-3 w-3" />{card.attachmentCount}
            </span>
          )}
          {card.dueDate && (
            <span className={isOverdue ? 'text-[#dc2626] font-medium' : ''}>
              {formatDate(card.dueDate)}
            </span>
          )}
        </div>
        {card.assignees.length > 0 && (
          <Avatar name={card.assignees[0].name} size="xs" />
        )}
      </div>
    </div>
  );
}

export default function BoardViewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);

  return (
    <div className="flex flex-col h-full">
      {/* Project topbar */}
      <div className="border-b border-[#e2e8f0] bg-white px-4 py-2 flex items-center gap-2 flex-shrink-0">
        <div className="h-3 w-3 rounded-full bg-[#6366f1]" />
        <span className="font-semibold text-sm text-[#1e293b]">Website Redesign</span>
        <div className="flex items-center gap-1 ml-4">
          {[
            { label: 'Overview', href: `/projects/${projectId}/overview` },
            { label: 'List', href: `/projects/${projectId}/list` },
            { label: 'Board', href: `/projects/${projectId}/board` },
          ].map(({ label, href }) => (
            <Link key={label} href={href}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                label === 'Board'
                  ? 'bg-[#6366f1]/10 text-[#6366f1]'
                  : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >{label}</Link>
          ))}
        </div>
      </div>

      {/* Board columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full" style={{ minWidth: `${COLUMNS.length * 272 + (COLUMNS.length - 1) * 12}px` }}>
          {COLUMNS.map(col => {
            const colCards = MOCK_CARDS.filter(c => c.status === col.id);
            return (
              <div key={col.id} className="flex flex-col w-64 flex-shrink-0">
                {/* Column header */}
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

                {/* Cards */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pb-2">
                  {colCards.map(card => <TaskCard key={card.id} card={card} />)}
                  {colCards.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-[#e2e8f0] rounded-xl text-xs text-[#94a3b8] min-h-20">
                      No tasks
                    </div>
                  )}
                </div>

                {/* Quick add */}
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
