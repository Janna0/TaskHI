import { useState, useEffect, useRef, type ReactNode } from 'react'
import { X, Trash2, Send, User, Calendar, Flag, Layers, Plus, BookOpen, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Task, Section } from '../../types'
import { PRIORITY_LABELS, formatDate, isOverdue, getInitials, cn } from '../../lib/utils'

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

function PropRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-center py-2.5 hover:bg-slate-50 rounded-lg px-2 -mx-2 group transition-colors">
      <div className="flex items-center gap-2.5 w-32 shrink-0">
        <span className="text-slate-400">{icon}</span>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
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
  const [copied, setCopied] = useState(false)

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

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const assignees = assigneeIds.map(id => memberMap[id]).filter(Boolean)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={openPicker}
        className="flex items-center gap-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
      >
        {assignees.length === 0 ? (
          <span className="text-slate-400">Unassigned</span>
        ) : (
          <div className="flex -space-x-1.5">
            {assignees.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold border border-white"
                style={{ background: a.color }}
                title={a.name}
              >
                {getInitials(a.name)}
              </div>
            ))}
            {assignees.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600 border border-white">
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
      <button
        onClick={async () => {
          const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
        className="ml-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
        title="Copy link to task"
      >
        {copied ? '✓ Copied' : 'Copy link'}
      </button>
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
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details')
  const [howTo, setHowTo] = useState(task.how_to ?? '')
  const [howToAttachments, setHowToAttachments] = useState<string[]>(task.how_to_attachments ?? [])
  const [uploadingHowTo, setUploadingHowTo] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const howToFileRef = useRef<HTMLInputElement>(null)
  const overdue = task.due_date && isOverdue(task.due_date) && task.status !== 'done'
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadComments() }, [task.id])

  async function loadComments() {
    const { data } = await supabase
      .from('task_comments')
      .select('*, author:profiles(id, name, avatar_color)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments((data ?? []) as Comment[])
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
      how_to: howTo || null,
      how_to_attachments: howToAttachments,
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

  async function uploadHowToFile(file: File) {
    setUploadingHowTo(true)
    const ext = file.name.split('.').pop()
    const path = `how-to/${task.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('task-attachments').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(path)
      setHowToAttachments(prev => [...prev, urlData.publicUrl])
    }
    setUploadingHowTo(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
        <input
          ref={titleInputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleInputRef.current?.blur() } }}
          className={cn(
            'flex-1 text-lg font-semibold text-slate-800 bg-transparent outline-none resize-none leading-snug',
            overdue && 'text-red-600'
          )}
          placeholder="Task title"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-5">
        {(['details', 'activity'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'py-2.5 px-1 mr-4 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'details' ? (
          <div className="px-5 py-3">
            {/* Properties */}
            <div className="divide-y divide-slate-50">

              <PropRow icon={<User size={14} />} label="Assignee">
                <AssigneePicker task={task} memberMap={memberMap} projectId={task.project_id} onUpdated={onUpdated} />
              </PropRow>

              <PropRow icon={<Flag size={14} />} label="Priority">
                <select
                  value={priority}
                  onChange={e => { setPriority(e.target.value as typeof priority); setTimeout(save, 0) }}
                  className="text-sm text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 -mx-1"
                >
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </PropRow>

              <PropRow icon={<Calendar size={14} />} label="Due date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => { setDueDate(e.target.value); setTimeout(save, 0) }}
                  className={cn(
                    'text-sm bg-transparent outline-none cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 -mx-1',
                    overdue ? 'text-red-500' : 'text-slate-700'
                  )}
                />
              </PropRow>

              <PropRow icon={<Layers size={14} />} label="Status">
                <select
                  value={sectionId}
                  onChange={e => {
                    const newId = e.target.value
                    setSectionId(newId)
                    const completionSectionId = localStorage.getItem(`taskhi:completion-section:${task.project_id}`) ?? ''
                    if (newId && newId === completionSectionId) setStatus('done')
                    setTimeout(save, 0)
                  }}
                  className="text-sm text-slate-700 bg-transparent outline-none cursor-pointer hover:bg-slate-100 rounded px-1 py-0.5 -mx-1"
                >
                  <option value="">No section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </PropRow>

            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={save}
                placeholder="Add a description…"
                rows={3}
                className="w-full text-sm text-slate-700 bg-slate-50 rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-primary-200 placeholder-slate-400"
              />
            </div>

            {/* How To */}
            <div className="mt-4">
              <button
                onClick={() => setShowHowTo(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 hover:text-slate-600 transition-colors"
              >
                <BookOpen size={12} />
                How To
                <span className="ml-1 text-slate-300">{showHowTo ? '▲' : '▼'}</span>
              </button>
              {showHowTo && (
                <div className="space-y-2">
                  <textarea
                    value={howTo}
                    onChange={e => setHowTo(e.target.value)}
                    onBlur={save}
                    placeholder="Add how-to notes, instructions, or links…"
                    rows={4}
                    className="w-full text-sm text-slate-700 bg-slate-50 rounded-lg p-3 outline-none resize-none focus:ring-2 focus:ring-primary-200 placeholder-slate-400"
                  />
                  {/* Attachments */}
                  <div className="space-y-1.5">
                    {howToAttachments.map((url, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <FileText size={11} className="text-slate-400 shrink-0" />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate flex-1">
                          {url.split('/').pop()}
                        </a>
                        <button
                          onClick={() => { setHowToAttachments(prev => prev.filter((_, j) => j !== i)); setTimeout(save, 0) }}
                          className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => howToFileRef.current?.click()}
                      disabled={uploadingHowTo}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary-600 transition-colors"
                    >
                      <Plus size={11} />
                      {uploadingHowTo ? 'Uploading…' : 'Attach file'}
                    </button>
                    <input
                      ref={howToFileRef}
                      type="file"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadHowToFile(f) }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="px-5 py-3 space-y-4">
            {comments.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0"
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
        )}
      </div>

      {/* Comment box – always visible */}
      <div className="border-t border-slate-100 px-5 py-3 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postComment() }
            }}
            placeholder="Add a comment… (@mention to notify)"
            rows={2}
            className="flex-1 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-primary-200 placeholder-slate-400"
          />
          <button
            onClick={postComment}
            disabled={!newComment.trim() || postingComment}
            className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        {saving && <p className="text-[10px] text-slate-400 mt-1">Saving…</p>}
      </div>
    </div>
  )
}
