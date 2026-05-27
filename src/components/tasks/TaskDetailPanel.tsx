import { useState, useEffect, useRef, type ReactNode } from 'react'
import { X, Trash2, Send, User, Calendar, Plus, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { PRIORITY_LABELS, isOverdue, getInitials, cn } from '../../lib/utils'

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

function PropRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="text-sm text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}

function AssigneePicker({ task, memberMap, projectId, onUpdated }: {
  task: Task
  memberMap: Record<string, { name: string; color: string }>
  projectId: string
  onUpdated: () => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<{ id: string; name: string; color: string }[]>([])
  const ref = useRef<HTMLDivElement>(null)

  async function openPicker() {
    setOpen(true)
    setSearch('')
    const { data } = await supabase.from('profiles').select('id, name, avatar_color').in('id',
      (await supabase.from('project_members').select('user_id').eq('project_id', projectId)).data?.map((m: { user_id: string }) => m.user_id) ?? []
    )
    setMembers((data ?? []).map((p: { id: string; name: string | null; avatar_color: string | null }) => ({ id: p.id, name: p.name ?? p.id, color: p.avatar_color ?? '#6366f1' })))
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const assigneeIds: string[] = task.assignee_ids ?? []

  async function toggle(memberId: string) {
    const next = assigneeIds.includes(memberId)
      ? assigneeIds.filter(id => id !== memberId)
      : [...assigneeIds, memberId]
    await supabase.from('tasks').update({ assignee_ids: next }).eq('id', task.id)
    onUpdated()
  }

  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const assignees = assigneeIds.map(id => memberMap[id]).filter(Boolean)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPicker}
        className="flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
      >
        {assignees.length === 0 ? (
          <>
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
              <User size={12} className="text-slate-400" />
            </div>
            <span className="text-slate-400">No assignee</span>
          </>
        ) : (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border-2 border-white"
                style={{ background: a.color }}
                title={a.name}
              >
                {getInitials(a.name)}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border-2 border-white">
                +{assignees.length - 3}
              </div>
            )}
          </div>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-52 z-50">
          <div className="px-3 py-1.5">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              className="w-full text-sm outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
          <div className="border-t border-slate-100" />
          {filtered.length === 0
            ? <p className="text-xs text-slate-400 px-3 py-2">No members found</p>
            : filtered.map(m => (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className="flex items-center gap-2.5 w-full px-3 py-2 hover:bg-slate-50 transition-colors"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
                  style={{ background: m.color }}
                >
                  {getInitials(m.name)}
                </div>
                <span className="flex-1 text-sm text-slate-700 text-left truncate">{m.name}</span>
                {assigneeIds.includes(m.id) && (
                  <span className="text-primary-500 text-xs font-semibold shrink-0">✓</span>
                )}
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

function SubtaskRow({ sub, memberMap, onUpdate }: {
  sub: Task
  memberMap: Record<string, { name: string; color: string }>
  onUpdate: () => void
}) {
  async function toggleDone() {
    const next = sub.status === 'done' ? 'todo' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', sub.id)
    onUpdate()
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5 group">
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
      <span className={cn('flex-1 text-sm truncate', sub.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700')}>
        {sub.title}
      </span>
    </div>
  )
}

export function TaskDetailPanel({ task, sections, memberMap, onClose, onUpdated, onDeleted }: Props) {
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState(task.status)
  const [priority, setPriority] = useState(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')
  const [sectionId, setSectionId] = useState(task.section_id ?? '')
  const [description, setDescription] = useState(task.description ?? '')
  const [saving, setSaving] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [projectInfo, setProjectInfo] = useState<{ name: string; color: string } | null>(null)
  const overdue = task.due_date && isOverdue(task.due_date) && status !== 'done'
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Reset all local state when switching to a different task
  useEffect(() => {
    setTitle(task.title)
    setStatus(task.status)
    setPriority(task.priority)
    setDueDate(task.due_date ?? '')
    setSectionId(task.section_id ?? '')
    setDescription(task.description ?? '')
    loadComments()
    loadSubtasks()
  }, [task.id])

  // Sync sectionId when it changes externally (e.g. after a board drag)
  useEffect(() => {
    setSectionId(task.section_id ?? '')
  }, [task.section_id])

  // Fetch project name + color for the Projects section
  useEffect(() => {
    supabase.from('projects').select('name, color').eq('id', task.project_id).single()
      .then(({ data }) => { if (data) setProjectInfo(data as { name: string; color: string }) })
  }, [task.project_id])

  async function loadComments() {
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:profiles(id, name, avatar_color)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
  }

  async function loadSubtasks() {
    const { data } = await supabase.from('tasks').select('*').eq('parent_task_id', task.id).order('position')
    if (data) setSubtasks(data as Task[])
  }

  async function save() {
    setSaving(true)
    await supabase.from('tasks').update({
      title: title.trim() || task.title,
      status,
      priority,
      due_date: dueDate || null,
      section_id: sectionId || null,
      description: description || null,
    }).eq('id', task.id)
    setSaving(false)
    onUpdated()
  }

  async function handleDelete() {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', task.id)
    onDeleted()
  }

  async function postComment() {
    if (!newComment.trim() || !user) return
    setPostingComment(true)
    await supabase.from('task_comments').insert({
      task_id: task.id,
      author_id: user.id,
      content: newComment.trim(),
    })
    setNewComment('')
    await loadComments()
    setPostingComment(false)
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

  const myColor = user ? (memberMap[user.id]?.color ?? '#6366f1') : '#6366f1'
  const myName = user ? (memberMap[user.id]?.name ?? '') : ''

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top action bar */}
      <div className="flex items-center justify-end gap-1 px-4 pt-3 pb-1 shrink-0">
        <button onClick={handleDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete task">
          <Trash2 size={15} />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-6 pt-1 pb-5">
          <input
            ref={titleInputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={save}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleInputRef.current?.blur() } }}
            className="w-full text-[22px] font-bold text-slate-900 bg-transparent outline-none placeholder-slate-300 leading-snug"
            placeholder="Task title"
          />
        </div>

        {/* Properties */}
        <div className="px-6 pb-3 border-b border-slate-100">
          <PropRow label="Assignee">
            <AssigneePicker task={task} memberMap={memberMap} projectId={task.project_id} onUpdated={onUpdated} />
          </PropRow>

          <PropRow label="Due date">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
                <Calendar size={12} className="text-slate-400" />
              </div>
              {dueDate ? (
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); setTimeout(save, 0) }}
                  className={cn('text-sm bg-transparent outline-none cursor-pointer', overdue ? 'text-red-500' : 'text-slate-700')}
                />
              ) : (
                <label className="flex items-center cursor-pointer">
                  <span className="text-sm text-slate-400">No due date</span>
                  <input type="date" className="sr-only" onChange={e => { setDueDate(e.target.value); setTimeout(save, 0) }} />
                </label>
              )}
            </div>
          </PropRow>

          <PropRow label="Priority">
            <select
              value={priority}
              onChange={e => { setPriority(e.target.value as typeof priority); setTimeout(save, 0) }}
              className="text-sm text-slate-700 bg-transparent outline-none cursor-pointer hover:text-slate-900"
            >
              {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </PropRow>
        </div>

        {/* Projects / Status */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-slate-800">Projects</h3>
            <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-medium">1</span>
          </div>
          <div className="flex items-center gap-2 py-1.5 pl-1">
            <ChevronDown size={13} className="text-slate-400 shrink-0" />
            <div
              className="w-4 h-4 rounded-sm shrink-0"
              style={{ background: projectInfo?.color ?? '#94a3b8' }}
            />
            <span className="text-sm text-slate-700 flex-1 truncate min-w-0">
              {projectInfo?.name ?? '…'}
            </span>
            <select
              value={sectionId}
              onChange={e => {
                const newId = e.target.value
                setSectionId(newId)
                const completionSectionId = localStorage.getItem(`taskhi:completion-section:${task.project_id}`) ?? ''
                if (newId && newId === completionSectionId) setStatus('done')
                setTimeout(save, 0)
              }}
              className="text-sm text-slate-600 bg-slate-100 rounded-full px-3 py-0.5 outline-none cursor-pointer border-0 shrink-0 max-w-[140px]"
            >
              <option value="">No section</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-slate-400 pl-6 mt-1">No custom fields in this project</p>
        </div>

        {/* Description */}
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800 mb-2">Description</h3>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={save}
            placeholder="What is this task about?"
            rows={3}
            className="w-full text-sm text-slate-600 bg-transparent outline-none resize-none placeholder-slate-400 leading-relaxed"
          />
        </div>

        {/* Subtasks */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-slate-800">Subtasks</h3>
            <button
              onClick={() => document.getElementById('subtask-input')?.focus()}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5 mb-1">
            {subtasks.map(sub => (
              <SubtaskRow key={sub.id} sub={sub} memberMap={memberMap} onUpdate={() => { loadSubtasks(); onUpdated() }} />
            ))}
          </div>
          <div className="flex items-center gap-2 py-2 border-t border-slate-50">
            <input
              id="subtask-input"
              className="flex-1 text-sm text-slate-600 bg-transparent outline-none placeholder-slate-400"
              placeholder="Type to add a subtask…"
              value={subtaskInput}
              onChange={e => setSubtaskInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); addSubtask() }
                if (e.key === 'Escape') setSubtaskInput('')
              }}
            />
            <div className="flex items-center gap-1 shrink-0">
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <Calendar size={10} className="text-slate-400" />
              </div>
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                <User size={10} className="text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Attachments */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">Attachments</h3>
            <button className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Activity */}
        {comments.length > 0 && (
          <div className="px-6 py-4">
            <div className="space-y-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 mt-0.5"
                    style={{ background: c.author?.avatar_color ?? '#6366f1' }}
                  >
                    {getInitials(c.author?.name ?? '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-700">{c.author?.name ?? 'Unknown'}</span>
                      <span className="text-[10px] text-slate-400">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{renderContent(c.content)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comment input — always visible */}
      <div className="border-t border-slate-100 px-5 py-3 shrink-0">
        <div className="flex gap-3 items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ background: myColor }}
          >
            {getInitials(myName)}
          </div>
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() }
            }}
            placeholder="Add a comment…"
            className="flex-1 text-sm text-slate-600 bg-transparent outline-none placeholder-slate-400"
          />
          {newComment.trim() && (
            <button
              onClick={postComment}
              disabled={postingComment}
              className="p-1.5 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send size={13} />
            </button>
          )}
        </div>
        {saving && <p className="text-[10px] text-slate-400 mt-1 ml-11">Saving…</p>}
      </div>
    </div>
  )
}
