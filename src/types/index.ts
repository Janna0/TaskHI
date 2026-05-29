export interface PredefinedTask {
  id: string
  title: string
  description: string | null
  instructions: string | null
  time_required: string | null
  competency: string | null
  phase: string | null
  how_to_attachments: string[] | null
  example_attachments: string[] | null
  position: number
  created_at: string
}

export interface Profile {
  id: string
  name: string
  email?: string
  avatar_url: string | null
  avatar_color?: string
  created_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  created_at: string
  profile?: Profile
}

export interface BoardColumnConfig {
  status: string
  name: string
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  icon?: string | null
  owner_id: string
  is_favorite: boolean
  status: 'active' | 'archived'
  board_columns?: BoardColumnConfig[] | null
  created_at: string
  updated_at: string
  task_count?: number
}

export interface Section {
  id: string
  project_id: string
  name: string
  position: number
  created_at: string
}

export interface Task {
  id: string
  project_id: string
  section_id: string | null
  parent_task_id: string | null
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string | null
  due_date: string | null
  created_by: string
  assignee_ids: string[]
  how_to_attachments: string[] | null
  competency: string | null
  time_required: string | null
  phase: string | null
  predefined_task_id: string | null
  position: number
  depth: number
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string | null
  type: 'task_assigned' | 'mention'
  task_id: string | null
  project_id: string | null
  comment_id: string | null
  is_read: boolean
  created_at: string
  actor?: { name: string | null; avatar_color: string | null } | null
  task?: { title: string | null } | null
  project?: { name: string | null; color: string | null } | null
}
