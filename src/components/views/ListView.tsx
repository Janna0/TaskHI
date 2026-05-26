import { useState, useRef, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, ChevronDown, ChevronRight, GripVertical, MoreHorizontal, Trash2, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { PriorityBadge } from '../ui/Badge'
import { formatDate, isOverdue, cn, getInitials } from '../../lib/utils'
import { CreateTaskModal } from '../tasks/CreateTaskModal'

interface Props {
  sections: Section[]
  tasks: Task[]
  projectId: string
  memberMap: Record<string, { name: string; color: string }>
  onTaskClick: (task: Task) => void
  onRefresh: () => void
}

// ── Inline add-task row ──────────────────────────────────────────────────

function AddTaskInlineRow({ projectId, sectionId, position, isActive, onActivate, onDone }: {
  projectId: string
  sectionId: string
  position: number
  isActive: boolean
  onActivate: () => void
  onDone: () => void
}) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const committedRef = useRef(false)

  useEffect(() => {
    if (isActive) {
      setTitle('')
      committedRef.current = false
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isActive])

  async function commit() {
    if (committedRef.current) return
    committedRef.current = true
    const trimmed = title.trim()
    if (trimmed) {
      setSaving(true)
      await supabase.from('tasks').insert({
        project_id: projectId,
        section_id: sectionId,
        title: trimmed,
        status: 'todo',
        priority: 'medium',
        position,
        depth: 0,
      })
      setSaving(false)
    }
    onDone()
  }

  function cancel() {
    committedRef.current = true
    setTitle('')
    onDone()
  }

  if (!isActive) {
    return (
      <button
        onClick={onActivate}
        className="flex w-full items-center gap-2 pl-14 pr-4 py-1.5 text-xs text-slate-400 hover:text-primary-600 hover:bg-slate-50 transition-colors"
      >
        <Plus size={12} className="shrink-0" />
        Add task
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
      <div className="w-3.5 shrink-0" />
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') cancel()
        }}
        onBlur={commit}
        placeholder="Task name…"
        className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400"
      />
      {saving
        ? <span className="text-xs text-slate-400 shrink-0">Saving…</span>
        : <span className="text-[10px] text-slate-300 shrink-0">Enter to save · Esc to cancel</span>
      }
    </div>
  )
}

// ── Sortable task row ────────────────────────────────────────────────────────

