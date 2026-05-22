import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Section } from '../../types'
import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onCreated: () => void
  projectId: string
  sections: Section[]
  defaultSectionId?: string | null
}

export function CreateTaskModal({ open, onClose, onCreated, projectId, sections, defaultSectionId }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [sectionId, setSectionId] = useState(defaultSectionId ?? sections[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!title.trim()) { setError('Task title is required'); return }
    setLoading(true)
    const { error: err } = await supabase.from('tasks').insert({
      title: title.trim(),
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      project_id: projectId,
      created_by: user!.id,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setTitle(''); setStatus('todo'); setPriority('medium'); setDueDate(''); setError('')
    onCreated()
    onClose()
  }

  const selectClass = 'h-8 px-2 text-sm rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <Modal open={open} onClose={onClose} title="New Task">
      <div className="space-y-3">
        <Input placeholder="Task title" value={title}
          onChange={e => { setTitle(e.target.value); setError('') }} error={error} autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select className={selectClass} value={status} onChange={e => setStatus(e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Priority</label>
            <select className={selectClass} value={priority} onChange={e => setPriority(e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate-600">Due date</label>
            <input type="date" className={selectClass} value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          {sections.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">Section</label>
              <select className={selectClass} value={sectionId} onChange={e => setSectionId(e.target.value)}>
                <option value="">No section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} loading={loading}>Add Task</Button>
        </div>
      </div>
    </Modal>
  )
}
