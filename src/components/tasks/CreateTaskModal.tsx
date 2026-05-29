import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Section } from '../../types'
import { STATUS_LABELS, PRIORITY_LABELS } from '../../lib/utils'
import { PredefinedTasksSection, TemplateData } from './PredefinedTasksSection'

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
  const [tab, setTab] = useState<'new' | 'template'>('new')
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState('todo')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [sectionId, setSectionId] = useState(defaultSectionId ?? sections[0]?.id ?? '')
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleSelectTemplate(t: TemplateData) {
    setTemplate(t)
    setTitle(t.title)
    setError('')
    setTab('new')
  }

  function reset() {
    setTab('new')
    setTitle('')
    setStatus('todo')
    setPriority('medium')
    setDueDate('')
    setTemplate(null)
    setError('')
  }

  async function handleSubmit() {
    if (!title.trim()) { setError('Task title is required'); return }
    setLoading(true)

    const insertData: Record<string, unknown> = {
      title: title.trim(),
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      project_id: projectId,
      created_by: user!.id,
    }

    if (template) {
      insertData.notes = template.description || null
      insertData.competency = template.competency || null
      insertData.time_required = template.time_required || null
      insertData.phase = template.phase || null
      insertData.how_to_attachments = template.how_to_attachments?.length ? template.how_to_attachments : null
      insertData.predefined_task_id = template.id
    }

    const { error: err } = await supabase.from('tasks').insert(insertData)
    setLoading(false)
    if (err) {
      const isColErr = err.message.includes('competency') || err.message.includes('time_required') || err.message.includes('phase') || err.message.includes('notes') || err.message.includes('how_to_attachments')
      setError(isColErr
        ? 'Template fields require DB columns. Add competency, time_required, phase (text, nullable) to the tasks table in Supabase, then try again.'
        : err.message
      )
      return
    }

    reset()
    onCreated()
    onClose()
  }

  const selectClass = 'h-8 px-2 text-sm rounded-md border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500'

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="New Task">
      {/* Tabs */}
      <div className="flex mb-4 border-b border-slate-200 -mt-1">
        <button
          onClick={() => setTab('new')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'new' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          New Task
        </button>
        <button
          onClick={() => setTab('template')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'template' ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          From Template
        </button>
      </div>

      {tab === 'template' ? (
        <div>
          <p className="text-xs text-slate-500 mb-3">Click a predefined task to pre-fill the form.</p>
          <PredefinedTasksSection mode="selector" onSelect={handleSelectTemplate} />
        </div>
      ) : (
        <div className="space-y-3">
          {template && (
            <div className="flex items-center gap-2 text-xs bg-primary-50 text-primary-700 px-3 py-1.5 rounded-lg">
              <span>Template: <strong>{template.title}</strong></span>
              <button onClick={() => { setTemplate(null); setTitle('') }} className="ml-auto text-primary-400 hover:text-primary-600 text-base leading-none">×</button>
            </div>
          )}

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
            <Button variant="secondary" onClick={() => { reset(); onClose() }}>Cancel</Button>
            <Button onClick={handleSubmit} loading={loading}>Add Task</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
