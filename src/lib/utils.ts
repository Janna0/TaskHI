export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
}

export const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-violet-100 text-violet-700',
  blocked: 'bg-red-100 text-red-700',
  done: 'bg-green-100 text-green-700',
}

export const STATUS_DOT: Record<string, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  review: 'bg-violet-500',
  blocked: 'bg-red-500',
  done: 'bg-green-500',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  urgent: 'bg-purple-100 text-purple-700',
}

export const PRIORITY_BORDER: Record<string, string> = {
  low: 'border-l-green-400',
  medium: 'border-l-amber-400',
  high: 'border-l-red-400',
  urgent: 'border-l-purple-500',
}

export const PROJECT_COLORS = [
  '#9CA3AF', '#F87171', '#FB923C', '#FBBF24', '#EAB308', '#A3E635', '#34D399',
  '#22D3EE', '#818CF8', '#8B5CF6', '#C084FC', '#E879F9', '#F472B6', '#6B7280',
]

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || '?'
}
