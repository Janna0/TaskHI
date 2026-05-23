export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAssignee {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  reactions: Record<string, string[]>;
}

export interface ActivityEvent {
  id: string;
  type: 'comment' | 'status_change' | 'assignment' | 'created' | 'field_change';
  authorId: string;
  authorName: string;
  description: string;
  createdAt: string;
  comment?: Comment;
}

export interface Task {
  id: string;
  projectId: string;
  sectionId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignees: TaskAssignee[];
  tags: string[];
  startDate?: string;
  dueDate?: string;
  subtasks: Task[];
  checklists: Checklist[];
  attachmentCount: number;
  commentCount: number;
  position: number;
  parentTaskId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  projectId: string;
  title: string;
  position: number;
  collapsed: boolean;
}
