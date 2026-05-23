export type ProjectColor =
  | 'indigo' | 'violet' | 'sky' | 'teal' | 'emerald'
  | 'lime' | 'amber' | 'orange' | 'rose' | 'pink' | 'slate' | 'stone';

export type ProjectRole = 'owner' | 'admin' | 'member' | 'viewer';
export type ProjectPrivacy = 'private' | 'team';

export interface ProjectMember {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: ProjectRole;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: ProjectColor;
  deadline?: string;
  privacy: ProjectPrivacy;
  isFavorite: boolean;
  isArchived: boolean;
  members: ProjectMember[];
  tags: string[];
  taskCount: number;
  completedTaskCount: number;
  createdAt: string;
  updatedAt: string;
}
