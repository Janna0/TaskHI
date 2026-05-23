import { cn } from '@/lib/utils';
import { TaskStatus, TaskPriority } from '@/types/task';

const STATUS_STYLES: Record<TaskStatus, string> = {
  todo:        'bg-slate-100 text-slate-600 border-slate-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  review:      'bg-violet-50 text-violet-700 border-violet-200',
  blocked:     'bg-red-50 text-red-700 border-red-200',
  done:        'bg-green-50 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review',
  blocked: 'Blocked', done: 'Done',
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: 'bg-[#22c55e]', medium: 'bg-[#f59e0b]',
  high: 'bg-[#ef4444]', urgent: 'bg-[#7c3aed]',
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium border',
      STATUS_STYLES[status], className
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const label = priority.charAt(0).toUpperCase() + priority.slice(1);
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium text-[#475569]', className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[priority])} />
      {label}
    </span>
  );
}
