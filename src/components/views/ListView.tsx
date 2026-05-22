import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Task, Section } from '../../types'
import { StatusBadge, PriorityBadge } from '../ui/Badge'
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

export function ListView({ sections, tasks, projectId, memberMap, onTaskClick, onRefresh }: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [createSection, setCreateSection] = useState<string | null>(null)

  function toggle(id: string) {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const ungrouped = tasks.filter(t => !t.section_id)
  const allSections = sections.length > 0 ? sections : []

  return (
    <div className="space-y-1">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
        <span className="flex-1">Task</span>
        <span className="w-28 text-center">Status</span>
        <span className="w-24 text-center">Priority</span>
        <span className="w-24 text-center">Due date</span>
        <span className="w-8" />
      </div>

      {allSections.map(section => {
        const sectionTasks = tasks.filter(t => t.section_id === section.id)
        const isCollapsed = collapsed[section.id]
        return (
          <div key={section.id}>
            {/* Section header */}
            <div
              className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-slate-50 group"
              onClick={() => toggle(section.id)}
            >
              {isCollapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              <span className="text-sm font-semibold text-slate-600">{section.name}</span>
              <span className="text-xs text-slate-400">({sectionTasks.length})</span>
              <button
                className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-400"
                onClick={e => { e.stopPropagation(); setCreateSection(section.id) }}
              >
                <Plus size={14} />
              </button>
            </div>

            {!isCollapsed && (
              <>
                {sectionTasks.map(task => (
                  <TaskRow key={task.id} task={task} memberMap={memberMap} onClick={() => onTaskClick(task)} />
                ))}
                {sectionTasks.length === 0 && (
                  <div className="px-10 py-2 text-xs text-slate-400">No tasks</div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* Ungrouped */}
      {ungrouped.length > 0 && (
        <div>
          {sections.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm font-semibold text-slate-500">No section</span>
            </div>
          )}
          {ungrouped.map(task => (
            <TaskRow key={task.id} task={task} memberMap={memberMap} onClick={() => onTaskClick(task)} />
          ))}
        </div>
      )}

      {/* Add task at bottom */}
      <div className="px-4 py-2">
        <button
          onClick={() => setCreateSection(sections[0]?.id ?? null)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-primary-600 transition-colors"
        >
          <Plus size={14} /> Add task
        </button>
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
  )
}

function TaskRow({ task, memberMap, onClick }: { task: Task; memberMap: Record<string, { name: string; color: string }>; onClick: () => void }) {
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const assignees = (task.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 group"
    >
      <span className={cn('flex-1 text-sm truncate', task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {task.title}
      </span>
      <div className="w-28 flex justify-center">
        <StatusBadge status={task.status} />
      </div>
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
