const key = (userId: string) => `taskhi:favorites:${userId}`

export function loadFavoriteIds(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(key(userId))
    return new Set(raw ? JSON.parse(raw) : [])
  } catch {
    return new Set()
  }
}

export function setFavorite(userId: string, projectId: string, value: boolean): void {
  const ids = loadFavoriteIds(userId)
  if (value) ids.add(projectId)
  else ids.delete(projectId)
  localStorage.setItem(key(userId), JSON.stringify([...ids]))
}

export function withFavorites<T extends { id: string }>(
  projects: T[],
  userId: string
): (T & { is_favorite: boolean })[] {
  const ids = loadFavoriteIds(userId)
  return projects.map(p => ({ ...p, is_favorite: ids.has(p.id) }))
}
