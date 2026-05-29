import { useState, useEffect, useRef, type ReactNode } from 'react'
import { X, Trash2, Send, User, Calendar, Flag, Layers, Plus, BookOpen, FileText, Clock, Award, Tag } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { STATUS_LABELS, PRIORITY_LABELS, formatDate, isOverdue, getInitials, cn } from '../../lib/utils'

interface Comment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  author: { id: string; name: string | null; avatar_color: string | null } | null
}

interface Props {
  task: Task
  sections: Section[]
  memberMap: Record<string, { name: string; color: string }>
  canEdit?: boolean
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}

function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function renderContent(content: string) {
  return content.split(/(@\w+)/g).map((part, i) =>
    /^@\w+$/.test(part)
      ? <span key={i} className="text-primary-600 font-medium bg-primary-50 rounded px-0.5">{part}</span>
      : <span key={i}>{part}</span>
  )
}

function PropRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center py-2.5 hover:bg-slate-50 rounded-lg px-2 -mx-2 group transition-colors">
      <div className="flex items-center gap-2.5 w-32 shrink-0">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="flex-1 text-sm">{children}</div>
    </div>
  )
}

function CommentsSection({ taskId, projectId, memberMap }: {
  taskId: string
  projectId: string
  memberMap: Record<string, { name: string; color: string }>
}) {
  const { user } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionStart, setMentionStart] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeTaskId = useRef(taskId)

  useEffect(() => {
    activeTaskId.current = taskId
    setComments([])
    loadComments(taskId)
  }, [taskId])

  async function loadComments(id: string) {
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:profiles(id, name, avatar_color)')
      .eq('task_id', id)
      .order('created_at', { ascending: true })
    if (data && activeTaskId.current === id) setComments(data as Comment[])
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setInput(val)
    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      setMentionQuery(match[1].toLowerCase())
      setMentionStart(cursor - match[0].length)
    } else {
      setMentionQuery(null)
    }
  }

  function insertMention(name: string) {
    const handle = name.split(' ')[0]
    const cursor = textareaRef.current?.selectionStart ?? input.length
    const newVal = input.slice(0, mentionStart) + `@${handle} ` + input.slice(cursor)
    setInput(newVal)
    setMentionQuery(null)
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  async function submit() {
    const trimmed = input.trim()
    if (!trimmed || !user || submitting) return
    setSubmitting(true)
    const submittedTaskId = taskId

    const { data: commentData } = await supabase
      .from('task_comments')
      .insert({ task_id: submittedTaskId, author_id: user.id, content: trimmed })
      .select('*, author:profiles(id, name, avatar_color)')
      .single()

    if (commentData) {
      if (activeTaskId.current === submittedTaskId) {
        setComments(prev => [...prev, commentData as Comment])
      }
      const mentions = [...trimmed.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase())
      const toNotify = [...new Set(
        Object.entries(memberMap)
          .filter(([uid, m]) => mentions.includes(m.name.split(' ')[0].toLowerCase()) && uid !== user.id)
          .map(([uid]) => uid)
      )]
      if (toNotify.length > 0) {
        await supabase.from('notifications').insert(
          toNotify.map(uid => ({
            user_id: uid, actor_id: user.id, type: 'mention',
            task_id: submittedTaskId, project_id: projectId, comment_id: commentData.id,
          }))
        )
      }
    }
    setInput('')
    setSubmitting(false)
  }

  const mentionMatches = mentionQuery !== null
    ? Object.entries(memberMap).filter(([, m]) => m.name.toLowerCase().startsWith(mentionQuery)).slice(0, 5)
    : []

  const myColor = user ? (memberMap[user.id]?.color ?? '#94a3b8') : '#94a3b8'
  const myName = user ? (memberMap[user.id]?.name ?? '') : ''

  return (
    <div>
      {comments.length > 0 && (
        <div className="space-y-4 mb-4">
          {comments.map(c => {
            const authorName = c.author?.name ?? 'Unknown'
            const authorColor = c.author?.avatar_color ?? '#94a3b8'
            const isOwn = c.author_id === user?.id
            return (
              <div key={c.id} className="flex gap-3 group">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5"
                  style={{ background: authorColor }}
                >
                  {getInitials(authorName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-700">{authorName}</span>
                    <span className="text-xs text-slate-400">{relativeTime(c.created_at)}</span>
                    {isOwn && (
                      <button
                        onClick={async () => {
                          await supabase.from('task_comments').delete().eq('id', c.id)
                          loadComments(taskId)
                        }}
                        className="opacity-0 group-hover:opacity-100 ml-auto text-slate-300 hover:text-red-400 transition-all"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                    {renderContent(c.content)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-3 items-start">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5"
          style={{ background: myColor }}
        >
          {getInitials(myName)}
        </div>
        <div className="flex-1 relative">
          {mentionMatches.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20">
              {mentionMatches.map(([uid, m]) => (
                <button
                  key={uid}
                  onMouseDown={e => { e.preventDefault(); insertMention(m.name) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-primary-50 text-left"
                >
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0" style={{ background: m.color }}>
                    {getInitials(m.name)}
                  </div>
                  <span className="text-sm text-slate-700">{m.name}</span>
                </button>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) { e.preventDefault(); submit() }
              if (e.key === 'Escape') setMentionQuery(null)
            }}
            placeholder="Add a comment…  (@ to mention)"
            rows={1}
            className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 placeholder-slate-400"
          />
          {input.trim() && (
            <div className="flex justify-end mt-1.5">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex items-center gap-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 px-3 py-1.5 rounded-md transition-colors"
              >
                <Send size={11} /> {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SubtaskRow({ sub, memberMap, onUpdate }: {
  sub: Task
  memberMap: Record<string, { name: string; color: string }>
  onUpdate: () => void
}) {
  const [showAssignee, setShowAssignee] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowAssignee(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function toggleDone() {
    const next = sub.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', sub.id)
    onUpdate()
  }

  async function setDueDate(date: string) {
    await supabase.from('tasks').update({ due_date: date || null }).eq('id', sub.id)
    onUpdate()
  }

  async function toggleAssignee(uid: string) {
    const current = sub.assignee_ids ?? []
    const next = current.includes(uid) ? current.filter(id => id !== uid) : [...current, uid]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', sub.id)
    onUpdate()
  }

  const assignees = (sub.assignee_ids ?? []).map(id => memberMap[id]).filter(Boolean)
  const memberEntries = Object.entries(memberMap)

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 group">
      <button
        onClick={toggleDone}
        className={cn(
          'w-4 h-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center',
          sub.status === 'done' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-slate-400'
        )}
      >
        {sub.status === 'done' && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      <span className={cn('flex-1 text-sm min-w-0 truncate', sub.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {sub.title}
      </span>

      {sub.due_date ? (
        <input
          type="date"
          value={sub.due_date}
          onChange={e => setDueDate(e.target.value)}
          className={cn(
            'text-xs bg-transparent outline-none cursor-pointer shrink-0',
            isOverdue(sub.due_date) && sub.status !== 'done' ? 'text-red-400' : 'text-slate-400'
          )}
        />
      ) : (
        <div className="relative shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" title="Set due date">
          <Calendar size={13} className="text-slate-300" />
          <input
            type="date"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
      )}

      <div className="relative shrink-0" ref={pickerRef}>
        <button
          onClick={() => setShowAssignee(v => !v)}
          className={cn(
            'flex items-center transition-opacity',
            assignees.length === 0 && 'opacity-0 group-hover:opacity-100'
          )}
          title="Assign"
        >
          {assignees.length > 0 ? (
            <div className="flex -space-x-1">
              {assignees.slice(0, 2).map((a, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: a.color }}>
                  {getInitials(a.name)}
                </div>
              ))}
            </div>
          ) : (
            <User size={13} className="text-slate-300 hover:text-slate-500" />
          )}
        </button>

        {showAssignee && memberEntries.length > 0 && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-40 p-1.5 min-w-[160px]">
            {memberEntries.map(([uid, m]) => {
              const selected = (sub.assignee_ids ?? []).includes(uid)
              return (
                <button
                  key={uid}
                  onClick={() => toggleAssignee(uid)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left"
                >
                  <div
                    className={cn('w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold border-2', selected ? 'border-primary-500' : 'border-transparent')}
                    style={{ background: m.color }}
                  >
                    {getInitials(m.name)}
                  </div>
                  <span className="text-sm text-slate-700">{m.name}</span>
                  {selected && <span className="ml-auto text-primary-500 text-xs">✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function TaskDetailPanel({ task, sections, memberMap, canEdit = true, onClose, onUpdated, onDeleted }: Props) {
  const { user, profile } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<string>(task.status)
  const [priority, setPriority] = useState<string>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [sectionId, setSectionId] = useState(task.section_id ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignee_ids ?? [])
  const [howToDocs, setHowToDocs] = useState<string[]>(task.how_to_attachments ?? [])
  const [competency, setCompetency] = useState(task.competency ?? '')
  const [timeRequired, setTimeRequired] = useState(task.time_required ?? '')
  const [phase, setPhase] = useState(task.phase ?? '')
  const [availableDocs, setAvailableDocs] = useState<{ id: string; name: string }[]>([])
  const [showDocPicker, setShowDocPicker] = useState(false)
  const [docSearch, setDocSearch] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const assigneePickerRef = useRef<HTMLDivElement>(null)
  const docPickerRef = useRef<HTMLDivElement>(null)

  const memberEntries = Object.entries(memberMap)

  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSectionId(task.section_id ?? '')
    setNotes(task.notes ?? '')
    setAssigneeIds(task.assignee_ids ?? [])
    setHowToDocs(task.how_to_attachments ?? [])
    setCompetency(task.competency ?? '')
    setTimeRequired(task.time_required ?? '')
    setPhase(task.phase ?? '')
    setSaved(false)
    setShowDocPicker(false)
    setDocSearch('')
    loadSubtasks()
  }, [task.id])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) setShowAssigneePicker(false)
      if (docPickerRef.current && !docPickerRef.current.contains(e.target as Node)) setShowDocPicker(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function loadSubtasks() {
    const { data } = await supabase.from('tasks').select('*').eq('parent_task_id', task.id).order('position')
    if (data) setSubtasks(data as Task[])
  }

  async function loadAvailableDocs() {
    const { data } = await supabase.storage.from('how-to-docs').list('', { sortBy: { column: 'name', order: 'asc' } })
    if (data) setAvailableDocs(data.map(d => ({ id: d.id ?? '', name: d.name })))
  }

  async function openDoc(docName: string) {
    const { data } = await supabase.storage.from('how-to-docs').createSignedUrl(docName, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleSave() {
    setSaving(true)
    const trimmedTitle = title.trim() || task.title
    setTitle(trimmedTitle)

    const { error: updateError } = await supabase.from('tasks').update({
      title: trimmedTitle,
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      notes: notes || null,
      assignee_ids: assigneeIds,
      how_to_attachments: howToDocs,
      competency: competency || null,
      time_required: (timeRequired && timeRequired !== '__custom__') ? timeRequired : null,
      phase: phase || null,
    }).eq('id', task.id)

    if (updateError) {
      setSaving(false)
      const isNewField = updateError.message.includes('competency') || updateError.message.includes('time_required') || updateError.message.includes('phase')
      alert(
        'Failed to save task.\n\n' +
        (isNewField
          ? 'Some fields require new database columns.\n\n' +
            'Go to your Supabase dashboard → Table Editor → tasks → Add column:\n' +
            '  • competency  (type: text, nullable)\n' +
            '  • time_required  (type: text, nullable)\n' +
            '  • phase  (type: text, nullable)\n\n' +
            'Then try saving again.'
          : updateError.message)
      )
      return
    }

    const added = assigneeIds.filter(id => !(task.assignee_ids ?? []).includes(id) && id !== user?.id)
    if (added.length > 0) {
      await supabase.from('notifications').insert(
        added.map(id => ({
          user_id: id, actor_id: user?.id, type: 'task_assigned',
          task_id: task.id, project_id: task.project_id,
        }))
      )
      const [{ data: projectData }, { data: profiles }] = await Promise.all([
        supabase.from('projects').select('name').eq('id', task.project_id).single(),
        supabase.from('profiles').select('id, email, name').in('id', added),
      ])
      const assignedByName = profile?.name || user?.email?.split('@')[0] || 'Someone'
      const projectName = projectData?.name ?? 'a project'
      ;(profiles ?? []).forEach(p => {
        supabase.functions.invoke('notify-assignment', {
          body: {
            assignee_email: p.email,
            assignee_name: p.name ?? p.email?.split('@')[0] ?? 'there',
            task_title: trimmedTitle,
            project_name: projectName,
            assigned_by_name: assignedByName,
          },
        }).catch(() => {})
      })
    }

    onUpdated()
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    onDeleted()
  }

  async function addSubtask() {
    const t = subtaskInput.trim()
    if (!t) return
    await supabase.from('tasks').insert({
      project_id: task.project_id,
      section_id: task.section_id,
      parent_task_id: task.id,
      title: t,
      position: subtasks.length,
      depth: (task.depth ?? 0) + 1,
    })
    setSubtaskInput('')
    loadSubtasks()
    onUpdated()
  }

  const assignedNames = assigneeIds.map(id => memberMap[id]?.name).filter(Boolean)

  return (
    <div className="w-[640px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {canEdit && (
            <button onClick={handleDelete} disabled={deleting}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete task">
              <Trash2 size={14} />
            </button>
          )}
          {!canEdit && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">View only</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (saved ? (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Saved
            </span>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="text-xs font-medium bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
          ))}
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-6 pt-5 pb-2">
          <input
            className="w-full text-xl font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300 leading-snug read-only:cursor-default"
            value={title}
            readOnly={!canEdit}
            onChange={e => canEdit && setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
            placeholder="Task title"
          />
        </div>

        {/* Properties */}
        <div className="px-6 py-2 border-b border-slate-100">
          <PropRow icon={<User size={14} />} label="Assignee">
            <div className="relative" ref={assigneePickerRef}>
              <button
                onClick={() => canEdit && setShowAssigneePicker(v => !v)}
                className={cn("flex items-center gap-1.5 text-sm text-left rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors", canEdit ? "hover:bg-slate-100" : "cursor-default")}
              >
                {assigneeIds.length === 0 ? (
                  <span className="text-slate-400">No assignee</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {assigneeIds.slice(0, 3).map(id => memberMap[id] && (
                        <div key={id} className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[9px] font-semibold" style={{ background: memberMap[id].color }}>
                          {getInitials(memberMap[id].name)}
                        </div>
                      ))}
                    </div>
                    <span className="text-slate-700">{assignedNames.join(', ')}</span>
                  </div>
                )}
              </button>
              {showAssigneePicker && memberEntries.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 min-w-[180px]">
                  {memberEntries.map(([uid, m]) => {
                    const selected = assigneeIds.includes(uid)
                    return (
                      <button key={uid}
                        onClick={() => setAssigneeIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left">
                        <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border-2', selected ? 'border-primary-500' : 'border-transparent')} style={{ background: m.color }}>
                          {getInitials(m.name)}
                        </div>
                        <span className="text-sm text-slate-700">{m.name}</span>
                        {selected && <span className="ml-auto text-primary-500 text-xs">✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </PropRow>

          <PropRow icon={<Calendar size={14} />} label="Due date">
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                className={cn('text-sm bg-transparent outline-none cursor-pointer',
                  dueDate
                    ? (isOverdue(dueDate) && status !== 'done' ? 'text-red-500' : 'text-slate-700')
                    : 'text-slate-400'
                )}
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
              {dueDate && (
                <button onClick={() => setDueDate('')} className="text-slate-300 hover:text-slate-500 transition-colors leading-none" title="Clear">×</button>
              )}
            </div>
          </PropRow>

          <PropRow icon={<Flag size={14} />} label="Priority">
            <select className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
              value={priority} onChange={e => setPriority(e.target.value)}>
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </PropRow>

          {sections.length > 0 && (
            <PropRow icon={<Layers size={14} />} label="Status">
              <select className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
                value={sectionId} onChange={e => {
                  const newId = e.target.value
                  setSectionId(newId)
                  const completionSectionId = localStorage.getItem(`taskhi:completion-section:${task.project_id}`) ?? ''
                  if (newId && newId === completionSectionId) setStatus('done')
                  else if (sectionId === completionSectionId && status === 'done') setStatus('todo')
                }}>
                <option value="">No section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </PropRow>
          )}

          <PropRow icon={<BookOpen size={14} />} label="How To">
            <div className="relative" ref={docPickerRef}>
              <button
                onClick={() => { setShowDocPicker(v => !v); if (!showDocPicker) { loadAvailableDocs(); setDocSearch('') } }}
                className="flex items-center gap-1.5 text-sm text-left hover:bg-slate-100 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors min-w-0"
              >
                {howToDocs.length === 0 ? (
                  <span className="text-slate-400">Attach document</span>
                ) : (
                  <div className="flex items-center gap-1 flex-wrap">
                    {howToDocs.map(name => (
                      <span key={name} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs rounded-md px-1.5 py-0.5">
                        <FileText size={10} />
                        <button
                          onClick={e => { e.stopPropagation(); openDoc(name) }}
                          className="max-w-[120px] truncate hover:underline"
                        >{name}</button>
                        <button
                          onClick={e => { e.stopPropagation(); setHowToDocs(prev => prev.filter(n => n !== name)) }}
                          className="text-primary-400 hover:text-red-400 ml-0.5 leading-none"
                        >×</button>
                      </span>
                    ))}
                    <span className="text-slate-400 text-xs">+</span>
                  </div>
                )}
              </button>
              {showDocPicker && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-30 overflow-hidden">
                  <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search documents…"
                      value={docSearch}
                      onChange={e => setDocSearch(e.target.value)}
                      className="w-full text-sm outline-none bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 placeholder-slate-400"
                    />
                  </div>
                  {(() => {
                    const filtered = availableDocs
                      .filter(d => !howToDocs.includes(d.name))
                      .filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()))
                    return filtered.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-slate-400">
                        {availableDocs.length === 0 ? 'No How To documents available' : docSearch ? 'No matching documents' : 'All documents already attached'}
                      </p>
                    ) : (
                      <div className="py-1 max-h-48 overflow-y-auto">
                        {filtered.map(doc => (
                          <button key={doc.id}
                            onClick={() => { setHowToDocs(prev => [...prev, doc.name]); setShowDocPicker(false); setDocSearch('') }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 text-left transition-colors">
                            <FileText size={13} className="text-primary-400 shrink-0" />
                            <span className="text-sm text-slate-700 truncate">{doc.name}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </PropRow>

          <PropRow icon={<Award size={14} />} label="Competency">
            <select
              className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
              value={competency}
              onChange={e => setCompetency(e.target.value)}
            >
              <option value="">None</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="L4">L4</option>
            </select>
          </PropRow>

          <PropRow icon={<Clock size={14} />} label="Time Required">
            {(() => {
              const TIME_OPTIONS = [
                'A few minutes',
                'About 30 minutes',
                'About 1 hour',
                'Half a day (4-8 hours)',
                '1 day',
                'A few days',
                '1 week',
              ]
              const isCustom = timeRequired !== '' && !TIME_OPTIONS.includes(timeRequired)
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
                    value={isCustom ? 'Other' : timeRequired}
                    onChange={e => {
                      if (e.target.value === 'Other') setTimeRequired('__custom__')
                      else setTimeRequired(e.target.value)
                    }}
                  >
                    <option value="">None</option>
                    {TIME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    <option value="Other">Other</option>
                  </select>
                  {(isCustom || timeRequired === '__custom__') && (
                    <input
                      autoFocus
                      type="text"
                      placeholder="Custom time…"
                      value={timeRequired === '__custom__' ? '' : timeRequired}
                      onChange={e => setTimeRequired(e.target.value || '__custom__')}
                      onBlur={e => { if (!e.target.value) setTimeRequired('') }}
                      className="text-sm border border-slate-200 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300 w-36"
                    />
                  )}
                </div>
              )
            })()}
          </PropRow>

          <PropRow icon={<Tag size={14} />} label="Phase">
            <select
              className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
              value={phase}
              onChange={e => setPhase(e.target.value)}
            >
              <option value="">None</option>
              <option value="PHASE 1 - Pre Onboarding & Intelligence Gathering">PHASE 1 - Pre Onboarding &amp; Intelligence Gathering</option>
              <option value="PHASE 2 - Initiation & Foundations">PHASE 2 - Initiation &amp; Foundations</option>
              <option value="PHASE 3 - Strategic Design & Mapping - Lifecycles">PHASE 3 - Strategic Design &amp; Mapping - Lifecycles</option>
              <option value="PHASE 4 - Strategic Design & Mapping - Gamification">PHASE 4 - Strategic Design &amp; Mapping - Gamification</option>
              <option value="PHASE 5 - Implementation & Build - Lifecycle">PHASE 5 - Implementation &amp; Build - Lifecycle</option>
              <option value="PHASE 6 - Quality Assurance & Launch - Lifecycles">PHASE 6 - Quality Assurance &amp; Launch - Lifecycles</option>
              <option value="PHASE 7 - Implementation & Build - Gamification">PHASE 7 - Implementation &amp; Build - Gamification</option>
              <option value="PHASE 8 - Quality Assurance & Launch">PHASE 8 - Quality Assurance &amp; Launch</option>
              <option value="PHASE 9 - Execution">PHASE 9 - Execution</option>
              <option value="PHASE 10 - Optimization">PHASE 10 - Optimization</option>
              <option value="PHASE 11 - Internal">PHASE 11 - Internal</option>
              <option value="Other">Other</option>
            </select>
          </PropRow>
        </div>

        {/* Description */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <textarea
            className="w-full text-sm text-slate-600 bg-transparent resize-none outline-none placeholder-slate-400 leading-relaxed min-h-[80px]"
            placeholder="What is this task about?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
        </div>

        {/* Subtasks */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Subtasks</h3>
            <button onClick={() => document.getElementById('subtask-input')?.focus()}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Plus size={15} />
            </button>
          </div>
          <div className="space-y-0.5 mb-2">
            {subtasks.map(sub => (
              <SubtaskRow key={sub.id} sub={sub} memberMap={memberMap} onUpdate={loadSubtasks} />
            ))}
          </div>
          <div className="flex items-center gap-3 py-1 px-2 -mx-2 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 transition-colors focus-within:border-primary-300 focus-within:bg-primary-50/20">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
            <input id="subtask-input"
              className="flex-1 text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400 py-1.5"
              placeholder="Type to add a subtask…"
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addSubtask() }
                if (e.key === 'Escape') setSubtaskInput('')
              }}
            />
          </div>
        </div>

        {/* Comments */}
        <div className="px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Comments</h3>
          <CommentsSection taskId={task.id} projectId={task.project_id} memberMap={memberMap} />
        </div>
      </div>
    </div>
  )
}