function TaskRow({
  task,
  memberMap,
  onClick,
}: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  onClick: () => void
}) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 group',
        isDragging && 'opacity-30'
      )}
    >
      <div
        {...listeners}
        {...attributes}
        onClick={e => e.stopPropagation()}
        className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-400 transition-opacity touch-none select-none shrink-0"
      >
        <GripVertical size={14} />
      </div>

      <span className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {task.title}
      </span>
      <div className="w-24 flex justify-center">
        <PriorityBadge priority={task.priority} />
      </div>
      <div className={cn('w-24 text-xs text-center', overdue ? 'text-red-500 font-medium' : 'text-slate-400')}>
        {task.due_date ? formatDate(task.due_date) : '—'}
      </div>
      <div className="w-10 flex justify-center">
        <div className="flex -space-x-1.5">
          {assignees.slice(0, 2).map((a, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 border border-white"
              style={{ background: a.color }}
              title={a.name}
            >
              {getInitials(a.name)}
            </div>
          ))}
          {assignees.length > 2 && (
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border border-white">
              +{assignees.length - 2}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Ghost shown in DragOverlay ──────────────────────────────────────────────────────────────

function TaskGhost({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border border-primary-200 rounded-lg shadow-lg opacity-95">
      <GripVertical size={14} className="text-slate-300 shrink-0" />
      <span className="flex-1 text-sm text-slate-700 truncate">{task.title}</span>
    </div>
  )
}

// ── Section action menu ───────────────────────────────────────────────────────────────────

function SectionMenu({ onRename, onDelete, onClose }: {
  onRename: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-44 z-50"
    >
      <button
        onMouseDown={e => { e.stopPropagation(); onRename() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <Pencil size={13} className="text-slate-400 shrink-0" />
        Rename section
      </button>
      <div className="border-t border-slate-100 my-1" />
      <button
        onMouseDown={e => { e.stopPropagation(); onDelete() }}
        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} className="shrink-0" />
        Delete section
      </button>
    </div>
  )
}

// ── Section drop zone (makes empty sections droppable) ────────────────────────────────────

function SectionDropZone({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={cn('min-h-[32px] transition-colors', isOver && 'bg-primary-50/40')}>
      {children}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────────────

export function ListView({ sections, tasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [inlineAdding, setInlineAdding] = useState<string | null>(null)
  const [createSection, setCreateSection] = useState<string | null>(null)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [sectionError, setSectionError] = useState('')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [hoveredSection, setHoveredSection] = useState<string | null>(null)
  const [openMenuSection, setOpenMenuSection] = useState<string | null>(null)
  const [renamingSection, setRenamingSection] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)
  const sectionInputRef = useRef<HTMLInputElement>(null)

  // localOrder: sectionId → taskId[]; '' key for ungrouped tasks
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({})
  const localOrderRef = useRef<Record<string, string[]>>({})
  const isDraggingRef = useRef(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  useEffect(() => {
    if (renamingSection) requestAnimationFrame(() => renameInputRef.current?.focus())
  }, [renamingSection])

  // Sync tasks prop → localOrder whenever tasks/sections change (skip during active drag)
  useEffect(() => {
    if (isDraggingRef.current) return
    const order: Record<string, string[]> = { '': [] }
    for (const s of sections) {
      order[s.id] = tasks
        .filter(t => t.section_id === s.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(t => t.id)
    }
    order[''] = tasks.filter(t => !t.section_id).map(t => t.id)
    setLocalOrder(order)
    localOrderRef.current = order
  }, [tasks, sections])

  // Find which section (by key in localOrder) contains the given task ID
  function findSection(taskId: string): string {
    for (const [sid, ids] of Object.entries(localOrderRef.current)) {
      if (ids.includes(taskId)) return sid
    }
    return ''
  }

  function toggle(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleAddDone(sectionId: string) {
    setInlineAdding(prev => prev === sectionId ? null : prev)
    onRefresh()
  }

  async function handleDeleteSection(sectionId: string, taskCount: number) {
    setOpenMenuSection(null)
    const msg = taskCount > 0
      ? `Delete this section? The ${taskCount} task${taskCount > 1 ? 's' : ''} inside will be moved to "No section".`
      : 'Delete this section?'
    if (!confirm(msg)) return
    await supabase.from('tasks').update({ section_id: null }).eq('section_id', sectionId)
    await supabase.from('sections').delete().eq('id', sectionId)
    onRefresh()
  }

  async function handleRenameSection() {
    if (!renamingSection || !renameValue.trim()) { setRenamingSection(null); return }
    await supabase.from('sections').update({ name: renameValue.trim() }).eq('id', renamingSection)
    setRenamingSection(null)
    onRefresh()
  }

  async function handleCreateSection() {
    if (!newSectionName.trim()) return
    const { error } = await supabase.from('sections').insert({
      project_id: projectId,
      name: newSectionName.trim(),
      position: sections.length,
    })
    if (error) { setSectionError(error.message); return }
    setNewSectionName('')
    setAddingSection(false)
    setSectionError('')
    onRefresh()
  }

  function handleDragStart(event: DragStartEvent) {
    isDraggingRef.current = true
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = active.id as string
    const overId = over.id as string
    const activeSid = findSection(activeId)

    // Determine target section: overId is either a task ID or a section key
    let targetSid: string
    if (overId in localOrderRef.current) {
      // It's a section key directly (from useDroppable on the section container)
      targetSid = overId
    } else {
      targetSid = findSection(overId)
    }

    const cur = localOrderRef.current

    if (activeSid === targetSid) {
      // Within-section reorder
      const ids = cur[activeSid] ?? []
      const from = ids.indexOf(activeId)
      const to = ids.indexOf(overId)
      if (from !== -1 && to !== -1 && from !== to) {
        const newIds = arrayMove(ids, from, to)
        const newOrder = { ...cur, [activeSid]: newIds }
        localOrderRef.current = newOrder
        setLocalOrder(newOrder)
      }
    } else {
      // Cross-section move
      const newOrder = { ...cur }
      newOrder[activeSid] = (newOrder[activeSid] ?? []).filter(id => id !== activeId)
      const targetIds = [...(newOrder[targetSid] ?? [])]
      const overIdx = targetIds.indexOf(overId)
      targetIds.splice(overIdx === -1 ? targetIds.length : overIdx, 0, activeId)
      newOrder[targetSec] = targetIds
      localOrderRef.current = newOrder
      setLocalOrder(newOrder)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    isDraggingRef.current = false
    setActiveTask(null)

    const { active } = event
    const taskId = active.id as string
    const originalTask = tasks.find(t => t.id === taskId)
    if (!originalTask) return

    const finalSid = findSection(taskId)
    const finalSectionIds = localOrderRef.current[finalSid] ?? []
    const newSectionId = finalSid || null

    // Persist updated positions (and section if changed) for all tasks in the final section
    await Promise.all(
      finalSectionIds.map((id, idx) => {
        const update: Record<string, unknown> = { position: idx }
        if (id === taskId && newSectionId !== originalTask.section_id) {
          update.section_id = newSectionId
        }
        return supabase.from('tasks').update(update).eq('id', id)
      })
    )
  }

  const ungroupedIds = localOrder[''] ?? []

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {/* Column headers */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <span className="w-3.5 shrink-0" />
          <span className="flex-1">Task</span>
          <span className="w-24 text-center">Priority</span>
          <span className="w-24 text-center">Due date</span>
          <span className="w-8" />
        </div>

        {sections.map(section => {
          const sectionTaskIds = localOrder[section.id] ?? []
          const sectionTasks = sectionTaskIds
            .map(id => tasks.find(t => t.id === id))
            .filter((t): t is Task => !!t)
          const isCollapsed = collapsed[section.id]
          const isHovered = hoveredSection === section.id
          const menuOpen = openMenuSection === section.id
          const isRenaming = renamingSection === section.id

          return (
            <div key={section.id}>
              <div
                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50"
                onClick={() => !isRenaming && toggle(section.id)}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                {isCollapsed
                  ? <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  : <ChevronDown size={14} className="text-slate-400 shrink-0" />}

                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); handleRenameSection() }
                      if (e.key === 'Escape') setRenamingSection(null)
                    }}
                    onBlur={handleRenameSection}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-sm font-semibold text-slate-700 bg-transparent border-b border-primary-400 outline-none py-0 min-w-0"
                  />
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-600">{section.name}</span>
                    <span className="text-xs text-slate-400">({sectionTasks.length})</span>
                    {(isHovered || menuOpen) && (
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuSection(menuOpen ? null : section.id)}
                          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="More section actions"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                        {menuOpen && (
                          <SectionMenu
                            onRename={() => {
                              setOpenMenuSection(null)
                              setRenameValue(section.name)
                              setRenamingSection(section.id)
                            }}
                            onDelete={() => handleDeleteSection(section.id, sectionTasks.length)}
                            onClose={() => setOpenMenuSection(null)}
                          />
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {!isCollapsed && (
                <>
                  <SectionDropZone id={section.id}>
                    <SortableContext items={sectionTaskIds} strategy={verticalListSortingStrategy}>
                      {sectionTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          memberMap={memberMap}
                          onClick={() => onTaskClick(task)}
                        />
                      ))}
                    </SortableContext>
                  </SectionDropZone>
                  <AddTaskInlineRow
                    projectId={projectId}
                    sectionId={section.id}
                    position={sectionTaskIds.length}
                    isActive={inlineAdding === section.id}
                    onActivate={() => setInlineAdding(section.id)}
                    onDone={() => handleAddDone(section.id)}
                  />
                </>
              )}
            </div>
          )
        })}

        {/* Ungrouped tasks */}
        {ungroupedIds.length > 0 && (
          <div>
            {sections.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-sm font-semibold text-slate-500">No section</span>
              </div>
            )}
            <SortableContext items={ungroupedIds} strategy={verticalListSortingStrategy}>
              {ungroupedIds.map(id => {
                const task = tasks.find(t => t.id === id)
                if (!task) return null
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    memberMap={memberMap}
                    onClick={() => onTaskClick(task)}
                  />
                )
              })}
            </SortableContext>
          </div>
        )}

        {/* Add section */}
        <div className="px-4 py-2 border-t border-slate-100 mt-1">
          {addingSection ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  ref={sectionInputRef}
                  autoFocus
                  value={newSectionName}
                  onChange={e => { setNewSectionName(e.target.value); setSectionError('') }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreateSection()
                    if (e.key === 'Escape') { setNewSectionName(''); setAddingSection(false); setSectionError('') }
                  }}
                  placeholder="Section name…"
                  className="flex-1 text-sm font-semibold text-slate-700 border-b border-slate-300 focus:border-primary-400 outline-none py-0.5 bg-transparent"
                />
                <button onClick={handleCreateSection} className="text-xs text-primary-600 font-medium hover:text-primary-700 shrink-0">Add</button>
                <button onClick={() => { setNewSectionName(''); setAddingSection(false); setSectionError('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 shrink-0">Cancel</button>
              </div>
              {sectionError && <p className="text-xs text-red-500">{sectionError}</p>}
            </div>
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus size={14} /> Add section
            </button>
          )}
        </div>

        {createSection !== null && (
          <CreateTaskModal
            open={true}
            onClose={() => setCreateSection(null)}
            onCreated={() => { setCreateSection(null); onRefresh() }}
            projectId={projectId}
            sections={sections}
            defaultSectionId={createSection}
          />
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskGhost task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
