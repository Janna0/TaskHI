import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Task, Section } from '../../types'
import { Button } from '../ui/Button'
import { StatusBadge, PriorityBadge } from '../ui/Badge'
import { STATUS_LABELS, PRIORITY_LABELS, formatDate, isOverdue } from '../../lib/utils'

interface Props {
  task: Task
  sections: Section[]
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

export function TaskDetailPanel({ task, sections, onClose, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<string>(task.status)
  const [priority, setPriority] = useState<string>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [sectionId, setSectionId] = useState(task.section_id ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSectionId(task.section_id ?? '')
    setNotes(task.notes ?? '')
    setDirty(false)
  }, [task.id])

  async function handleSave() {
    setSaving(true)
    await supabase.from('tasks').update({
      title: title.trim() || task.title,
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      notes: notes || null,
    }).eq('id', task.id)
    setSaving(false)
    setDirty(false)
    onUpdated()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    onDeleted()
  }

  const selectClass = 'h-8 px-2 text-sm rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full'

  return (
    <div className="w-80 shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Task details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Title</label>
          <input
            className="w-full text-sm font-medium text-slate-800 border border-transparent rounded-md px-2 py-1.5 hover:border-slate-200 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
          />
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
          <select className={selectClass} value={status} onChange={e => { setStatus(e.target.value); setDirty(true) }}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Priority</label>
          <select className={selectClass} value={priority} onChange={e => { setPriority(e.target.value); setDirty(true) }}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Due date</label>
          <input type="date" className={selectClass} value={dueDate} onChange={e => { setDueDate(e.target.value); setDirty(true) }} />
          {dueDate && isOverdue(dueDate) && status !== 'done' && (
            <p className="text-xs text-red-500 mt-0.5">Overdue</p>
          )}
        </div>

        {/* Section */}
        {sections.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Section</label>
            <select className={selectClass} value={sectionId} onChange={e => { setSectionId(e.target.value); setDirty(true) }}>
              <option value="">No section</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Notes</label>
          <textarea
            className="w-full text-sm text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-300 resize-none"
            rows={4}
            placeholder="Add notes..."
            value={notes}
            onChange={e => { setNotes(e.target.value); setDirty(true) }}
          />
        </div>

        {/* Meta */}
        <div className="text-xs text-slate-400 space-y-1 pt-1">
          <div>Created: {formatDate(task.created_at)}</div>
          <div className="flex gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Delete task"
        >
          <Trash2 size={15} />
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" onClick={handleSave} loading={saving} disabled={!dirty}>Save</Button>
        </div>
      </div>
    </div>
  )
}
