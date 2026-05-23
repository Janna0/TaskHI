'use client';
import { use } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, AlertTriangle, Users, TrendingUp } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { TaskStatus } from '@/types/task';

const MOCK_STATS = { total: 24, done: 16, inProgress: 4, overdue: 2 };
const MOCK_MEMBERS = [
  { userId: '1', name: 'Maya Chen', role: 'owner' as const, taskCount: 8 },
  { userId: '2', name: 'Alex Rivera', role: 'member' as const, taskCount: 10 },
  { userId: '3', name: 'James Park', role: 'member' as const, taskCount: 6 },
];
const MOCK_UPCOMING = [
  { id: 't1', title: 'Landing page mockup', status: 'in_progress' as TaskStatus, dueDate: '2026-05-28' },
  { id: 't2', title: 'Homepage copy', status: 'in_progress' as TaskStatus, dueDate: '2026-05-25' },
  { id: 't3', title: 'Build navigation component', status: 'review' as TaskStatus, dueDate: '2026-05-27' },
];

export default function OverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const pct = Math.round((MOCK_STATS.done / MOCK_STATS.total) * 100);

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
                label === 'Overview'
                  ? 'bg-[#6366f1]/10 text-[#6366f1]'
                  : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >{label}</Link>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Health card */}
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
                  { label: 'Total tasks', value: MOCK_STATS.total, icon: CheckCircle2, color: 'text-[#64748b]' },
                  { label: 'Completed', value: MOCK_STATS.done, icon: CheckCircle2, color: 'text-[#22c55e]' },
                  { label: 'In progress', value: MOCK_STATS.inProgress, icon: Clock, color: 'text-[#3b82f6]' },
                  { label: 'Overdue', value: MOCK_STATS.overdue, icon: AlertTriangle, color: 'text-[#dc2626]' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${color}`} />
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
                <div className="h-full bg-[#6366f1] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#6366f1]" /> Members ({MOCK_MEMBERS.length})
            </h2>
            <div className="space-y-3">
              {MOCK_MEMBERS.map(m => (
                <div key={m.userId} className="flex items-center gap-3">
                  <Avatar name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#334155]">{m.name}</p>
                    <p className="text-xs text-[#94a3b8] capitalize">{m.role} · {m.taskCount} tasks</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming deadlines */}
          <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#6366f1]" /> Upcoming tasks
            </h2>
            <div className="space-y-2">
              {MOCK_UPCOMING.map(task => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-[#f1f5f9] last:border-0">
                  <StatusBadge status={task.status} />
                  <span className="flex-1 text-sm text-[#334155]">{task.title}</span>
                  <span className="text-xs text-[#94a3b8]">{formatDate(task.dueDate)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#1e293b] mb-3">About</h2>
            <p className="text-sm text-[#64748b] leading-relaxed">
              Full redesign of the marketing website with a focus on conversion and brand clarity.
              Targeting a June 2026 launch date.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <Clock className="h-3.5 w-3.5" />
              <span>Due Jun 15, 2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
