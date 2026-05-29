import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search, BookOpen } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { PredefinedTask } from '../../types'
import { cn } from '../../lib/utils'

export const PREDEFINED_PHASES = [
  'PHASE 1 - Pre Onboarding & Intelligence Gathering',
  'PHASE 2 - Initiation & Foundations',
  'PHASE 3 - Strategic Design & Mapping - Lifecycles',
  'PHASE 4 - Strategic Design & Mapping - Gamification',
  'PHASE 5 - Implementation & Build - Lifecycle',
  'PHASE 6 - Quality Assurance & Launch - Lifecycles',
  'PHASE 7 - Implementation & Build - Gamification',
  'PHASE 8 - Quality Assurance & Launch',
  'PHASE 9 - Execution',
  'PHASE 10 - Optimization',
  'PHASE 11 - Internal',
]

const TIME_OPTIONS = [
  'A few minutes',
  'About 30 minutes',
  'About 1 hour',
  'Half a day (4-8 hours)',
  '1 day',
  'A few days',
  '1 week',
]

export interface TemplateData {
  title: string
  description: string | null
  time_required: string | null
  competency: string | null
  phase: string | null
  how_to_attachments: string[] | null
}

type NewForm = {
  title: string
  description: string
  time_required: string
  competency: string
  phase: string
  how_to_attachments: string[]
}

interface Props {
  mode?: 'panel' | 'selector' | 'page'
  onSelect?: (t: TemplateData) => void
}

