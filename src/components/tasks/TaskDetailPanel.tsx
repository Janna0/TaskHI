import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { Button } from '../ui/Button'
import { StatusBadge, PriorityBadge } from '../ui/Badge'
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
    if (data && activeTaskId.current === id) {
      setComments(data as Comment[])
    }
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
            user_id: uid,
            actor_id: user.id,
            type: 'mention',
            task_id: submittedTaskId,
            project_id: projectId,
            comment_id: commentData.id,
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

  return (
    <div>
      <div className="border-t border-slate-100 pt-4">
        <label className="text-xs font-medium text-slate-500 block mb-3">Comments</label>

        {comments.length > 0 && (
          <div className="space-y-3 mb-3">
            {comments.map(c => {
              const authorName = c.author?.name ?? 'Unknown'
              const authorColor = c.author?.avatar_color ?? '#94a3b8'
              const isOwn = c.author_id === user?.id
              return (
                <div key={c.id} className="flex gap-2 group">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5"
                    style={{ background: authorColor }}
                  >
                    {getInitials(authorName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-slate-700">{authorName}</span>
                      <span className="text-[10px] text-slate-400">{relativeTime(c.created_at)}</span>
                      {isOwn && (
                        <button
                          onClick={async () => {
                            await supabase.from('task_comments').delete().eq('id', c.id)
                            loadComments(taskId)
                          }}
                          className="opacity-0 group-hover:opacity-100 ml-auto text-slate-300 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                      {renderContent(c.content)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="relative">
          {mentionMatches.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-20">
              {mentionMatches.map(([uid, m]) => (
                <button
                  key={uid}
                  onMouseDown={e => { e.preventDefault(); insertMention(m.name) }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-primary-50 text-left"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    style={{ background: m.color }}
                  >
                    {getInitials(m.name)}
                  </div>
                  <span className="text-xs text-slate-700">{m.name}</span>
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && mentionQuery === null) {
                e.preventDefault()
                submit()
              }
              if (e.key === 'Escape') setMentionQuery(null)
            }}
            placeholder="Comment… (type @ to mention someone)"
            rows={2}
            className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg px-2.5 py-2 resize-none outline-none focus:ring-1 focus:ring-primary-300 placeholder-slate-400"
          />
          <div className="flex justify-end mt-1">
            <button
              onClick={submit}
              disabled={!input.trim() || submitting}
              className="flex items-center gap-1 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-40 px-2.5 py-1 rounded-md transition-colors"
            >
              <Send size={10} /> {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function TaskDetailPanel({ task, sections, memberMap, onClose, onUpdated, onDeleted }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<string>(task.status)
  const [priority, setPriority] = useState<string>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [sectionId, setSectionId] = useState(task.section_id ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(task.assignee_ids ?? [])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dirty, setDirty] = useState(false)

  const memberEntries = Object.entries(memberMap)

  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSectionId(task.section_id ?? '')
    setNotes(task.notes ?? '')
    setAssigneeIds(task.assignee_ids ?? [])
    setDirty(false)
  }, [task.id])

  function toggleAssignee(uid: string) {
    setAssigneeIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
    setDirty(true)
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('tasks').update({
      title: title.trim() || task.title,
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      notes: notes || null,
      assignee_ids: assigneeIds,
    }).eq('id', task.id)

    const prevAssignees = task.assignee_ids ?? []
    const newAssignees = assigneeIds.filter(id => !prevAssignees.includes(id) && id !== user?.id)
    if (newAssignees.length > 0) {
      await supabase.from('notifications').insert(
        newAssignees.map(assigneeId => ({
          user_id: assigneeId,
          actor_id: user?.id,
          type: 'task_assigned',
          task_id: task.id,
          project_id: task.project_id,
        }))
      )
    }

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Task details</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 text-slate-400">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Title</label>
          <input
            className="w-full text-sm font-medium text-slate-800 border border-transparent rounded-md px-2 py-1.5 hover:border-slate-200 focus:border-primary-300 focus:outline-none focus:ring-1 focus:ring-primary-300"
            value={title}
            onChange={e => { setTitle(e.target.value); setDirty(true) }}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
          <select className={selectClass} value={status} onChange={e => { setStatus(e.target.value); setDirty(true) }}>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Priority</label>
          <select className={selectClass} value={priority} onChange={e => { setPriority(e.target.value); setDirty(true) }}>
            {Object.entries(PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-500 block mb-1">Due date</label>
          <input type="date" className={selectClass} value={dueDate} onChange={e => { setDueDate(e.target.value); setDirty(true) }} />
          {dueDate && isOverdue(dueDate) && status !== 'done' && (
            <p className="text-xs text-red-500 mt-0.5">Overdue</p>
          )}
        </div>

        {sections.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Section</label>
            <select className={selectClass} value={sectionId} onChange={e => { setSectionId(e.target.value); setDirty(true) }}>
              <option value="">No section</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {memberEntries.length > 0 && (
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1.5">Assignees</label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {memberEntries.map(([uid, m]) => {
                const selected = assigneeIds.includes(uid)
                return (
                  <button
                    key={uid}
                    onClick={() => toggleAssignee(uid)}
                    title={m.name}
                    className={cn(
                      'w-7 h-7 rounded-full border-2 flex items-center justify-center text-white text-xs font-semibold transition-all',
                      selected
                        ? 'border-primary-500 ring-2 ring-primary-100 opacity-100'
                        : 'border-transparent opacity-40 hover:opacity-70'
                    )}
                    style={{ background: m.color }}
                  >
                    {getInitials(m.name)}
                  </button>
                )
              })}
            </div>
            {assigneeIds.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {assigneeIds.map(id => memberMap[id]?.name).filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        )}

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

        <div className="text-xs text-slate-400 space-y-1 pt-1">
          <div>Created: {formatDate(task.created_at)}</div>
          <div className="flex gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>

        <CommentsSection taskId={task.id} projectId={task.project_id} memberMap={memberMap} />
      </div>

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
