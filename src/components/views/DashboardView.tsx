import { useMemo, type ReactNode } from 'react'
import { Task, Section } from '../../types'
import { isOverdue, cn } from '../../lib/utils'

interface Props {
  sections: Section[]
  tasks: Task[]
  memberMap: Record<string, { name: string; color: string }>
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm text-slate-500 mb-3">{label}</p>
      <p className={cn('text-[2.6rem] font-semibold leading-none', accent ?? 'text-slate-900')}>
        {value}
      </p>
    </div>
  )
}

// ── Chart Card ─────────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <p className="text-sm font-medium text-slate-700 mb-4">{title}</p>
      {children}
    </div>
  )
}

// ── Bar Chart ──────────────────────────────────────────────────────────────────

function BarChart({ data, color = '#818cf8' }: { data: { label: string; value: number }[], color?: string }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No data</div>
  }

  const maxVal = Math.max(...data.map(d => d.value), 1)
  const chartH = 130
  const barW = 40
  const gap = 28
  const padL = 28   // room for rotated y-axis label
  const padR = 8
  const padTop = 20
  const padBottom = 40
  const innerW = data.length * (barW + gap) - gap
  const totalW = Math.max(innerW + padL + padR, 260)
  const svgH = chartH + padTop + padBottom

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={svgH} style={{ overflow: 'visible' }}>
        {/* Y-axis label */}
        <text
          x={10} y={padTop + chartH / 2}
          textAnchor="middle" fontSize={9} fill="#94a3b8"
          transform={`rotate(-90, 10, ${padTop + chartH / 2})`}
        >
          Task (count, in numbers)
        </text>

        {/* Baseline */}
        <line x1={padL} x2={totalW - padR} y1={padTop + chartH} y2={padTop + chartH} stroke="#e2e8f0" strokeWidth={1} />

        {/* Y gridlines at 0, 25%, 50%, 75% */}
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = padTop + chartH * (1 - pct)
          return <line key={pct} x1={padL} x2={totalW - padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
        })}

        {data.map((d, i) => {
          const x = padL + i * (barW + gap)
          const barH = d.value === 0 ? 0 : Math.max(3, (d.value / maxVal) * chartH)
          const y = padTop + chartH - barH

          return (
            <g key={i}>
              {barH > 0 && <rect x={x} y={y} width={barW} height={barH} fill={color} rx={3} />}
              {/* Value label */}
              <text x={x + barW / 2} y={padTop + chartH - barH - 5} textAnchor="middle" fontSize={10} fill="#64748b">
                {d.value}
              </text>
              {/* X label — truncate if needed */}
              <text x={x + barW / 2} y={padTop + chartH + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Stacked Bar Chart ─────────────────────────────────────────────────────────

function StackedBarChart({ data }: { data: { label: string; completed: number; incomplete: number }[] }) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No assigned tasks</div>
  }

  const maxVal = Math.max(...data.map(d => d.completed + d.incomplete), 1)
  const chartH = 130
  const barW = 40
  const gap = 28
  const padL = 28
  const padR = 8
  const padTop = 20
  const padBottom = 40
  const innerW = data.length * (barW + gap) - gap
  const totalW = Math.max(innerW + padL + padR, 260)
  const svgH = chartH + padTop + padBottom

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={svgH} style={{ overflow: 'visible' }}>
        <text x={10} y={padTop + chartH / 2} textAnchor="middle" fontSize={9} fill="#94a3b8"
          transform={`rotate(-90, 10, ${padTop + chartH / 2})`}>
          Task (count, in numbers)
        </text>
        <line x1={padL} x2={totalW - padR} y1={padTop + chartH} y2={padTop + chartH} stroke="#e2e8f0" strokeWidth={1} />
        {[0.25, 0.5, 0.75, 1].map(pct => {
          const y = padTop + chartH * (1 - pct)
          return <line key={pct} x1={padL} x2={totalW - padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
        })}

        {data.map((d, i) => {
          const x = padL + i * (barW + gap)
          const total = d.completed + d.incomplete
          const totalH = total === 0 ? 0 : Math.max(3, (total / maxVal) * chartH)
          const completedH = total === 0 ? 0 : (d.completed / total) * totalH
          const incompleteH = totalH - completedH
          const baseY = padTop + chartH

          return (
            <g key={i}>
              {/* Incomplete (bottom, lime) */}
              {incompleteH > 0 && (
                <rect x={x} y={baseY - incompleteH} width={barW} height={incompleteH}
                  fill="#bef264" rx={completedH > 0 ? 0 : 3} />
              )}
              {/* Completed (top, purple) */}
              {completedH > 0 && (
                <rect x={x} y={baseY - totalH} width={barW} height={completedH}
                  fill="#818cf8"
                  rx={3}
                  style={{ borderRadius: incompleteH > 0 ? '3px 3px 0 0' : '3px' }}
                />
              )}
              {/* Round bottom corners only when no incomplete segment */}
              {incompleteH === 0 && completedH > 0 && (
                <rect x={x} y={baseY - totalH} width={barW} height={Math.min(4, completedH)}
                  fill="#818cf8" />
              )}
              {/* Total label */}
              <text x={x + barW / 2} y={baseY - totalH - 5} textAnchor="middle" fontSize={10} fill="#64748b">
                {total}
              </text>
              {/* X label */}
              <text x={x + barW / 2} y={baseY + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 pl-6">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-indigo-400 inline-block" /> Completed
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-lime-300 inline-block" /> Incomplete
        </div>
      </div>
    </div>
  )
}

// ── Donut Chart ────────────────────────────────────────────────────────────────

function DonutChart({ completed, incomplete, total }: { completed: number; incomplete: number; total: number }) {
  const r = 52
  const cx = 85
  const cy = 75
  const C = 2 * Math.PI * r

  if (total === 0) {
    return <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No tasks yet</div>
  }

  const completedFrac = completed / total

  return (
    <div className="flex items-center gap-6 py-2">
      <svg width={170} height={150} style={{ overflow: 'visible', flexShrink: 0 }}>
        {/* Background circle (incomplete — lime) */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#bef264" strokeWidth={26} />
        {/* Completed arc (purple) */}
        {completed > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none" stroke="#818cf8" strokeWidth={26}
            strokeDasharray={`${completedFrac * C} ${C}`}
            transform={`rotate(-90, ${cx}, ${cy})`}
          />
        )}
        {/* Center count */}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize={22} fontWeight="600" fill="#1e293b">
          {total}
        </text>
      </svg>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-indigo-400 shrink-0" />
          <span className="text-slate-500">Completed</span>
          <span className="font-semibold text-slate-700 ml-2">{completed}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full bg-lime-300 shrink-0" />
          <span className="text-slate-500">Incomplete</span>
          <span className="font-semibold text-slate-700 ml-2">{incomplete}</span>
        </div>
      </div>
    </div>
  )
}

// ── Area Chart ─────────────────────────────────────────────────────────────────

function AreaChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.length < 2) {
    return <div className="flex items-center justify-center h-44 text-slate-400 text-sm">Not enough data yet</div>
  }

  const w = 480
  const h = 150
  const padL = 8, padR = 8, padT = 20, padB = 26
  const chartW = w - padL - padR
  const chartH = h - padT - padB
  const maxVal = Math.max(...data.map(d => d.count), 1)

  const pts = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * chartW,
    y: padT + (1 - d.count / maxVal) * chartH,
    ...d,
  }))

  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${pts[0].x},${padT + chartH} L${linePts} L${pts[pts.length - 1].x},${padT + chartH}Z`

  // Label every ~7 points
  const step = Math.max(1, Math.ceil(data.length / 7))
  const labeled = pts.filter((_, i) => i % step === 0 || i === pts.length - 1)

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} style={{ overflow: 'visible' }}>
        <path d={areaPath} fill="#818cf8" fillOpacity={0.15} />
        <polyline points={linePts} fill="none" stroke="#818cf8" strokeWidth={2} strokeLinejoin="round" />

        {/* Baseline */}
        <line x1={padL} x2={padL + chartW} y1={padT + chartH} y2={padT + chartH} stroke="#e2e8f0" strokeWidth={1} />

        {labeled.map((p, i) => (
          <g key={i}>
            <text x={p.x} y={p.y - 5} textAnchor="middle" fontSize={9} fill="#64748b">{p.count}</text>
            <text x={p.x} y={h - padB + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function DashboardView({ sections, tasks: allTasks, memberMap }: Props) {
  const tasks = allTasks.filter(t => !t.parent_task_id)

  const completedCount  = tasks.filter(t => t.status === 'done').length
  const incompleteCount = tasks.filter(t => t.status !== 'done').length
  const overdueCount    = tasks.filter(t => t.status !== 'done' && t.due_date && isOverdue(t.due_date)).length
  const totalCount      = tasks.length

  const bySection = sections.map(s => ({
    label: s.name,
    value: tasks.filter(t => t.section_id === s.id).length,
  }))

  const assigneeCounts: Record<string, { completed: number; incomplete: number }> = {}
  for (const t of tasks) {
    if (!t.assignee_ids?.length) continue
    for (const aid of t.assignee_ids) {
      if (!assigneeCounts[aid]) assigneeCounts[aid] = { completed: 0, incomplete: 0 }
      if (t.status === 'done') assigneeCounts[aid].completed++
      else assigneeCounts[aid].incomplete++
    }
  }
  const byAssignee = Object.entries(assigneeCounts)
    .map(([id, v]) => ({ label: memberMap[id]?.name?.split(' ')[0] ?? 'User', ...v }))
    .sort((a, b) => (b.completed + b.incomplete) - (a.completed + a.incomplete))
    .slice(0, 8)

  const overTime = useMemo(() => {
    if (tasks.length === 0) return []
    const sorted = [...tasks].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const start = new Date(sorted[0].created_at)
    start.setDate(start.getDate() - start.getDay())
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    const result: { label: string; count: number }[] = []
    const cur = new Date(start)
    while (cur <= end) {
      const snap = new Date(cur)
      snap.setDate(snap.getDate() + 7)
      result.push({
        label: `${MONTHS[cur.getMonth()]} ${cur.getDate()}`,
        count: tasks.filter(t => new Date(t.created_at) < snap).length,
      })
      cur.setDate(cur.getDate() + 7)
    }
    return result
  }, [tasks])

  return (
    <div className="p-6 space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total completed tasks" value={completedCount} />
        <StatCard label="Total incomplete tasks" value={incompleteCount} />
        <StatCard label="Total overdue tasks"    value={overdueCount}    accent={overdueCount > 0 ? 'text-red-500' : undefined} />
        <StatCard label="Total tasks"            value={totalCount} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Total tasks by section">
          <BarChart data={bySection} />
        </ChartCard>
        <ChartCard title="Total tasks by completion status">
          <DonutChart completed={completedCount} incomplete={incompleteCount} total={totalCount} />
        </ChartCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tasks by assignee">
          <StackedBarChart data={byAssignee} />
        </ChartCard>
        <ChartCard title="Task creation over time">
          <AreaChart data={overTime} />
        </ChartCard>
      </div>
    </div>
  )
}
