export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      project_members: {
        Row: ProjectMember;
        Insert: Omit<ProjectMember, 'id' | 'created_at'>;
        Update: Partial<Pick<ProjectMember, 'role'>>;
      };
      sections: {
        Row: Section;
        Insert: Omit<Section, 'id' | 'created_at'>;
        Update: Partial<Pick<Section, 'name' | 'position'>>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Task, 'id' | 'created_at'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  name: string | null;
  avatar_url: string | null;
  avatar_color: string | null;
  job_title: string | null;
  timezone: string | null;
  theme: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  color: string;
  status: 'active' | 'archived' | 'completed';
  visibility: 'private' | 'team';
  deadline: string | null;
  is_favorite: boolean;
  board_columns: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  section_id: string | null;
  parent_task_id: string | null;
  creator_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  notes: string | null;
  status: 'todo' | 'in_progress' | 'review' | 'blocked' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date: string | null;
  due_date: string | null;
  position: number;
  depth: number;
  completed_at: string | null;
  assignee_ids: string[] | null;
  created_at: string;
  updated_at: string;
}
