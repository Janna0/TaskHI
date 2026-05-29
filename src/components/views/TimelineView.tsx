import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { Task, Section } from '../../types'
import { cn } from '../../lib/utils'

interface Props {
  sections: Section[]
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

type ZoomLevel = 'daily' | 'weekly' | 'monthly' | 'yearly'

const ROW_H = 38
const LABEL_W = 220

const ZOOM_CONFIG: Record<ZoomLevel, { cols: number; colPx: number; label: string }> = {
  daily:   { cols: 30, colPx: 36,  label: 'Daily' },
  weekly:  { cols: 14, colPx: 64,  label: 'Weekly' },
  monthly: { cols: 12, colPx: 80,  label: 'Monthly' },
  yearly:  { cols:  5, colPx: 120, label: 'Yearly' },
}
const ZOOM_LEVELS: ZoomLevel[] = ['daily', 'weekly', 'monthly', 'yearly']

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#f43f5e',
  high:   '#f97316',
  medium: '#6366f1',
  low:    '#94a3b8',
}

const MONTHS      = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December']

function startOfWeek(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}

function anchorForZoom(zoom: ZoomLevel): Date {
  const now = new Date()
  if (zoom === 'daily')   { const d = new Date(now); d.setHours(0,0,0,0); return d }
  if (zoom === 'weekly')  return startOfWeek(now)
  if (zoom === 'monthly') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), 0, 1)
}

function getColumns(anchor: Date, zoom: ZoomLevel): Date[] {
  const { cols } = ZOOM_CONFIG[zoom]
  if (zoom === 'daily')   return Array.from({ length: cols }, (_, i) => addDays(anchor, i))
  if (zoom === 'weekly')  return Array.from({ length: cols }, (_, i) => addDays(anchor, i * 7))
  if (zoom === 'monthly') return Array.from({ length: cols }, (_, i) =>
    new Date(anchor.getFullYear(), anchor.getMonth() + i, 1))
  return Array.from({ length: cols }, (_, i) => new Date(anchor.getFullYear() + i, 0, 1))
}

function colEnd(col: Date, zoom: ZoomLevel): Date {
  if (zoom === 'daily')   return addDays(col, 1)
  if (zoom === 'weekly')  return addDays(col, 7)
  if (zoom === 'monthly') return new Date(col.getFullYear(), col.getMonth() + 1, 1)
  return new Date(col.getFullYear() + 1, 0, 1)
}

function colLabel(d: Date, zoom: ZoomLevel): string {
  if (zoom === 'daily')   return String(d.getDate())
  if (zoom === 'weekly')  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
  if (zoom === 'monthly') return MONTHS[d.getMonth()]
  return String(d.getFullYear())
}

function groupLabel(d: Date, zoom: ZoomLevel): string {
  if (zoom === 'daily' || zoom === 'weekly')
    return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
  if (zoom === 'monthly') return String(d.getFullYear())
  return `${Math.floor(d.getFullYear() / 10) * 10}s`
}

function isCurrentCol(col: Date, next: Date, today: Date, zoom: ZoomLevel): boolean {
  if (zoom === 'daily')   return col.getTime() === today.getTime()
  if (zoom === 'weekly')  return col <= today && today < next
  if (zoom === 'monthly') return col.getMonth() === today.getMonth() && col.getFullYear() === today.getFullYear()
  return col.getFullYear() === today.getFullYear()
}

function navigate(anchor: Date, dir: -1 | 1, zoom: ZoomLevel): Date {
  if (zoom === 'daily')   return addDays(anchor, dir * 30)
  if (zoom === 'weekly')  return addDays(anchor, dir * 28)
  if (zoom === 'monthly') return new Date(anchor.getFullYear(), anchor.getMonth() + dir * 6, 1)
  return new Date(anchor.getFullYear() + dir * 5, 0, 1)
}