export function PredefinedTasksSection({ mode = 'panel', onSelect }: Props) {
  const [sectionOpen, setSectionOpen] = useState(false)
  const [tasks, setTasks] = useState<PredefinedTask[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [editForm, setEditForm] = useState<Partial<PredefinedTask>>({})
  const [newForm, setNewForm] = useState<NewForm>({ title: '', description: '', time_required: '', competency: '', phase: PREDEFINED_PHASES[0], how_to_attachments: [] })
  const [saving, setSaving] = useState(false)
  const [availableDocs, setAvailableDocs] = useState<{ name: string }[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsLoaded, setDocsLoaded] = useState(false)
  const [showEditDocPicker, setShowEditDocPicker] = useState(false)
  const [showNewDocPicker, setShowNewDocPicker] = useState(false)

  const isSelector = mode === 'selector'
  const isPage = mode === 'page'

  useEffect(() => {
    if (isSelector || isPage) loadTasks()
  }, [])

  useEffect(() => {
    if (!isSelector && !isPage && sectionOpen && !loaded) loadTasks()
  }, [sectionOpen])

  async function loadTasks() {
    setLoading(true)
    const { data } = await supabase.from('predefined_tasks').select('*').order('position')
    if (data) setTasks(data as PredefinedTask[])
    setLoaded(true)
    setLoading(false)
  }

  async function loadDocs() {
    if (docsLoaded || docsLoading) return
    setDocsLoading(true)
    const { data } = await supabase.storage.from('how-to-docs').list('', { sortBy: { column: 'name', order: 'asc' } })
    if (data) setAvailableDocs(data.map(d => ({ name: d.name })))
    setDocsLoaded(true)
    setDocsLoading(false)
  }

  function toggleEditDoc(name: string) {
    setEditForm(f => {
      const current = f.how_to_attachments ?? []
      return {
        ...f,
        how_to_attachments: current.includes(name)
          ? current.filter(n => n !== name)
          : [...current, name],
      }
    })
  }

  function toggleNewDoc(name: string) {
    setNewForm(f => ({
      ...f,
      how_to_attachments: f.how_to_attachments.includes(name)
        ? f.how_to_attachments.filter(n => n !== name)
        : [...f.how_to_attachments, name],
    }))
  }

  async function saveEdit() {
    if (!editingId || !editForm.title?.trim()) return
    setSaving(true)
    await supabase.from('predefined_tasks').update({
      title: editForm.title.trim(),
      description: editForm.description || null,
      time_required: editForm.time_required || null,
      competency: editForm.competency || null,
      phase: editForm.phase || null,
      how_to_attachments: editForm.how_to_attachments?.length ? editForm.how_to_attachments : null,
    }).eq('id', editingId)
    setSaving(false)
    setEditingId(null)
    setEditForm({})
    setShowEditDocPicker(false)
    loadTasks()
  }

  async function deleteTask(id: string) {
    if (!confirm('Delete this predefined task?')) return
    await supabase.from('predefined_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  async function addTask() {
    if (!newForm.title.trim()) return
    setSaving(true)
    const maxPos = tasks.reduce((max, t) => Math.max(max, t.position), -1)
    await supabase.from('predefined_tasks').insert({
      title: newForm.title.trim(),
      description: newForm.description || null,
      time_required: newForm.time_required || null,
      competency: newForm.competency || null,
      phase: newForm.phase || null,
      how_to_attachments: newForm.how_to_attachments.length ? newForm.how_to_attachments : null,
      position: maxPos + 1,
    })
    setSaving(false)
    setAddingNew(false)
    setShowNewDocPicker(false)
    setNewForm({ title: '', description: '', time_required: '', competency: '', phase: PREDEFINED_PHASES[0], how_to_attachments: [] })
    loadTasks()
  }

  function startEdit(task: PredefinedTask) {
    setEditingId(task.id)
    setEditForm({ ...task })
    setShowEditDocPicker(false)
    setAddingNew(false)
  }

  function togglePhase(phase: string) {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  const selectCls = 'text-xs border border-slate-200 rounded px-1.5 py-0.5 outline-none bg-white text-slate-700 focus:ring-1 focus:ring-primary-300'

  const filtered = tasks.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.phase || '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = PREDEFINED_PHASES.map(phase => ({
    phase,
    tasks: filtered.filter(t => t.phase === phase),
  })).filter(g => g.tasks.length > 0)

  const otherTasks = filtered.filter(t => !PREDEFINED_PHASES.includes(t.phase || ''))
  if (otherTasks.length > 0) grouped.push({ phase: 'Other', tasks: otherTasks })

  function renderDocPicker(
    selectedDocs: string[],
    onToggle: (name: string) => void,
    show: boolean,
    setShow: (v: boolean) => void
  ) {
    return (
      <div>
        <button
          type="button"
          onClick={() => { setShow(!show); loadDocs() }}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          <BookOpen size={11} />
          <span>How-To Docs</span>
          {selectedDocs.length > 0 && (
            <span className="text-primary-500 font-medium ml-0.5">({selectedDocs.length})</span>
          )}
          <ChevronDown size={10} className={cn('transition-transform', show && 'rotate-180')} />
        </button>
        {show && (
          <div className="mt-1.5 border border-slate-200 rounded-md p-2 bg-white max-h-32 overflow-y-auto">
            {docsLoading ? (
              <p className="text-xs text-slate-400 text-center py-2">Loading…</p>
            ) : availableDocs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-2">No how-to docs uploaded yet</p>
            ) : (
              <div className="space-y-0.5">
                {availableDocs.map(doc => (
                  <label key={doc.name} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(doc.name)}
                      onChange={() => onToggle(doc.name)}
                      className="w-3 h-3 accent-primary-500"
                    />
                    <span className="text-xs text-slate-700 truncate">{doc.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderEditRow() {
    return (
      <div className="py-2 px-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 mt-1 mb-1">
        <input
          autoFocus
          value={editForm.title || ''}
          onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Task title"
          className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-300"
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); setEditForm({}); setShowEditDocPicker(false) } }}
        />
        <textarea
          value={editForm.description || ''}
          onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          rows={2}
          className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-300 resize-none"
        />
        <div className="flex gap-2 flex-wrap">
          <select className={selectCls} value={editForm.time_required || ''}
            onChange={e => setEditForm(f => ({ ...f, time_required: e.target.value || null }))}>
            <option value="">No time</option>
            {TIME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className={selectCls} value={editForm.competency || ''}
            onChange={e => setEditForm(f => ({ ...f, competency: e.target.value || null }))}>
            <option value="">No level</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="L4">L4</option>
          </select>
          <select className={selectCls} value={editForm.phase || ''}
            onChange={e => setEditForm(f => ({ ...f, phase: e.target.value || null }))}>
            <option value="">No phase</option>
            {PREDEFINED_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        {renderDocPicker(
          editForm.how_to_attachments ?? [],
          toggleEditDoc,
          showEditDocPicker,
          setShowEditDocPicker
        )}
        <div className="flex gap-1.5">
          <button onClick={saveEdit} disabled={saving}
            className="text-xs bg-primary-500 text-white px-2.5 py-1 rounded-md hover:bg-primary-600 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setEditingId(null); setEditForm({}); setShowEditDocPicker(false) }}
            className="text-xs text-slate-500 px-2 py-1 rounded-md hover:bg-slate-100">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  function renderTaskRow(task: PredefinedTask) {
    if (editingId === task.id) {
      return <div key={task.id}>{renderEditRow()}</div>
    }
    return (
      <div
        key={task.id}
        onClick={isSelector ? () => onSelect?.({
          title: task.title,
          description: task.description,
          time_required: task.time_required,
          competency: task.competency,
          phase: task.phase,
          how_to_attachments: task.how_to_attachments,
        }) : undefined}
        className={cn(
          'flex items-start gap-2 py-1.5 px-2 -mx-2 rounded-lg group transition-colors',
          isSelector ? 'cursor-pointer hover:bg-primary-50 active:bg-primary-100' : 'hover:bg-slate-50'
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-snug">{task.title}</p>
          {(task.time_required || task.competency || (task.how_to_attachments?.length ?? 0) > 0) && (
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {task.competency && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">{task.competency}</span>
              )}
              {task.time_required && (
                <span className="text-[10px] text-slate-400">{task.time_required}</span>
              )}
              {(task.how_to_attachments?.length ?? 0) > 0 && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <BookOpen size={9} />
                  {task.how_to_attachments!.length}
                </span>
              )}
            </div>
          )}
        </div>
        {!isSelector && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            <button onClick={e => { e.stopPropagation(); startEdit(task) }}
              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600">
              <Pencil size={11} />
            </button>
            <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500">
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>
    )
  }

  const body = (
    <div>
      <div className="relative mb-3">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks…"
          className="w-full text-sm border border-slate-200 rounded-lg pl-7 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-200 placeholder-slate-400"
        />
      </div>

      {loading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}

      {!loading && (
        <div className={cn('space-y-1', isSelector && 'max-h-72 overflow-y-auto pr-1', isPage && 'space-y-1')}>
          {grouped.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">No tasks found</p>
          )}
          {grouped.map(group => {
            const isExpanded = !!search || expandedPhases.has(group.phase)
            return (
              <div key={group.phase}>
                <button
                  onClick={() => togglePhase(group.phase)}
                  className="flex items-center gap-1.5 w-full text-left py-1"
                >
                  {isExpanded
                    ? <ChevronDown size={11} className="text-slate-400 shrink-0" />
                    : <ChevronRight size={11} className="text-slate-400 shrink-0" />
                  }
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">{group.phase}</span>
                  <span className="text-[10px] text-slate-400 ml-auto shrink-0 pl-2">{group.tasks.length}</span>
                </button>
                {isExpanded && (
                  <div className="ml-3 space-y-0 mt-0.5">
                    {group.tasks.map(t => renderTaskRow(t))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!isSelector && (
        <>
          {addingNew ? (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-600 mb-1">Add Predefined Task</p>
              <input
                autoFocus
                value={newForm.title}
                onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Task title *"
                onKeyDown={e => { if (e.key === 'Escape') { setAddingNew(false); setShowNewDocPicker(false); setNewForm({ title: '', description: '', time_required: '', competency: '', phase: PREDEFINED_PHASES[0], how_to_attachments: [] }) } }}
                className="w-full text-sm border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-300"
              />
              <textarea
                value={newForm.description}
                onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-300 resize-none"
              />
              <div className="flex gap-2 flex-wrap">
                <select className={selectCls} value={newForm.time_required}
                  onChange={e => setNewForm(f => ({ ...f, time_required: e.target.value }))}>
                  <option value="">No time</option>
                  {TIME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <select className={selectCls} value={newForm.competency}
                  onChange={e => setNewForm(f => ({ ...f, competency: e.target.value }))}>
                  <option value="">No level</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="L4">L4</option>
                </select>
                <select className={selectCls} value={newForm.phase}
                  onChange={e => setNewForm(f => ({ ...f, phase: e.target.value }))}>
                  <option value="">No phase</option>
                  {PREDEFINED_PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {renderDocPicker(
                newForm.how_to_attachments,
                toggleNewDoc,
                showNewDocPicker,
                setShowNewDocPicker
              )}
              <div className="flex gap-1.5">
                <button onClick={addTask} disabled={saving || !newForm.title.trim()}
                  className="text-xs bg-primary-500 text-white px-2.5 py-1 rounded-md hover:bg-primary-600 disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add'}
                </button>
                <button onClick={() => { setAddingNew(false); setShowNewDocPicker(false); setNewForm({ title: '', description: '', time_required: '', competency: '', phase: PREDEFINED_PHASES[0], how_to_attachments: [] }) }}
                  className="text-xs text-slate-500 px-2 py-1 rounded-md hover:bg-slate-100">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingNew(true)}
              className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-500 transition-colors"
            >
              <Plus size={12} />
              Add predefined task
            </button>
          )}
        </>
      )}
    </div>
  )

  if (isSelector || isPage) return body

  return (
    <div className="px-6 py-4 border-b border-slate-100">
      <button
        onClick={() => setSectionOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        {sectionOpen
          ? <ChevronDown size={14} className="text-slate-400" />
          : <ChevronRight size={14} className="text-slate-400" />
        }
        <h3 className="text-sm font-semibold text-slate-700">Predefined Tasks</h3>
      </button>
      {sectionOpen && <div className="mt-3">{body}</div>}
    </div>
  )
}
