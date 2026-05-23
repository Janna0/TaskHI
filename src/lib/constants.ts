import { TaskStatus, TaskPriority } from '@/types/task';

export const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo',        label: 'To Do',       color: '#94a3b8' },
  { value: 'in_progress', label: 'In Progress',  color: '#3b82f6' },
  { value: 'review',      label: 'Review',       color: '#8b5cf6' },
  { value: 'blocked',     label: 'Blocked',      color: '#ef4444' },
  { value: 'done',        label: 'Done',         color: '#22c55e' },
];

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low',    label: 'Low',    color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'urgent', label: 'Urgent', color: '#7c3aed' },
];

export const PROJECT_COLOR_OPTIONS = [
  { value: 'indigo',  hex: '#6366f1', label: 'Indigo'  },
  { value: 'violet',  hex: '#8b5cf6', label: 'Violet'  },
  { value: 'sky',     hex: '#0ea5e9', label: 'Sky'     },
  { value: 'teal',    hex: '#14b8a6', label: 'Teal'    },
  { value: 'emerald', hex: '#10b981', label: 'Emerald' },
  { value: 'lime',    hex: '#84cc16', label: 'Lime'    },
  { value: 'amber',   hex: '#f59e0b', label: 'Amber'   },
  { value: 'orange',  hex: '#f97316', label: 'Orange'  },
  { value: 'rose',    hex: '#f43f5e', label: 'Rose'    },
  { value: 'pink',    hex: '#ec4899', label: 'Pink'    },
  { value: 'slate',   hex: '#64748b', label: 'Slate'   },
  { value: 'stone',   hex: '#78716c', label: 'Stone'   },
];
