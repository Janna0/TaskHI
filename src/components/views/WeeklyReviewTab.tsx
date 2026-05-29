import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import { CalendarDays, ChevronDown, RefreshCw, FileText, Check, Pencil, Eye, Save, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
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

// ── date helpers ──────────────────────────────────────────────────────────────

function getCurrentMonday(): Date {
  const now = new Date()
  const dow = now.getDay()
  const d = new Date(now)
  d.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  return d
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

function weekBounds(monday: Date): { start: Date; end: Date } {
  const start = new Date(monday); start.setHours(0, 0, 0, 0)
  const end = new Date(monday); end.setDate(monday.getDate() + 6); end.setHours(23, 59, 59, 999)
  return { start, end }
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10) }

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`
}

function weekStartToRange(weekStart: string): string {
  const monday = new Date(weekStart + 'T00:00:00')
  return formatDateRange(monday, addWeeks(monday, 1))
}

function getMonthWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const start = new Date(first)
  const sd = start.getDay(); start.setDate(first.getDate() - (sd === 0 ? 6 : sd - 1))
  const end = new Date(last)
  const ed = end.getDay(); if (ed !== 0) end.setDate(last.getDate() + (7 - ed))
  const weeks: Date[][] = []
  const cur = new Date(start)
  while (cur <= end) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
    weeks.push(week)
  }
  return weeks
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su']

const STATUS_DISPLAY: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'In Review', blocked: 'Blocked', done: 'Done',
}

// ── component ─────────────────────────────────────────────────────────────────

export function WeeklyReviewTab({ tasks, projectId, projectName }: Props) {
  const { user } = useAuth()

  // Week navigation
  const [selectedMonday, setSelectedMonday] = useState<Date>(getCurrentMonday)
  const [showCalendar, setShowCalendar] = useState(false)
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const calendarRef = useRef<HTMLDivElement>(null)

  // Template
  const [template, setTemplate] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateSaved, setTemplateSaved] = useState(false)

  // Review
  const [review, setReview] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState('')

  // All saved reviews
  const [allReviews, setAllReviews] = useState<SavedReview[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pastOpen, setPastOpen] = useState(false)
  const [taskComments, setTaskComments] = useState<Record<string, string[]>>({})

  const templateKey = `taskhi:weekly-template:${projectId}`
  const thisWeek = weekBounds(selectedMonday)
  const nextWeek = weekBounds(addWeeks(selectedMonday, 1))
  const thisWeekStr = toDateStr(selectedMonday)
  const currentMonday = getCurrentMonday()
  const isCurrentWeek = thisWeekStr === toDateStr(currentMonday)

  // Load template + reviews on mount
  useEffect(() => {
    try { setTemplate(localStorage.getItem(templateKey) ?? '') } catch {}
    loadReviews()
  }, [projectId])

  // When selected week or reviews change, load that week's saved content
  useEffect(() => {
    const found = allReviews.find(r => r.week_start === thisWeekStr)
    setReview(found?.content ?? '')
    setSavedContent(found?.content ?? '')
    setSavedReviewId(found?.id ?? null)
    setEditMode(false)
    setError('')
  }, [selectedMonday, allReviews])

  // Close calendar on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node))
        setShowCalendar(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function loadReviews() {
    const { data } = await supabase.from('weekly_reviews').select('*').eq('project_id', projectId).order('week_start', { ascending: false })
    if (data) setAllReviews(data)
  }

  function saveTemplate() {
    try { localStorage.setItem(templateKey, template); setTemplateSaved(true); setTimeout(() => setTemplateSaved(false), 2000) } catch {}
  }

  function openCalendar() {
    setCalYear(selectedMonday.getFullYear())
    setCalMonth(selectedMonday.getMonth())
    setShowCalendar(true)
  }

  function selectWeek(monday: Date) {
    setSelectedMonday(monday)
    setShowCalendar(false)
  }

  function prevCalMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1)
  }
  function nextCalMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1)
  }

  // Task data for selected week
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

  function buildTaskContext(comments: Record<string, string[]>) {
    const formatTask = (t: Task) => {
      const meta: string[] = []
      if (t.status !== 'done') meta.push(STATUS_DISPLAY[t.status] ?? t.status)
      if (t.priority && t.priority !== 'medium') meta.push(`Priority: ${t.priority}`)
      if (t.due_date) meta.push(`Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      const lines = [`- ${t.title}${meta.length ? ` (${meta.join(', ')})` : ''}`]
      if (t.notes?.trim()) lines.push(`  Description: ${t.notes.trim().replace(/\n+/g, ' ').slice(0, 300)}`)
      const tc = comments[t.id]
      if (tc?.length) { lines.push(`  Comments:`); tc.forEach(c => lines.push(`    • ${c.replace(/\n+/g, ' ').slice(0, 200)}`)) }
      return lines.join('\n')
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
    setGenerating(true); setReview(''); setError('')
    const relevantIds = [...completedThisWeek, ...scheduledNextWeek].map(t => t.id)
    let comments: Record<string, string[]> = {}
    if (relevantIds.length > 0) {
      const { data: rows } = await supabase.from('task_comments').select('task_id, content').in('task_id', relevantIds).order('created_at')
      if (rows) {
        for (const row of rows) {
          if (!comments[row.task_id]) comments[row.task_id] = []
          comments[row.task_id].push(row.content)
        }
        setTaskComments(comments)
      }
    }
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/ask-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Generate my weekly review.' }],
          taskContext: {
            title: 'Weekly Review',
            notes: buildTaskContext(comments),
            templateInstructions: (template.trim() || '') + '\n\nIMPORTANT: Write in plain text only. Do NOT use markdown formatting — no ** bold **, no ## headings, no bullet dashes. Use regular paragraphs and line breaks.',
          },
        }),
      })
      if (!response.ok || !response.body) { setError((await response.text()) || 'Failed to generate review'); return }
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let accumulated = ''; let lineBuffer = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        lineBuffer += decoder.decode(value, { stream: true })
        const lines = lineBuffer.split('\n'); lineBuffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim(); if (data === '[DONE]') continue
          try { const delta = JSON.parse(data).choices?.[0]?.delta?.content ?? ''; if (delta) { accumulated += delta; setReview(accumulated) } } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally { setGenerating(false) }
  }

  async function saveReview() {
    if (!review.trim() || !user) return
    setSaving(true); setError('')
    const payload = { project_id: projectId, week_start: thisWeekStr, content: review.trim(), created_by: user.id, updated_at: new Date().toISOString() }
    let err, newId = savedReviewId
    if (savedReviewId) {
      const res = await supabase.from('weekly_reviews').update(payload).eq('id', savedReviewId); err = res.error
    } else {
      const res = await supabase.from('weekly_reviews').insert(payload).select().single(); err = res.error; if (!err && res.data) newId = res.data.id
    }
    setSaving(false)
    if (err) { setError(err.message.includes('weekly_reviews') ? 'Table not found. Run the SQL migration first.' : err.message); return }
    setSavedReviewId(newId); setSavedContent(review.trim()); setEditMode(false); setSaveDone(true)
    setTimeout(() => setSaveDone(false), 2500)
    loadReviews()
  }

  const isDirty = review.trim() !== savedContent.trim()
  const pastReviews = allReviews.filter(r => r.week_start !== thisWeekStr)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-primary-500" />
            Weekly Review
          </h2>

          {/* Week navigator */}
          <div className="flex items-center gap-1 mt-1.5">
            <button
              onClick={() => setSelectedMonday(m => addWeeks(m, -1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Previous week"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Clickable date → calendar */}
            <div className="relative" ref={calendarRef}>
              <button
                onClick={openCalendar}
                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-primary-600 transition-colors px-1 py-0.5 rounded hover:bg-slate-100"
              >
                <span>Week of {formatDateRange(thisWeek.start, thisWeek.end)}</span>
                <ChevronDown size={13} className={cn('transition-transform text-slate-400', showCalendar && 'rotate-180')} />
              </button>

              {showCalendar && (
                <div className="absolute top-full left-0 z-50 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-72">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button onClick={prevCalMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronLeft size={14} /></button>
                    <span className="text-sm font-medium text-slate-700">{MONTH_NAMES[calMonth]} {calYear}</span>
                    <button onClick={nextCalMonth} className="p-1 rounded hover:bg-slate-100 text-slate-500"><ChevronRight size={14} /></button>
                  </div>

                  {/* Day labels */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_LABELS.map(d => (
                      <div key={d} className="text-center text-xs text-slate-400 font-medium py-0.5">{d}</div>
                    ))}
                  </div>

                  {/* Week rows */}
                  {getMonthWeeks(calYear, calMonth).map((week, wi) => {
                    const mon = week[0]
                    const monStr = toDateStr(mon)
                    const isSelected = monStr === thisWeekStr
                    const isCurrent = monStr === toDateStr(currentMonday)
                    const hasSaved = allReviews.some(r => r.week_start === monStr)
                    return (
                      <div
                        key={wi}
                        onClick={() => selectWeek(mon)}
                        className={cn(
                          'grid grid-cols-7 rounded-lg cursor-pointer transition-colors group',
                          isSelected ? 'bg-primary-500' : 'hover:bg-primary-50'
                        )}
                      >
                        {week.map((day, di) => (
                          <div
                            key={di}
                            className={cn(
                              'text-center text-xs py-1.5 rounded-lg select-none',
                              isSelected ? 'text-white font-medium' : day.getMonth() !== calMonth ? 'text-slate-300' : 'text-slate-700',
                              isCurrent && !isSelected && di === 0 && 'font-bold'
                            )}
                          >
                            {day.getDate()}
                          </div>
                        ))}
                        {hasSaved && !isSelected && (
                          <div className="col-span-7 flex justify-center -mt-1 mb-0.5">
                            <span className="w-1 h-1 rounded-full bg-primary-300 inline-block" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Jump to today */}
                  {!isCurrentWeek && (
                    <button
                      onClick={() => { selectWeek(currentMonday) }}
                      className="mt-2 w-full text-xs text-center text-primary-600 hover:text-primary-700 py-1 rounded hover:bg-primary-50 transition-colors"
                    >
                      Back to current week
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedMonday(m => addWeeks(m, 1))}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Next week"
            >
              <ChevronRight size={16} />
            </button>

            {!isCurrentWeek && (
              <button
                onClick={() => setSelectedMonday(currentMonday)}
                className="ml-1 text-xs text-primary-600 hover:text-primary-700 px-2 py-0.5 rounded-full bg-primary-50 hover:bg-primary-100 transition-colors"
              >
                Today
              </button>
            )}
          </div>
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
              {completedThisWeek.slice(0, 5).map(t => <li key={t.id} className="text-xs text-slate-600 truncate">• {t.title}</li>)}
              {completedThisWeek.length > 5 && <li className="text-xs text-slate-400">+{completedThisWeek.length - 5} more</li>}
            </ul>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Scheduled next week</p>
          <p className="text-2xl font-bold text-slate-800">{scheduledNextWeek.length}</p>
          {scheduledNextWeek.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {scheduledNextWeek.slice(0, 5).map(t => <li key={t.id} className="text-xs text-slate-600 truncate">• {t.title}</li>)}
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

      {/* Error */}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Review area */}
      {(review || generating) && !error && (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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
          <div className="p-5">
            {editMode ? (
              <textarea
                className="w-full min-h-64 text-sm text-slate-700 leading-relaxed resize-y focus:outline-none"
                value={review}
                onChange={e => setReview(e.target.value)}
                autoFocus
              />
            ) : (
              <>
                <div className="prose prose-sm max-w-none text-slate-700">
                  <ReactMarkdown>{review}</ReactMarkdown>
                </div>
                {generating && <span className="inline-block w-1.5 h-4 bg-primary-400 rounded-sm animate-pulse ml-0.5 align-middle" />}
              </>
            )}
          </div>
        </div>
      )}

      {!review && !generating && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <CalendarDays size={36} className="mb-3 opacity-30" />
          {savedReviewId === null ? (
            <>
              <p className="text-sm">Click "Generate Review" to create your weekly summary</p>
              <p className="text-xs mt-1 opacity-70">{completedThisWeek.length} task{completedThisWeek.length !== 1 ? 's' : ''} completed · {scheduledNextWeek.length} scheduled next week</p>
            </>
          ) : (
            <p className="text-sm">No review saved for this week yet</p>
          )}
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
