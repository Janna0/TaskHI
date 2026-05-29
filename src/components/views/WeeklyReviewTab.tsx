import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { CalendarDays, ChevronDown, RefreshCw, FileText, Check, Pencil, Eye, Save, Clock } from 'lucide-react'
import { Task } from '../../types'
import { Button } from '../ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { supabase, supabaseUrl, supabaseAnonKey } from '../../lib/supabase'
import { cn } from '../../lib/utils'

interface Props {
  tasks: Task[]
  projectId: string
  projectName: string
}

interface SavedReview {
  id: string
  project_id: string
  week_start: string
  content: string
  created_by: string
  created_at: string
  updated_at: string
}

function getWeekBounds(offsetWeeks = 0): { start: Date; end: Date } {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMon + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

function weekStartToRange(weekStart: string): string {
  const monday = new Date(weekStart + 'T00:00:00')
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return formatDateRange(monday, sunday)
}

const STATUS_DISPLAY: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
}

export function WeeklyReviewTab({ tasks, projectId, projectName }: Props) {
  const { user } = useAuth()

  const [template, setTemplate] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)

  const [review, setReview] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState('')

  const [pastReviews, setPastReviews] = useState<SavedReview[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pastOpen, setPastOpen] = useState(false)

  const templateKey = `taskhi:weekly-template:${projectId}`
  const thisWeek = getWeekBounds(0)
  const nextWeek = getWeekBounds(1)
  const thisWeekStr = toDateStr(thisWeek.start)

  useEffect(() => {
    try { setTemplate(localStorage.getItem(templateKey) ?? '') } catch {}
    loadReviews()
  }, [projectId])

  async function loadReviews() {
    const { data } = await supabase
      .from('weekly_reviews')
      .select('*')
      .eq('project_id', projectId)
      .order('week_start', { ascending: false })
    if (!data) return

    const current = data.find(r => r.week_start === thisWeekStr)
    const past = data.filter(r => r.week_start !== thisWeekStr)

    if (current) {
      setReview(current.content)
      setSavedContent(current.content)
      setSavedReviewId(current.id)
    }
    setPastReviews(past)
  }

  function saveTemplate() {
    try {
      localStorage.setItem(templateKey, template)
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 2000)
    } catch {}
  }

  const rootTasks = tasks.filter(t => !t.parent_task_id)

  const completedThisWeek = rootTasks.filter(t => {
    if (t.status !== 'done') return false
    const updated = new Date(t.updated_at)
    return updated >= thisWeek.start && updated <= thisWeek.end
  })

  const scheduledNextWeek = rootTasks.filter(t => {
    if (t.status === 'done' || !t.due_date) return false
    const due = new Date(t.due_date)
    return due >= nextWeek.start && due <= nextWeek.end
  })

  function buildTaskContext() {
    const formatTask = (t: Task) => {
      const meta: string[] = []
      if (t.status !== 'done') meta.push(STATUS_DISPLAY[t.status] ?? t.status)
      if (t.priority && t.priority !== 'medium') meta.push(`Priority: ${t.priority}`)
      if (t.due_date) meta.push(`Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      return `- ${t.title}${meta.length ? ` (${meta.join(', ')})` : ''}`
    }
    const totalDone = rootTasks.filter(t => t.status === 'done').length
    const totalActive = rootTasks.filter(t => t.status !== 'done').length
    return [
      `Project: ${projectName}`,
      `Report period: ${formatDateRange(thisWeek.start, thisWeek.end)}`,
      '',
      `COMPLETED TASKS THIS WEEK:`,
      completedThisWeek.length ? completedThisWeek.map(formatTask).join('\n') : '  (none recorded)',
      '',
      `TASKS SCHEDULED FOR NEXT WEEK (${formatDateRange(nextWeek.start, nextWeek.end)}):`,
      scheduledNextWeek.length ? scheduledNextWeek.map(formatTask).join('\n') : '  (none scheduled)',
      '',
      `PROJECT TOTALS: ${totalDone} completed, ${totalActive} active`,
    ].join('\n')
  }

  async function generate() {
    setGenerating(true)
    setReview('')
    setError('')
    setSavedContent(savedContent) // keep saved state unchanged

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ask-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate my weekly review.' }],
          taskContext: {
            title: 'Weekly Review',
            notes: buildTaskContext(),
            templateInstructions: template.trim() || null,
          },
        }),
      })

      if (!response.ok || !response.body) {
        setError((await response.text()) || 'Failed to generate review')
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let lineBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n')
        lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''
            if (delta) { accumulated += delta; setReview(accumulated) }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  async function saveReview() {
    if (!review.trim() || !user) return
    setSaving(true)
    setError('')

    const payload = {
      project_id: projectId,
      week_start: thisWeekStr,
      content: review.trim(),
      created_by: user.id,
      updated_at: new Date().toISOString(),
    }

    let err
    if (savedReviewId) {
      const res = await supabase.from('weekly_reviews').update(payload).eq('id', savedReviewId)
      err = res.error
    } else {
      const res = await supabase.from('weekly_reviews').insert(payload).select().single()
      err = res.error
      if (!err && res.data) setSavedReviewId(res.data.id)
    }

    setSaving(false)
    if (err) {
      setError(err.message.includes('weekly_reviews') ? 'Table not found. Run the SQL migration first (see instructions below).' : err.message)
      return
    }

    setSavedContent(review.trim())
    setEditMode(false)
    setSaveDone(true)
    setTimeout(() => setSaveDone(false), 2500)
    loadReviews()
  }

  const isDirty = review.trim() !== savedContent.trim()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-primary-500" />
            Weekly Review
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Week of {formatDateRange(thisWeek.start, thisWeek.end)}</p>
        </div>
        <Button onClick={generate} loading={generating} disabled={generating} size="md">
          {!generating && <RefreshCw size={14} />}
          {generating ? 'Generating…' : review ? 'Regenerate' : 'Generate Review'}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Completed this week</p>
          <p className="text-2xl font-bold text-slate-800">{completedThisWeek.length}</p>
          {completedThisWeek.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {completedThisWeek.slice(0, 5).map(t => (
                <li key={t.id} className="text-xs text-slate-600 truncate">• {t.title}</li>
              ))}
              {completedThisWeek.length > 5 && <li className="text-xs text-slate-400">+{completedThisWeek.length - 5} more</li>}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Scheduled next week</p>
          <p className="text-2xl font-bold text-slate-800">{scheduledNextWeek.length}</p>
          {scheduledNextWeek.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {scheduledNextWeek.slice(0, 5).map(t => (
                <li key={t.id} className="text-xs text-slate-600 truncate">• {t.title}</li>
              ))}
              {scheduledNextWeek.length > 5 && <li className="text-xs text-slate-400">+{scheduledNextWeek.length - 5} more</li>}
            </ul>
          )}
        </div>
      </div>

      {/* Template section */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setTemplateOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText size={14} />
            Review Template
            {template && <span className="text-xs font-normal text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">saved</span>}
          </span>
          <ChevronDown size={14} className={cn('transition-transform text-slate-400', templateOpen && 'rotate-180')} />
        </button>
        {templateOpen && (
          <div className="p-4 space-y-3 border-t border-slate-200">
            <p className="text-xs text-slate-500">Describe how you want the review formatted — structure, tone, sections to include. Saved locally and reused every time.</p>
            <textarea
              className="w-full h-28 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-400"
              placeholder="e.g. Start with a 2-sentence summary, then list completed tasks grouped by priority, then list next week's tasks with due dates. Keep a professional but concise tone."
              value={template}
              onChange={e => { setTemplate(e.target.value); setTemplateSaved(false) }}
            />
            <div className="flex items-center justify-end gap-2">
              {templateSaved && <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Saved</span>}
              <Button size="sm" variant="secondary" onClick={saveTemplate}>Save Template</Button>
            </div>
          </div>
        )}
      </div>

      {/* Current review */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
      )}

      {(review || generating) && !error && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          {/* toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditMode(false)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors', !editMode ? 'bg-white shadow-sm text-slate-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700')}
              >
                <Eye size={12} /> Preview
              </button>
              <button
                onClick={() => setEditMode(true)}
                className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors', editMode ? 'bg-white shadow-sm text-slate-700 border border-slate-200' : 'text-slate-500 hover:text-slate-700')}
              >
                <Pencil size={12} /> Edit
              </button>
            </div>
            <div className="flex items-center gap-2">
              {saveDone && <span className="text-xs text-green-600 flex items-center gap-1"><Check size={12} /> Saved</span>}
              {!generating && review && (
                <Button
                  size="sm"
                  onClick={saveReview}
                  loading={saving}
                  disabled={saving || (!isDirty && !!savedReviewId)}
                  variant={isDirty || !savedReviewId ? 'primary' : 'secondary'}
                >
                  {!saving && <Save size={12} />}
                  {savedReviewId ? (isDirty ? 'Save changes' : 'Saved') : 'Save Review'}
                </Button>
              )}
            </div>
          </div>

          {/* content */}
          <div className="p-5">
            {editMode ? (
              <textarea
                className="w-full min-h-64 text-sm text-slate-700 leading-relaxed resize-y focus:outline-none font-mono"
                value={review}
                onChange={e => setReview(e.target.value)}
                autoFocus
              />
            ) : (
              <>
                <div className="prose prose-sm max-w-none text-slate-700">
                  <ReactMarkdown>{review}</ReactMarkdown>
                </div>
                {generating && (
                  <span className="inline-block w-1.5 h-4 bg-primary-400 rounded-sm animate-pulse ml-0.5 align-middle" />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!review && !generating && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarDays size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Click "Generate Review" to create your weekly summary</p>
          <p className="text-xs mt-1 opacity-70">
            {completedThisWeek.length} task{completedThisWeek.length !== 1 ? 's' : ''} completed · {scheduledNextWeek.length} scheduled next week
          </p>
        </div>
      )}

      {/* Past reviews */}
      {pastReviews.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setPastOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock size={14} />
              Past Reviews
              <span className="text-xs font-normal text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded-full">{pastReviews.length}</span>
            </span>
            <ChevronDown size={14} className={cn('transition-transform text-slate-400', pastOpen && 'rotate-180')} />
          </button>
          {pastOpen && (
            <div className="divide-y divide-slate-100 border-t border-slate-200">
              {pastReviews.map(r => (
                <div key={r.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="font-medium text-slate-700">{weekStartToRange(r.week_start)}</span>
                    <ChevronDown size={14} className={cn('transition-transform text-slate-400 shrink-0', expandedId === r.id && 'rotate-180')} />
                  </button>
                  {expandedId === r.id && (
                    <div className="px-5 pb-5 pt-1">
                      <div className="prose prose-sm max-w-none text-slate-700">
                        <ReactMarkdown>{r.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
