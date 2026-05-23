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
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string | null
  due_date: string | null
  created_by: string
  assignee_ids: string[]
  position: number
  created_at: string
  updated_at: string
}
