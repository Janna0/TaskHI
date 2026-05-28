import { STATUS_COLORS, STATUS_LABELS, STATUS_DOT, PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/utils'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-slate-400'}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[priority] ?? 'bg-slate-100 text-slate-600'}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  )
}
