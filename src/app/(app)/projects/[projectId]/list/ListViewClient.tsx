'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, useDraggable,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, ChevronDown, ChevronRight, Filter, SortDesc, MoreHorizontal, Loader2, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Section, Task } from '@/lib/supabase/types';

interface Props {
  project: { id: string; name: string; color: string };
  sections: Section[];
  tasks: Task[];
}

// ─── Task row ────────────────────────────────────────────────────────────────

function TaskRow({ task, dragging }: { task: Task; dragging?: boolean }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const isDone = task.status === 'done';
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-2 hover:bg-[#f8fafc] transition-colors border-b border-[#f1f5f9] group
        ${isDone ? 'opacity-60' : ''}
        ${dragging ? 'opacity-30' : ''}`}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isDone ? 'line-through text-[#94a3b8]' : 'text-[#334155]'}`}>
          {task.title}
        </span>
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

// Ghost shown in DragOverlay while dragging
function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-[#6366f1]/30 rounded-lg shadow-lg">
      <GripVertical className="h-3.5 w-3.5 text-[#94a3b8] flex-shrink-0" />
      <span className="flex-1 text-sm text-[#334155] truncate">{task.title}</span>
      <StatusBadge status={task.status} />
    </div>
  );
}

// ─── Add task inline input ───────────────────────────────────────────────────

function AddTaskRow({ projectId, sectionId, taskCount, onSaved }: {
  projectId: string;
  sectionId: string | null;
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
    if (err) { calledRef.current = false; setError(`Failed: ${err.message}`); return; }
    onSaved();
  }

  return (
    <div className="border-b border-[#f1f5f9]">
      <div className="flex items-center gap-3 px-4 py-2 bg-[#eff6ff]">
        <div className="w-3.5 flex-shrink-0" />
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title…"
          className="flex-1 text-sm bg-transparent outline-none text-[#334155] placeholder:text-[#94a3b8]"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') { setTitle(''); onSaved(); }
          }}
          onBlur={save}
        />
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6366f1]" />}
      </div>
      {error && <p className="text-xs text-[#dc2626] px-12 pb-2">{error}</p>}
    </div>
  );
}

// ─── Section block ───────────────────────────────────────────────────────────

function SectionBlock({ section, tasks, projectId, activeId, onTaskAdded, onDeleted }: {
  section: Section;
  tasks: Task[];
  projectId: string;
  activeId: string | null;
  onTaskAdded: () => void;
  onDeleted: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: section.id });

  async function deleteSection() {
    if (!confirm(`Delete section "${section.name}"? Tasks inside will become unsectioned.`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from('tasks').update({ section_id: null }).eq('section_id', section.id);
    await supabase.from('sections').delete().eq('id', section.id);
    onDeleted();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] group">
        <button onClick={() => setCollapsed(c => !c)} className="text-[#94a3b8] hover:text-[#334155]">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <span className="font-semibold text-sm text-[#334155]">{section.name}</span>
        <span className="text-xs text-[#94a3b8]">{tasks.length}</span>
        <div className="ml-auto flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-[#6366f1] hover:underline">
            <Plus className="h-3 w-3" /> Add task
          </button>
          <button
            onClick={deleteSection}
            disabled={deleting}
            className="p-0.5 rounded hover:bg-[#fee2e2] text-[#94a3b8] hover:text-[#dc2626] transition-colors disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      {!collapsed && (
        <div
          ref={setNodeRef}
          className={`min-h-[4px] transition-colors ${isOver ? 'bg-[#eff6ff]' : ''}`}
        >
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} dragging={task.id === activeId} />
          ))}
          {adding && (
            <AddTaskRow
              projectId={projectId}
              sectionId={section.id}
              taskCount={tasks.length}
              onSaved={() => { setAdding(false); onTaskAdded(); }}
            />
          )}
          {/* Always-visible add task footer */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[#f1f5f9]">
            <div className="w-3.5" />
            <button onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add task
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add section inline input ────────────────────────────────────────────────

function AddSectionRow({ projectId, sectionCount, onSaved, onCancel }: {
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
    if (err) { calledRef.current = false; setError(`Failed: ${err.message}`); return; }
    setName('');
    onSaved();
  }

  return (
    <div className="px-4 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Section name…"
          className="flex-1 text-sm font-semibold bg-white border border-[#e2e8f0] rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1] text-[#334155] placeholder:text-[#94a3b8]"
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') { setName(''); onCancel(); }
          }}
          onBlur={save}
        />
        {saving && <Loader2 className="h-4 w-4 animate-spin text-[#6366f1]" />}
      </div>
      {error && <p className="text-xs text-[#dc2626] mt-1.5">{error}</p>}
      <p className="text-xs text-[#94a3b8] mt-1">Enter to save · Esc to cancel</p>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ListViewClient({ project, sections: initialSections, tasks: initialTasks }: Props) {
  const color = getProjectColor(project.color);
  const router = useRouter();
  const [addingSection, setAddingSection] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  const activeTask = activeId ? initialTasks.find(t => t.id === activeId) ?? null : null;

  function refresh() { router.refresh(); }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newSectionId = over.id as string;
    const task = initialTasks.find(t => t.id === taskId);
    if (!task || task.section_id === newSectionId) return;

    const supabase = createClient();
    await supabase.from('tasks').update({ section_id: newSectionId }).eq('id', taskId);
    refresh();
  }

  const unsectioned = initialTasks.filter(t => !t.section_id);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        {/* Topbar */}
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
            <Button size="xs" className="gap-1" onClick={() => setAddingSection(true)}>
              <Plus className="h-3 w-3" /> Add section
            </Button>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 bg-[#f8fafc] border-b border-[#e2e8f0] text-xs font-medium text-[#94a3b8] flex-shrink-0">
          <div className="w-3.5" />
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
          {unsectioned.length > 0 && unsectioned.map(task => (
            <TaskRow key={task.id} task={task} dragging={task.id === activeId} />
          ))}

          {initialSections.map(section => (
            <SectionBlock
              key={section.id}
              section={section}
              tasks={initialTasks.filter(t => t.section_id === section.id)}
              projectId={project.id}
              activeId={activeId}
              onTaskAdded={refresh}
              onDeleted={refresh}
            />
          ))}

          {/* Add section */}
          {addingSection ? (
            <AddSectionRow
              projectId={project.id}
              sectionCount={initialSections.length}
              onSaved={() => { setAddingSection(false); refresh(); }}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <div className="px-4 py-3 border-t border-[#f1f5f9]">
              <button
                onClick={() => setAddingSection(true)}
                className="flex items-center gap-2 text-sm text-[#94a3b8] hover:text-[#6366f1] transition-colors"
              >
                <Plus className="h-4 w-4" /> Add section
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating ghost while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskGhost task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
