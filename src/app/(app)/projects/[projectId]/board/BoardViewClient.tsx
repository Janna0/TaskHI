'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, useDroppable, pointerWithin,
  type DragEndEvent, type DragStartEvent, type DragOverEvent, type DragCancelEvent,
} from '@dnd-kit/core';
import {
  SortableContext, useSortable, arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreHorizontal, Loader2, GripVertical } from 'lucide-react';
import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { formatDate, getProjectColor } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Section, Task } from '@/lib/supabase/types';

const COL_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];

// ─── Task card (sortable) ─────────────────────────────────────────────────────

function TaskCard({ task }: { task: Task }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: 'task' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className="bg-white border border-[#e2e8f0] rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-start gap-2 mb-2">
        <div
          {...listeners}
          {...attributes}
          className="flex-shrink-0 mt-0.5 cursor-grab active:cursor-grabbing text-[#cbd5e1] hover:text-[#94a3b8] opacity-0 group-hover:opacity-100 transition-opacity touch-none select-none"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <p className="text-sm text-[#334155] leading-snug flex-1">{task.title}</p>
      </div>
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

function TaskCardGhost({ task }: { task: Task }) {
  return (
    <div className="bg-white border border-[#6366f1]/30 rounded-lg p-3 shadow-lg opacity-90">
      <p className="text-sm text-[#334155] leading-snug">{task.title}</p>
    </div>
  );
}

// ─── Add task card ────────────────────────────────────────────────────────────

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
    if (err) { calledRef.current = false; setError(`Failed: ${err.message}`); return; }
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

// ─── Add column input ─────────────────────────────────────────────────────────

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
    if (err) { calledRef.current = false; setError(`Failed: ${err.message}`); return; }
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

// ─── Column ───────────────────────────────────────────────────────────────────

function Column({ section, orderedTasks, dot, addingHere, projectId, onAddTask, onTaskAdded }: {
  section: Section;
  orderedTasks: Task[];
  dot: string;
  addingHere: boolean;
  projectId: string;
  onAddTask: () => void;
  onTaskAdded: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: section.id });
  const taskIds = orderedTasks.map(t => t.id);

  return (
    <div className="flex-shrink-0 w-64 flex flex-col bg-[#f8fafc] border border-[#e2e8f0] rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#e2e8f0]">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
        <span className="text-xs font-semibold text-[#334155] flex-1 truncate">{section.name}</span>
        <span className="text-xs text-[#94a3b8] bg-white border border-[#e2e8f0] rounded px-1.5 py-0.5">{orderedTasks.length}</span>
        <button onClick={onAddTask} className="text-[#94a3b8] hover:text-[#6366f1] p-0.5 rounded hover:bg-[#e2e8f0] transition-colors">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button className="text-[#94a3b8] hover:text-[#334155] p-0.5 rounded hover:bg-[#e2e8f0] transition-colors">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 p-2 flex-1 min-h-[80px] transition-colors ${isOver && orderedTasks.length === 0 ? 'bg-[#eff6ff]' : ''}`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {orderedTasks.map(task => <TaskCard key={task.id} task={task} />)}
        </SortableContext>
        {addingHere && (
          <AddTaskCard
            projectId={projectId}
            sectionId={section.id}
            taskCount={orderedTasks.length}
            onSaved={onTaskAdded}
          />
        )}
        {orderedTasks.length === 0 && !addingHere && (
          <div className={`flex items-center justify-center border-2 border-dashed rounded-lg text-xs text-[#94a3b8] min-h-[60px] ${isOver ? 'border-[#6366f1]/40' : 'border-[#e2e8f0]'}`}>
            Drop tasks here
          </div>
        )}
      </div>

      <button
        onClick={onAddTask}
        className="flex items-center gap-1.5 text-xs text-[#94a3b8] hover:text-[#6366f1] px-3 py-2.5 border-t border-[#e2e8f0] hover:bg-[#f1f5f9] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTaskOrder(tasks: Task[], sections: Section[]): Record<string, string[]> {
  const order: Record<string, string[]> = {};
  for (const s of sections) {
    order[s.id] = tasks
      .filter(t => t.section_id === s.id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(t => t.id);
  }
  return order;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  project: { id: string; name: string; color: string };
  sections: Section[];
  tasks: Task[];
}

export default function BoardViewClient({ project, sections, tasks: initialTasks }: Props) {
  const color = getProjectColor(project.color);
  const router = useRouter();
  const [addingTaskTo, setAddingTaskTo] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const [taskOrder, setTaskOrder] = useState<Record<string, string[]>>(() =>
    buildTaskOrder(initialTasks, sections)
  );
  const taskOrderRef = useRef(taskOrder);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (isDraggingRef.current) return;
    const next = buildTaskOrder(initialTasks, sections);
    taskOrderRef.current = next;
    setTaskOrder(next);
  }, [initialTasks, sections]);

  const taskById = Object.fromEntries(initialTasks.map(t => [t.id, t]));

  function findColumn(id: string): string | null {
    if (id in taskOrderRef.current) return id;
    for (const [sid, ids] of Object.entries(taskOrderRef.current)) {
      if (ids.includes(id)) return sid;
    }
    return null;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  function refresh() { router.refresh(); }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true;
    setActiveTask(initialTasks.find(t => t.id === event.active.id) ?? null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeSid = findColumn(activeId);
    const targetSid = findColumn(overId);

    if (!activeSid || !targetSid || activeSid === targetSid) return;

    // Cross-column move
    const cur = taskOrderRef.current;
    const sourceIds = cur[activeSid].filter(id => id !== activeId);
    const destIds = [...(cur[targetSid] ?? [])];
    const overIsTask = !(overId in cur);
    const insertAt = overIsTask ? destIds.indexOf(overId) : destIds.length;
    destIds.splice(insertAt === -1 ? destIds.length : insertAt, 0, activeId);

    const next = { ...cur, [activeSid]: sourceIds, [targetSid]: destIds };
    taskOrderRef.current = next;
    setTaskOrder(next);
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false;
    setActiveTask(null);

    const { active, over } = event;
    if (!over) { refresh(); return; }

    const taskId = active.id as string;
    const overId = over.id as string;
    const originalTask = initialTasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const finalSid = findColumn(taskId);
    if (!finalSid) { refresh(); return; }

    let finalIds = [...(taskOrderRef.current[finalSid] ?? [])];

    // Same-column sort (cross-column was handled in handleDragOver)
    const overSid = findColumn(overId);
    if (overSid === finalSid && !(overId in taskOrderRef.current)) {
      const from = finalIds.indexOf(taskId);
      const to = finalIds.indexOf(overId);
      if (from !== -1 && to !== -1 && from !== to) {
        finalIds = arrayMove(finalIds, from, to);
        const next = { ...taskOrderRef.current, [finalSid]: finalIds };
        taskOrderRef.current = next;
        setTaskOrder(next);
      }
    }

    const supabase = createClient();
    await Promise.all(
      finalIds.map((id, idx) => {
        const update: Record<string, unknown> = { position: idx };
        if (id === taskId && finalSid !== originalTask.section_id) {
          update.section_id = finalSid;
        }
        return supabase.from('tasks').update(update).eq('id', id);
      })
    );
    refresh();
  }

  function handleDragCancel(_event: DragCancelEvent) {
    isDraggingRef.current = false;
    setActiveTask(null);
    const reset = buildTaskOrder(initialTasks, sections);
    taskOrderRef.current = reset;
    setTaskOrder(reset);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
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
              const dot = COL_COLORS[idx % COL_COLORS.length];
              const orderedTasks = (taskOrder[section.id] ?? []).map(id => taskById[id]).filter(Boolean);
              return (
                <Column
                  key={section.id}
                  section={section}
                  orderedTasks={orderedTasks}
                  dot={dot}
                  addingHere={addingTaskTo === section.id}
                  projectId={project.id}
                  onAddTask={() => setAddingTaskTo(section.id)}
                  onTaskAdded={() => { setAddingTaskTo(null); refresh(); }}
                />
              );
            })}

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

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCardGhost task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
}
