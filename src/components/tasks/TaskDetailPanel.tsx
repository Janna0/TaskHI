import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Send, User, Calendar, Flag, Layers, CheckSquare, Plus } from 'lucide-react'
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

// ── Property row ───────────────────────────────────────────────────────────────

function PropRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
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

// ── Comments ───────────────────────────────────────────────────────────────────

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
      {/* Comment list */}
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

      {/* Input row */}
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

// ── Main panel ──────────────────────────────────────────────────────────────

export function TaskDetailPanel({ task, sections, memberMap, onClose, onUpdated, onDeleted }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<string>(task.status)
  const [priority, setPriority] = useState<string>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [sectionId, setSectionId] = useState(task.section_id ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignee_ids ?? [])
  const [deleting, setDeleting] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const assigneePickerRef = useRef<HTMLDivElement>(null)

  const memberEntries = Object.entries(memberMap)

  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSectionId(task.section_id ?? '')
    setNotes(task.notes ?? '')
    setAssigneeIds(task.assignee_ids ?? [])
    loadSubtasks()
  }, [task.id])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setShowAssigneePicker(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function loadSubtasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', task.id)
      .order('position')
    if (data) setSubtasks(data as Task[])
  }

  async function saveField(fields: Partial<{
    title: string; status: string; priority: string; due_date: string | null;
    section_id: string | null; notes: string; assignee_ids: string[]
  }>) {
    await supabase.from('tasks').update(fields).eq('id', task.id)
    onUpdated()
  }

  async function handleTitleBlur() {
    const trimmed = title.trim() || task.title
    if (trimmed !== task.title) await saveField({ title: trimmed })
  }

  async function handleNotesBlur() {
    if (notes !== (task.notes ?? '')) await saveField({ notes: notes || null })
  }

  async function toggleAssignee(uid: string) {
    const next = assigneeIds.includes(uid)
      ? assigneeIds.filter(id => id !== uid)
      : [...assigneeIds, uid]
    setAssigneeIds(next)
    await saveField({ assignee_ids: next })

    const added = next.filter(id => !(task.assignee_ids ?? []).includes(id) && id !== user?.id)
    if (added.length > 0) {
      await supabase.from('notifications').insert(
        added.map(id => ({
          user_id: id, actor_id: user?.id, type: 'task_assigned',
          task_id: task.id, project_id: task.project_id,
        }))
      )
    }
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

  async function toggleSubtaskDone(sub: Task) {
    const next = sub.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', sub.id)
    loadSubtasks()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    setDeleting(false)
    onDeleted()
  }

  const assignedNames = assigneeIds.map(id => memberMap[id]?.name).filter(Boolean)

  return (
    <div className="w-[500px] shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete task"
          >
            <Trash2 size={14} />
          </button>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-6 pt-5 pb-2">
          <input
            className="w-full text-xl font-semibold text-slate-800 bg-transparent outline-none placeholder-slate-300 leading-snug"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Task title"
          />
        </div>

        {/* Properties */}
        <div className="px-6 py-2 border-b border-slate-100">
          {/* Assignee */}
          <PropRow icon={<User size={14} />} label="Assignee">
            <div className="relative" ref={assigneePickerRef}>
              <button
                onClick={() => setShowAssigneePicker(v => !v)}
                className="flex items-center gap-1.5 text-sm text-left hover:bg-slate-100 rounded-md px-1.5 py-0.5 -ml-1.5 transition-colors"
              >
                {assigneeIds.length === 0 ? (
                  <span className="text-slate-400">No assignee</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1">
                      {assigneeIds.slice(0, 3).map(id => memberMap[id] && (
                        <div
                          key={id}
                          className="w-5 h-5 rounded-full border border-white flex items-center justify-center text-white text-[9px] font-semibold"
                          style={{ background: memberMap[id].color }}
                        >
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
                      <button
                        key={uid}
                        onClick={() => toggleAssignee(uid)}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left"
                      >
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border-2',
                            selected ? 'border-primary-500' : 'border-transparent'
                          )}
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
          </PropRow>

          {/* Due date */}
          <PropRow icon={<Calendar size={14} />} label="Due date">
            <div className="relative flex items-center gap-1">
              <input
                type="date"
                className={cn(
                  'text-sm bg-transparent outline-none cursor-pointer',
                  dueDate ? (isOverdue(dueDate) && status !== 'done' ? 'text-red-500' : 'text-slate-700') : 'text-slate-400'
                )}
                value={dueDate}
                onChange={async e => {
                  setDueDate(e.target.value)
                  await saveField({ due_date: e.target.value || null })
                }}
              />
              {!dueDate && <span className="absolute left-0 text-sm text-slate-400 pointer-events-none">No due date</span>}
            </div>
          </PropRow>

          {/* Priority */}
          <PropRow icon={<Flag size={14} />} label="Priority">
            <select
              className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
              value={priority}
              onChange={async e => {
                setPriority(e.target.value)
                await saveField({ priority: e.target.value })
              }}
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </PropRow>

          {/* Status */}
          <PropRow icon={<CheckSquare size={14} />} label="Status">
            <select
              className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
              value={status}
              onChange={async e => {
                setStatus(e.target.value)
                await saveField({ status: e.target.value })
              }}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </PropRow>

          {/* Section */}
          {sections.length > 0 && (
            <PropRow icon={<Layers size={14} />} label="Section">
              <select
                className="text-sm bg-transparent outline-none cursor-pointer text-slate-700 hover:bg-slate-100 rounded px-1 -ml-1"
                value={sectionId}
                onChange={async e => {
                  setSectionId(e.target.value)
                  await saveField({ section_id: e.target.value || null })
                }}
              >
                <option value="">No section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </PropRow>
          )}
        </div>

        {/* Description */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Description</h3>
          <textarea
            className="w-full text-sm text-slate-600 bg-transparent resize-none outline-none placeholder-slate-400 leading-relaxed min-h-[80px]"
            placeholder="What is this task about?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            rows={4}
          />
        </div>

        {/* Subtasks */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Subtasks</h3>
            <button
              onClick={() => document.getElementById('subtask-input')?.focus()}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Existing subtasks */}
          <div className="space-y-0.5 mb-2">
            {subtasks.map(sub => (
              <div key={sub.id} className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-slate-50 group">
                <button
                  onClick={() => toggleSubtaskDone(sub)}
                  className={cn(
                    'w-4 h-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center',
                    sub.status === 'done'
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-slate-300 hover:border-slate-400'
                  )}
                >
                  {sub.status === 'done' && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <span className={cn('flex-1 text-sm', sub.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
                  {sub.title}
                </span>
                {sub.due_date && (
                  <span className={cn('text-xs shrink-0', isOverdue(sub.due_date) && sub.status !== 'done' ? 'text-red-400' : 'text-slate-400')}>
                    {formatDate(sub.due_date)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Add subtask input */}
          <div className="flex items-center gap-3 py-1 px-2 -mx-2 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 transition-colors focus-within:border-primary-300 focus-within:bg-primary-50/20">
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 shrink-0" />
            <input
              id="subtask-input"
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