export function TimelineView({ sections, tasks: allTasks, onTaskClick }: Props) {
  const tasks = allTasks.filter(t => !t.parent_task_id)
  const [zoom, setZoom] = useState<ZoomLevel>('weekly')
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()))
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  function toggleSection(key: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const { colPx } = ZOOM_CONFIG[zoom]
  const columns = useMemo(() => getColumns(anchor, zoom), [anchor, zoom])
  const windowStart = columns[0]
  const windowEnd   = colEnd(columns[columns.length - 1], zoom)
  const totalPx     = columns.length * colPx
  const totalMs     = windowEnd.getTime() - windowStart.getTime()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayPx  = ((today.getTime() - windowStart.getTime()) / totalMs) * totalPx
  const showToday = todayPx >= 0 && todayPx <= totalPx

  function pxFor(date: Date) {
    return ((date.getTime() - windowStart.getTime()) / totalMs) * totalPx
  }

  function getBar(task: Task): { left: number; width: number } | null {
    if (!task.due_date) return null
    const due     = new Date(task.due_date); due.setHours(0, 0, 0, 0)
    const created = new Date(task.created_at); created.setHours(0, 0, 0, 0)
    const rawStart = created < due ? created : due
    if (due < windowStart || rawStart > windowEnd) return null
    const barStart = rawStart < windowStart ? windowStart : rawStart
    const barEnd   = due > windowEnd ? windowEnd : due
    const left  = Math.max(0, pxFor(barStart))
    const width = Math.max(12, pxFor(barEnd) - left)
    return { left, width }
  }

  // Group header (months / years / decades)
  const groups: { label: string; span: number }[] = []
  for (const col of columns) {
    const lbl = groupLabel(col, zoom)
    if (!groups.length || groups[groups.length - 1].label !== lbl)
      groups.push({ label: lbl, span: 1 })
    else
      groups[groups.length - 1].span++
  }

  const sectionRows = sections.map(s => ({
    section: s,
    tasks: tasks.filter(t => t.section_id === s.id),
  }))
  const unsectioned = tasks.filter(t => !t.section_id)

  const rangeLabel = (() => {
    const a = columns[0], b = columns[columns.length - 1]
    if (zoom === 'yearly')  return `${a.getFullYear()} – ${b.getFullYear()}`
    if (zoom === 'monthly') {
      return a.getFullYear() === b.getFullYear()
        ? String(a.getFullYear())
        : `${a.getFullYear()} – ${b.getFullYear()}`
    }
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${MONTHS_FULL[a.getMonth()]} ${a.getFullYear()}`
    if (a.getFullYear() === b.getFullYear())
      return `${MONTHS[a.getMonth()]} – ${MONTHS[b.getMonth()]} ${a.getFullYear()}`
    return `${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${MONTHS[b.getMonth()]} ${b.getFullYear()}`
  })()

  function GridLines() {
    return (
      <>
        {columns.map((_, i) => (
          <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100"
            style={{ left: (i + 1) * colPx - 1 }} />
        ))}
        {showToday && (
          <div className="absolute top-0 bottom-0 w-px bg-rose-400 z-10 pointer-events-none"
            style={{ left: todayPx }} />
        )}
      </>
    )
  }

  function TaskRow({ task }: { task: Task }) {
    const bar   = getBar(task)
    const color = PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.medium
    const done  = task.status === 'done'
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
            done    ? 'line-through text-slate-400' :
            overdue ? 'text-red-500 font-medium'    : 'text-slate-700')}>
            {task.title}
          </span>
        </div>
        <div className="relative border-b border-slate-100 flex items-center" style={{ width: totalPx }}>
          <GridLines />
          {bar ? (
            <button
              onClick={() => onTaskClick(task)}
              title={task.title}
              className={cn('absolute h-6 rounded-full shadow-sm hover:brightness-110 transition-all', done && 'opacity-50')}
              style={{ left: bar.left, width: bar.width, background: overdue ? '#ef4444' : color }}
            />
          ) : overdue ? (
            <span className="absolute left-2 h-5 px-1.5 rounded-md bg-red-100 text-red-600 text-[10px] font-semibold flex items-center">
              ← Overdue
            </span>
          ) : !task.due_date ? (
            <div
              className="absolute h-1 rounded-full bg-slate-200"
              style={{ left: Math.max(2, pxFor(today)), width: colPx * 0.6 }}
            />
          ) : null}
        </div>
      </div>
    )
  }

  function SectionHeaderRow({ name, sectionKey }: { name: string; sectionKey: string }) {
    const collapsed = collapsedSections.has(sectionKey)
    return (
      <div className="flex" style={{ height: ROW_H }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          className="shrink-0 sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-100 flex items-center gap-1.5 px-3 hover:bg-slate-100 transition-colors w-full text-left"
          style={{ width: LABEL_W }}
        >
          <ChevronDown size={12} className={cn('text-slate-400 transition-transform shrink-0', collapsed && '-rotate-90')} />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{name}</span>
        </button>
        <div className="relative border-b border-slate-100" style={{ width: totalPx }}>
          <GridLines />
          {showToday && (
            <div className="absolute top-0 bottom-0 w-px bg-rose-400/30" style={{ left: todayPx }} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-slate-100 shrink-0 flex-wrap gap-y-1.5">
        <button onClick={() => setAnchor(a => navigate(a, -1, zoom))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => setAnchor(anchorForZoom(zoom))}
          className="text-xs font-semibold text-primary-600 hover:bg-primary-50 px-2.5 py-1 rounded-md transition-colors">
          Today
        </button>
        <button onClick={() => setAnchor(a => navigate(a, 1, zoom))}
          className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors">
          <ChevronRight size={15} />
        </button>
        <span className="text-sm text-slate-500 ml-1">{rangeLabel}</span>

        {/* Zoom selector */}
        <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 mr-3">
          {ZOOM_LEVELS.map(z => (
            <button
              key={z}
              onClick={() => { setZoom(z); setAnchor(anchorForZoom(z)) }}
              className={cn(
                'px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors',
                zoom === z
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {ZOOM_CONFIG[z].label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
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

          {/* Group header row (month / year / decade) */}
          <div className="flex sticky top-0 z-20">
            <div className="shrink-0 sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200"
              style={{ width: LABEL_W, height: 26 }} />
            <div className="flex bg-slate-50 border-b border-slate-200" style={{ width: totalPx, height: 26 }}>
              {groups.map((g, i) => (
                <div key={i} className="border-r border-slate-200 text-[11px] font-semibold text-slate-500 flex items-center px-3 shrink-0"
                  style={{ width: g.span * colPx }}>
                  {g.label}
                </div>
              ))}
            </div>
          </div>

          {/* Column header row (day / week / month / year) */}
          <div className="flex sticky z-20" style={{ top: 26 }}>
            <div className="shrink-0 sticky left-0 z-30 bg-slate-50 border-b border-r border-slate-200 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center px-3"
              style={{ width: LABEL_W, height: 28 }}>
              Task
            </div>
            <div className="flex bg-slate-50 border-b border-slate-200" style={{ width: totalPx, height: 28 }}>
              {columns.map((col, i) => {
                const next = columns[i + 1] ?? colEnd(col, zoom)
                const isCurrent = isCurrentCol(col, next, today, zoom)
                return (
                  <div key={i}
                    className={cn('border-r border-slate-100 text-[10px] flex items-center justify-center shrink-0 overflow-hidden',
                      isCurrent ? 'text-primary-600 font-bold bg-primary-50/60' : 'text-slate-400')}
                    style={{ width: colPx }}>
                    {colLabel(col, zoom)}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sectioned tasks */}
          {sectionRows.map(({ section, tasks: sTasks }) => (
            <div key={section.id}>
              <SectionHeaderRow name={section.name} sectionKey={section.id} />
              {!collapsedSections.has(section.id) && sTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </div>
          ))}

          {/* Unsectioned */}
          {unsectioned.length > 0 && (
            <div>
              {sections.length > 0 && (
                <SectionHeaderRow name="No section" sectionKey="__unsectioned__" />
              )}
              {(!sections.length || !collapsedSections.has('__unsectioned__')) && unsectioned.map(t => <TaskRow key={t.id} task={t} />)}
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
