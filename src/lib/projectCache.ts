import { Project, Section, Task, Profile, ProjectMember } from '../types'

export interface ProjectSnapshot {
  project: Project
  owner: Profile | null
  sections: Section[]
  tasks: Task[]
  members: ProjectMember[]
}

const cache = new Map<string, ProjectSnapshot>()

export const projectCache = {
  get: (id: string): ProjectSnapshot | null => cache.get(id) ?? null,
  set: (id: string, data: ProjectSnapshot) => cache.set(id, data),
  patch: (id: string, updates: Partial<ProjectSnapshot>) => {
    const existing = cache.get(id)
    if (existing) cache.set(id, { ...existing, ...updates })
  },
}
