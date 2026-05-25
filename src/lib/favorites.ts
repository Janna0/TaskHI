import { supabase } from './supabase'

export async function loadFavoriteIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('user_project_favorites')
    .select('project_id')
    .eq('user_id', userId)
  return new Set(data?.map((r: { project_id: string }) => r.project_id) ?? [])
}

export async function setFavorite(userId: string, projectId: string, value: boolean): Promise<void> {
  if (value) {
    await supabase
      .from('user_project_favorites')
      .upsert({ user_id: userId, project_id: projectId })
  } else {
    await supabase
      .from('user_project_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId)
  }
}

export async function withFavorites<T extends { id: string }>(
  projects: T[],
  userId: string
): Promise<(T & { is_favorite: boolean })[]> {
  const ids = await loadFavoriteIds(userId)
  return projects.map(p => ({ ...p, is_favorite: ids.has(p.id) }))
}
