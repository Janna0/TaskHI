export interface PredefinedTask {
  id: string
  title: string
  description: string | null
  instructions: string | null
  time_required: string | null
  competency: string | null
  phase: string | null
  how_to_attachments: string[] | null
  position: number
  created_at: string
}

export interface Profile {
  id: string
  name: string | null
  avatar_color: string | null
  email: string | null
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: string
  profile: Profile
}

export interface BoardColumnConfig {
  sectionId: string
  width: number
}

export interface Project {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  board_column_configs: BoardColumnConfig[] | null
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
  read: boolean
  created_at: string
}
