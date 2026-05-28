import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Task, Section } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  sections: Section[]
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const WEEKS = 14
const WEEK_PX = 64
const ROW_H = 38
const LABEL_W = 220

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#f43f5e',
  high:   '#f97316',
  medium: '#6366f1',
  low:    '#94a3b8',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function startOfWeek(d: Date) {
  const r = new Date(d)
  r.setDate(r.getDate() - r.getDay())
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function TimelineView({ sections, tasks: allTasks, onTaskClick }: Props) {
  const tasks = allTasks.filter(t => !t.parent_task_id)
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()))

  const weeks = useMemo(
    () => Array.from({ length: WEEKS }, (_, i) => addDays(anchor, i * 7)),
    [anchor]
  )

  const windowStart = weeks[0]
  const windowEnd = addDays(weeks[WEEKS - 1], 7)
  const totalPx = WEEKS * WEEK_PX
  const totalMs = windowEnd.getTime() - windowStart.getTime()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayPx = ((today.getTime() - windowStart.getTime()) / totalMs) * totalPx
  const showToday = todayPx >= 0 && todayPx <= totalPx

  function pxFor(date: Date) {
    return ((date.getTime() - windowStart.getTime()) / totalMs) * totalPx
  }

  function getBar(task: Task): { left: number; width: number } | null {
    if (!task.due_date) return null
    const due = new Date(task.due_date); due.setHours(0, 0, 0, 0)
    const created = new Date(task.created_at); created.setHours(0, 0, 0, 0)
    // Use the earlier of created/due so tasks with a backdated due date still show a bar
    const rawStart = created < due ? created : due
    if (due < windowStart || rawStart > windowEnd) return null
    const barStart = rawStart < windowStart ? windowStart : rawStart
    const barEnd = due > windowEnd ? windowEnd : due
    const left = Math.max(0, pxFor(barStart))
    const width = Math.max(12, pxFor(barEnd) - left)
    return { left, width }
  }

  // Month header groups
  const monthGroups: { label: string; span: number }[] = []
  for (const w of weeks) {
    const label = `${MONTHS[w.getMonth()]} ${w.getFullYear()}`
    if (!monthGroups.length || monthGroups[monthGroups.length - 1].label !== label) {
      monthGroups.push({ label, span: 1 })
    } else {
      monthGroups[monthGroups.length - 1].span++
    }
  }

  const sectionRows = sections.map(s => ({
    section: s,
    tasks: tasks.filter(t => t.section_id === s.id),
  }))
  const unsectioned = tasks.filter(t => !t.section_id)

  function GridLines() {
    return (
      <>
        {weeks.map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100"
            style={{ left: (i + 1) * WEEK_PX - 1 }} />
        ))}
        {showToday && (
          <div className="absolute top-0 bottom-0 w-px bg-rose-400 z-10 pointer-events-none"
            style={{ left: todayPx }} />
        )}
      </>
    )
  }

  function TaskRow({ task }: { task: Task }) {
    const bar = getBar(task)
    const color = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium
    const done = task.status === 'done'
    let dueDate: Date | null = null
    if (task.due_date) { dueDate = new Date(task.due_date); dueDate.setHours(0, 0, 0, 0) }
    const overdue = !done && !!dueDate && dueDate < today

    return (
      <div className="flex" style={{ height: ROW_H }}>
        <div
          onClick={() => onTaskClick(task)}
          className="shrink-0 sticky left-0 z-10 bg-white border-b border-r border-slate-100 flex items-center px-3 cursor-pointer hover:bg-slate-50 transition-colors"
          style={{ width: LABEL_W }}
        >
          <span className={cn('text-sm truncate',
            done ? 'line-through text-slate-400' :
            overdue ? 'text-red-500 font-medium' :
            'text-slate-700')}>
            {task.title}
          </span>
        </div>
        <div className="relative border-b border-slate-100 flex items-center" style={{ width: totalPx }}>
          <GridLines />
          {bar ? (
            <button
              onClick={() => onTaskClick(task)}
              title={task.title}
              className={cn(
                'absolute h-6 rounded-full flex items-center px-2.5 text-[11px] font-medium text-white shadow-sm hover:brightness-110 transition-all overflow-hidden',
                done && 'opacity-50'
              )}
              style={{ left: bar.left, width: bar.width, background: overdue ? '#ef4444' : color }}
            >
              {bar.width > 52 && <span className="truncate">{task.title}</span>}
            </button>
          ) : overdue ? (
            <span className="absolute left-2 h-5 px-1.5 rounded-md bg-red-100 text-red-600 text-[10px] font-semibold flex items-center gap-0.5">
              ← Overdue
            </span>
          ) : !task.due_date ? (
            <div
              className="absolute h-1 rounded-full bg-slate-200"
              style={{ left: Math.max(2, pxFor(today)), width: WEEK_PX * 0.6 }}
            />
          ) : null}
        </div>
      </div>
    )
  }

  function SectionHeaderRow({ name }: { name: string }) {
    return (
      <div className="flex" style={{ height: ROW_H }}>
        <div className="shrink-0 sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-100 flex items-center px-3"
          style={{ width: LABEL_W }}>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{name}</span>
        </div>
        <div className="relative border-b border-slate-100" style={{ width: totalPx }}>
          <GridLines />
          {showToday && (
            <div className="absolute top-0 bottom-0 w-px bg-rose-400/30" style={{ left: todayPx }} />
          )}
        </div>
      </div>
    )
  }

  const rangeLabel = (() => {
    const a = weeks[0], b = weeks[WEEKS - 1]
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`
    if (a.getFullYear() === b.getFullYear())
      return `${MONTHS[a.getMonth()]} – ${MONTHS[b.getMonth()]} ${a.getFullYear()}`
    return `${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
  })()

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 shrink-0">
        <button onClick={() => setAnchor(a => addDays(a, -28))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setAnchor(startOfWeek(new Date()))}
          className="text-xs font-semibold text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded-md transition-colors">
          Today
        </button>
        <button onClick={() => setAnchor(a => addDays(a, 28))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronRight size={15} />
        </button>
        <span className="text-sm text-slate-500 ml-1">{rangeLabel}</span>
        <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400">
          {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
            <span key={p} className="flex items-center gap-1 capitalize">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: c }} />
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: LABEL_W + totalPx }}>

          {/* Month header */}
          <div className="flex sticky top-0 z-20">
            <div className="shrink-0 sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200"
              style={{ width: LABEL_W, height: 26 }} />
            <div className="flex bg-slate-50 border-b border-slate-200" style={{ width: totalPx, height: 26 }}>
              {monthGroups.map((mg, i) => (
                <div key={i} className="border-r border-slate-200 text-[11px] font-semibold text-slate-500 flex items-center px-3 shrink-0"
                  style={{ width: mg.span * WEEK_PX }}>
                  {mg.label}
                </div>
              ))}
            </div>
          </div>

          {/* Week header */}
          <div className="flex sticky z-20" style={{ top: 26 }}>
            <div className="shrink-0 sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center px-3"
              style={{ width: LABEL_W, height: 28 }}>
              Task
            </div>
            <div className="flex bg-slate-50 border-b border-slate-200" style={{ width: totalPx, height: 28 }}>
              {weeks.map((w, i) => {
                const isCurrent = w <= today && today < addDays(w, 7)
                return (
                  <div key={i}
                    className={cn('border-r border-slate-100 text-[10px] flex items-center justify-center shrink-0',
                      isCurrent ? 'text-primary-600 font-bold bg-primary-50/60' : 'text-slate-400')}
                    style={{ width: WEEK_PX }}>
                    {w.getDate()} {MONTHS[w.getMonth()].slice(0, 3)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sectioned tasks */}
          {sectionRows.map(({ section, tasks: sTasks }) => (
            <div key={section.id}>
              <SectionHeaderRow name={section.name} />
              {sTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          ))}

          {/* Unsectioned */}
          {unsectioned.length > 0 && (
            <div>
              {sections.length > 0 && <SectionHeaderRow name="No section" />}
              {unsectioned.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              No tasks to display on the timeline
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
