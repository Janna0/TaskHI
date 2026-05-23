'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, Star, Archive, Grid, List, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProjectColor, formatDate } from '@/lib/utils';

const MOCK_PROJECTS = [
  { id: '1', name: 'Website Redesign', color: 'indigo', description: 'Full redesign of the marketing website', taskCount: 24, completedTaskCount: 16, deadline: '2026-06-15', isFavorite: true, members: ['Alex R.', 'Maya C.', 'James P.'] },
  { id: '2', name: 'Q3 Marketing Campaign', color: 'orange', description: 'Email and social media push for Q3', taskCount: 18, completedTaskCount: 11, deadline: '2026-06-30', isFavorite: true, members: ['Maya C.', 'James P.'] },
  { id: '3', name: 'Mobile App MVP', color: 'violet', description: 'iOS and Android MVP release', taskCount: 45, completedTaskCount: 20, deadline: '2026-07-31', isFavorite: false, members: ['Alex R.', 'Maya C.'] },
  { id: '4', name: 'Customer Support Portal', color: 'teal', description: 'Self-service portal for customers', taskCount: 12, completedTaskCount: 8, deadline: '2026-08-15', isFavorite: false, members: ['James P.'] },
  { id: '5', name: 'Data Analytics Dashboard', color: 'sky', description: 'Internal analytics and reporting', taskCount: 9, completedTaskCount: 3, deadline: '2026-09-01', isFavorite: false, members: ['Alex R.'] },
  { id: '6', name: 'Brand Guidelines Update', color: 'rose', description: 'Update brand guide for 2026', taskCount: 7, completedTaskCount: 7, deadline: '2026-04-30', isFavorite: false, members: ['Maya C.', 'James P.'] },
];

function ProjectGridCard({ project }: { project: typeof MOCK_PROJECTS[0] }) {
  const pct = Math.round((project.completedTaskCount / project.taskCount) * 100);
  const color = getProjectColor(project.color);
  const isOverdue = new Date(project.deadline) < new Date();

  return (
    <Link href={`/projects/${project.id}/list`} className="block bg-white border border-[#e2e8f0] rounded-xl p-4 hover:border-[#6366f1]/40 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="font-semibold text-sm text-[#1e293b] group-hover:text-[#6366f1] transition-colors">{project.name}</span>
        </div>
        <div className="flex items-center gap-1">
          {project.isFavorite && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />}
          <button className="p-0.5 rounded hover:bg-[#f1f5f9] text-[#94a3b8]" onClick={e => e.preventDefault()}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="mb-3">
        <div className="flex justify-between text-xs text-[#64748b] mb-1">
          <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1 bg-[#e2e8f0] rounded-full">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-[#dc2626]' : 'text-[#94a3b8]'}`}>
          <Clock className="h-3 w-3" />
          <span>{formatDate(project.deadline)}</span>
        </div>
        <div className="flex -space-x-1">
          {project.members.slice(0, 3).map((m, i) => (
            <span key={i} className="h-5 w-5 rounded-full bg-[#e2e8f0] border-2 border-white flex items-center justify-center text-[9px] font-medium text-[#475569]">
              {m[0]}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function ProjectListRow({ project }: { project: typeof MOCK_PROJECTS[0] }) {
  const pct = Math.round((project.completedTaskCount / project.taskCount) * 100);
  const color = getProjectColor(project.color);
  const isOverdue = new Date(project.deadline) < new Date();

  return (
    <Link href={`/projects/${project.id}/list`} className="flex items-center gap-4 px-4 py-3 hover:bg-[#f8fafc] transition-colors group">
      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm text-[#334155] group-hover:text-[#6366f1] transition-colors">{project.name}</span>
        {project.description && <span className="text-xs text-[#94a3b8] ml-2 hidden md:inline">{project.description}</span>}
      </div>
      <div className="flex items-center gap-2 w-24">
        <div className="flex-1 h-1 bg-[#e2e8f0] rounded-full">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
        <span className="text-xs text-[#94a3b8] w-8 text-right">{pct}%</span>
      </div>
      <span className={`text-xs hidden sm:block w-20 text-right ${isOverdue ? 'text-[#dc2626]' : 'text-[#94a3b8]'}`}>
        {formatDate(project.deadline)}
      </span>
      {project.isFavorite && <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
    </Link>
  );
}

export default function ProjectsPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'archived'>('all');

  const filtered = MOCK_PROJECTS.filter(p => {
    if (filter === 'favorites') return p.isFavorite;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#1e293b]">Projects</h1>
          <p className="text-sm text-[#64748b] mt-0.5">{MOCK_PROJECTS.length} projects</p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          New project
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {(['all', 'favorites', 'archived'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                filter === f ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#64748b] hover:bg-[#f1f5f9]'
              }`}
            >
              {f === 'archived' && <Archive className="h-3.5 w-3.5 inline mr-1.5" />}
              {f === 'favorites' && <Star className="h-3.5 w-3.5 inline mr-1.5 fill-current" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 border border-[#e2e8f0] rounded-md p-0.5">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#94a3b8] hover:text-[#334155]'}`}>
            <Grid className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#94a3b8] hover:text-[#334155]'}`}>
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Projects */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(p => <ProjectGridCard key={p.id} project={p} />)}
          {/* Add project card */}
          <button className="border-2 border-dashed border-[#e2e8f0] rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-[#94a3b8] hover:border-[#6366f1]/40 hover:text-[#6366f1] transition-colors min-h-32">
            <Plus className="h-5 w-5" />
            <span className="text-sm font-medium">New project</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-2 border-b border-[#e2e8f0] bg-[#f8fafc]">
            <span className="w-3" />
            <span className="flex-1 text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Name</span>
            <span className="w-32 text-xs font-medium text-[#94a3b8] uppercase tracking-wider hidden md:block">Progress</span>
            <span className="w-20 text-xs font-medium text-[#94a3b8] uppercase tracking-wider text-right hidden sm:block">Deadline</span>
            <span className="w-5" />
          </div>
          <div className="divide-y divide-[#f1f5f9]">
            {filtered.map(p => <ProjectListRow key={p.id} project={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}
