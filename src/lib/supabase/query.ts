import type { Profile, Project, Section, Task, ProjectMember } from './types';

// Cast Supabase query results to our typed interfaces.
// Use these wrappers instead of raw `.data` to get proper types.

export function asProfile(data: unknown): Profile | null {
  return data as Profile | null;
}

export function asProfiles(data: unknown): Profile[] {
  return (data as Profile[] | null) ?? [];
}

export function asProject(data: unknown): Project | null {
  return data as Project | null;
}

export function asProjects(data: unknown): Project[] {
  return (data as Project[] | null) ?? [];
}

export function asSection(data: unknown): Section | null {
  return data as Section | null;
}

export function asSections(data: unknown): Section[] {
  return (data as Section[] | null) ?? [];
}

export function asTask(data: unknown): Task | null {
  return data as Task | null;
}

export function asTasks(data: unknown): Task[] {
  return (data as Task[] | null) ?? [];
}

export function asMembers(data: unknown): ProjectMember[] {
  return (data as ProjectMember[] | null) ?? [];
}
