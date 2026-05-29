import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { CalendarDays, ChevronDown, RefreshCw, FileText, Check } from 'lucide-react'
import { Task } from '../../types'
import { Button } from '../ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { supabaseUrl, supabaseAnonKey } from '../../lib/supabase'
import { cn } from '../../lib/utils'

interface Props {
  tasks: Task[]
  projectId: string
  projectName: string
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

function formatDateRange(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const yearStr = `, ${end.getFullYear()}`
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}${yearStr}`
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
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  const templateKey = `taskhi:weekly-template:${projectId}`

  useEffect(() => {
    try {
      setTemplate(localStorage.getItem(templateKey) ?? '')
    } catch {}
  }, [projectId])

  function saveTemplate() {
    try {
      localStorage.setItem(templateKey, template)
      setTemplateSaved(true)
      setTimeout(() => setTemplateSaved(false), 2000)
    } catch {}
  }

  const thisWeek = getWeekBounds(0)
  const nextWeek = getWeekBounds(1)

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
    const thisWeekLabel = formatDateRange(thisWeek.start, thisWeek.end)
    const nextWeekLabel = formatDateRange(nextWeek.start, nextWeek.end)

    const formatTask = (t: Task) => {
      const parts = [`- ${t.title}`]
      const meta: string[] = []
      if (t.status !== 'done') meta.push(STATUS_DISPLAY[t.status] ?? t.status)
      if (t.priority && t.priority !== 'medium') meta.push(`Priority: ${t.priority}`)
      if (t.due_date) meta.push(`Due: ${new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`)
      if (meta.length) parts.push(`(${meta.join(', ')})`)
      return parts.join(' ')
    }

    const completedLines = completedThisWeek.length
      ? completedThisWeek.map(formatTask).join('\n')
      : '  (none recorded)'

    const nextWeekLines = scheduledNextWeek.length
      ? scheduledNextWeek.map(formatTask).join('\n')
      : '  (none scheduled)'

    const totalDone = rootTasks.filter(t => t.status === 'done').length
    const totalActive = rootTasks.filter(t => t.status !== 'done').length

    return [
      `Project: ${projectName}`,
      `Report period: ${thisWeekLabel}`,
      '',
      `COMPLETED TASKS THIS WEEK (${thisWeekLabel}):`,
      completedLines,
      '',
      `TASKS SCHEDULED FOR NEXT WEEK (${nextWeekLabel}):`,
      nextWeekLines,
      '',
      `PROJECT TOTALS: ${totalDone} completed, ${totalActive} active`,
    ].join('\n')
  }

  async function generate() {
    setGenerating(true)
    setReview('')
    setError('')

    const context = buildTaskContext()

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
            notes: context,
            templateInstructions: template.trim() || null,
          },
        }),
      })

      if (!response.ok || !response.body) {
        const txt = await response.text()
        setError(txt || 'Failed to generate review')
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
            if (delta) {
              accumulated += delta
              setReview(accumulated)
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <CalendarDays size={20} className="text-primary-500" />
            Weekly Review
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Week of {formatDateRange(thisWeek.start, thisWeek.end)}
          </p>
        </div>
        <Button onClick={generate} loading={generating} disabled={generating} size="md">
          {!generating && <RefreshCw size={14} />}
          {generating ? 'Generating…' : review ? 'Regenerate' : 'Generate Review'}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500 mb-1">Completed this week</p>
          <p className="text-2xl font-bold text-slate-800">{completedThisWeek.length}</p>
          {completedThisWeek.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {completedThisWeek.slice(0, 5).map(t => (
                <li key={t.id} className="text-xs text-slate-600 truncate">• {t.title}</li>
              ))}
              {completedThisWeek.length > 5 && (
                <li className="text-xs text-slate-400">+{completedThisWeek.length - 5} more</li>
              )}
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
              {scheduledNextWeek.length > 5 && (
                <li className="text-xs text-slate-400">+{scheduledNextWeek.length - 5} more</li>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Template section */}
      <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
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
            <p className="text-xs text-slate-500">
              Describe how you want the review formatted — structure, tone, sections to include. Saved locally and reused every time.
            </p>
            <textarea
              className="w-full h-28 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 placeholder:text-slate-400"
              placeholder={'e.g. Start with a 2-sentence summary, then list completed tasks grouped by priority, then list next week\'s tasks with due dates. Keep a professional but concise tone.'}
              value={template}
              onChange={e => { setTemplate(e.target.value); setTemplateSaved(false) }}
            />
            <div className="flex items-center justify-end gap-2">
              {templateSaved && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <Check size={12} /> Saved
                </span>
              )}
              <Button size="sm" variant="secondary" onClick={saveTemplate}>Save Template</Button>
            </div>
          </div>
        )}
      </div>

      {/* Generated review */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {(review || generating) && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="prose prose-sm max-w-none text-slate-700">
            <ReactMarkdown>{review}</ReactMarkdown>
          </div>
          {generating && (
            <span className="inline-block w-1.5 h-4 bg-primary-400 rounded-sm animate-pulse ml-0.5 align-middle" />
          )}
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
    </div>
  )
}
