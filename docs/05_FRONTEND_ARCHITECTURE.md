# TaskHI — Frontend Architecture

## Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR + CSR hybrid; great DX; Vercel-native; excellent routing |
| Language | **TypeScript 5** | Type safety across all boundaries; API contract enforcement |
| Styling | **Tailwind CSS 3** | Utility-first; fast iteration; design-token-friendly |
| Component Library | **shadcn/ui** (Radix primitives) | Accessible, unstyled primitives we fully own |
| State Management | **Zustand** (global) + **React Query (TanStack)** (server state) | Zustand for UI state; React Query for caching/fetching |
| Forms | **React Hook Form** + **Zod** | Performant forms with schema validation |
| Rich Text | **Tiptap** (ProseMirror-based) | Comments, task descriptions — extensible, clean |
| Drag & Drop | **@dnd-kit** | Board view cards + section reordering; accessible |
| Date Handling | **date-fns** | Lightweight, tree-shakeable |
| Animation | **Framer Motion** | Page transitions, drawer slides, card animations |
| Testing | **Vitest** + **Testing Library** + **Playwright** | Unit + integration + E2E |
| Icons | **Lucide React** | Consistent, lightweight SVG icon set |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                   # Route group — no shell
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (app)/                    # Route group — with app shell
│   │   ├── layout.tsx            # App shell (sidebar + topnav)
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx          # Projects list
│   │   │   └── [projectId]/
│   │   │       ├── layout.tsx    # Project sub-nav
│   │   │       ├── overview/page.tsx
│   │   │       ├── list/page.tsx
│   │   │       ├── board/page.tsx
│   │   │       ├── timeline/page.tsx
│   │   │       ├── files/page.tsx
│   │   │       ├── members/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── my-tasks/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/
│   │       ├── profile/page.tsx
│   │       ├── preferences/page.tsx
│   │       └── notifications/page.tsx
│   └── api/                      # Next.js API routes (thin proxies to backend)
│
├── components/
│   ├── ui/                       # shadcn/ui primitives (button, input, dialog…)
│   ├── layout/
│   │   ├── AppShell.tsx          # Sidebar + TopNav wrapper
│   │   ├── Sidebar.tsx
│   │   ├── TopNav.tsx
│   │   └── ProjectSubNav.tsx
│   ├── dashboard/
│   │   ├── FavoritesSection.tsx
│   │   ├── MyTasksPanel.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── DeadlineCard.tsx
│   │   └── ProgressCard.tsx
│   ├── projects/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectList.tsx
│   │   ├── CreateProjectModal.tsx
│   │   └── TemplateGallery.tsx
│   ├── views/
│   │   ├── ListView/
│   │   │   ├── ListView.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   └── ColumnHeader.tsx
│   │   ├── BoardView/
│   │   │   ├── BoardView.tsx
│   │   │   ├── BoardColumn.tsx
│   │   │   └── TaskCard.tsx
│   │   ├── TimelineView/
│   │   │   ├── TimelineView.tsx
│   │   │   ├── TimelineBar.tsx
│   │   │   └── DateGrid.tsx
│   │   ├── OverviewPage/
│   │   │   ├── OverviewPage.tsx
│   │   │   ├── HealthCard.tsx
│   │   │   └── MembersCard.tsx
│   │   └── FilesView/
│   │       ├── FilesView.tsx
│   │       ├── FileGrid.tsx
│   │       └── PreviewModal.tsx
│   ├── tasks/
│   │   ├── TaskDetailPanel.tsx   # Right-side drawer
│   │   ├── TaskProperties.tsx
│   │   ├── SubtaskList.tsx
│   │   ├── ChecklistGroup.tsx
│   │   ├── ActivitySection.tsx
│   │   └── CommentComposer.tsx
│   ├── search/
│   │   └── SearchOverlay.tsx     # Cmd+K spotlight
│   ├── notifications/
│   │   └── NotificationDrawer.tsx
│   └── shared/
│       ├── UserAvatar.tsx
│       ├── PriorityBadge.tsx
│       ├── StatusBadge.tsx
│       ├── DatePicker.tsx
│       ├── MemberSelect.tsx
│       ├── TagSelect.tsx
│       ├── RichTextEditor.tsx    # Tiptap wrapper
│       └── EmptyState.tsx
│
├── hooks/
│   ├── useProject.ts             # React Query hooks for project data
│   ├── useTasks.ts
│   ├── useTaskDetail.ts
│   ├── useMembers.ts
│   ├── useNotifications.ts
│   ├── useSearch.ts
│   ├── useKeyboard.ts            # Global shortcut registrar
│   └── useDragDrop.ts            # DnD state helpers
│
├── stores/
│   ├── authStore.ts              # Current user, session
│   ├── uiStore.ts                # Sidebar open, active panel, modals
│   ├── taskDetailStore.ts        # Which task is open in detail panel
│   └── filterStore.ts            # Active filters per project+view
│
├── lib/
│   ├── api.ts                    # Axios/fetch instance with auth headers
│   ├── queryClient.ts            # React Query client config
│   ├── utils.ts                  # cn(), formatDate(), truncate()
│   ├── constants.ts              # STATUS_OPTIONS, PRIORITY_OPTIONS
│   └── validators/               # Zod schemas
│       ├── project.schema.ts
│       └── task.schema.ts
│
├── types/
│   ├── project.ts
│   ├── task.ts
│   ├── user.ts
│   └── api.ts                    # Generic API response wrappers
│
└── styles/
    ├── globals.css               # Tailwind base + CSS variables
    └── animations.css            # Custom keyframes
```

---

## State Management Strategy

### Server State — React Query (TanStack Query)

All data that comes from the API is managed by React Query:

```typescript
// hooks/useTasks.ts
export function useTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', projectId, filters],
    queryFn: () => api.get(`/projects/${projectId}/tasks`, { params: filters }),
    staleTime: 30_000,           // 30s before background refetch
    gcTime: 5 * 60_000,          // 5min cache
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateTaskDto) => api.patch(`/tasks/${data.id}`, data),
    onMutate: async (data) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshot = queryClient.getQueryData(['tasks', data.projectId]);
      queryClient.setQueryData(['tasks', data.projectId], (old) =>
        old.map(t => t.id === data.id ? { ...t, ...data } : t)
      );
      return { snapshot };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(['tasks'], ctx?.snapshot);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### Client State — Zustand

UI-only state (which drawer is open, sidebar state, active filters):

```typescript
// stores/uiStore.ts
interface UIStore {
  sidebarCollapsed: boolean;
  activeTaskId: string | null;
  taskPanelOpen: boolean;
  notificationDrawerOpen: boolean;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  activeTaskId: null,
  taskPanelOpen: false,
  notificationDrawerOpen: false,
  openTaskDetail: (taskId) => set({ activeTaskId: taskId, taskPanelOpen: true }),
  closeTaskDetail: () => set({ activeTaskId: null, taskPanelOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));
```

---

## Routing Strategy

All app routes are nested under the `(app)` route group which wraps them in the app shell layout. Auth routes are under `(auth)` with no shell.

```typescript
// Route protection in app/layout.tsx
export default async function AppLayout({ children }) {
  const session = await getServerSession();
  if (!session) redirect('/login');
  return <AppShell>{children}</AppShell>;
}
```

**URL structure:**
```
/                         → redirect to /dashboard
/login                    → Login
/register                 → Register
/dashboard                → Dashboard
/projects                 → Projects list
/projects/[id]/overview   → Project overview
/projects/[id]/list       → List view
/projects/[id]/board      → Board view
/projects/[id]/timeline   → Timeline view
/projects/[id]/files      → Files
/projects/[id]/members    → Members
/projects/[id]/settings   → Project settings
/my-tasks                 → My tasks (cross-project)
/notifications            → Notification center
/settings/profile         → Profile settings
/settings/preferences     → Preferences
/settings/notifications   → Notification preferences
```

---

## Performance Strategy

### Code Splitting
- Each route is a separate chunk (Next.js default)
- Heavy components lazy-loaded: RichTextEditor, TimelineView, FilePreviewModal

```typescript
const RichTextEditor = dynamic(() => import('@/components/shared/RichTextEditor'), {
  loading: () => <div className="h-32 animate-pulse bg-muted rounded-md" />,
  ssr: false,
});
```

### Optimistic Updates
All mutations (status change, task create, task complete) update the UI immediately before the API responds. On error, the change is rolled back with a toast.

### Virtualization
Long task lists (> 100 tasks) use `@tanstack/react-virtual` for windowed rendering.

### Image Optimization
File thumbnails served through Next.js `<Image>` with width/height constraints.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + K` | Open global search |
| `C` | Create new task (when in project view) |
| `Esc` | Close modal/panel |
| `?` | Show keyboard shortcuts cheat sheet |
| `G then D` | Go to Dashboard |
| `G then P` | Go to Projects |
| `G then M` | Go to My Tasks |
| `1` | Switch to List view |
| `2` | Switch to Board view |
| `3` | Switch to Timeline view |

---

## Error Handling

```typescript
// Global error boundary
export default function GlobalError({ error, reset }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

- API errors: React Query handles retries (3x with exponential backoff)
- Network offline: `useOnline()` hook shows offline banner
- 404 routes: Custom not-found page
- Auth expiry: 401 response interceptor → redirect to login + save return URL

---

## Testing Strategy

```
Unit tests (Vitest + Testing Library):
  - Individual components in isolation
  - Custom hooks with mock API responses
  - Utility functions (formatters, validators)

Integration tests (Testing Library):
  - Key user flows rendered in full
  - Forms submit and show validation errors
  - Filters update task lists correctly

E2E tests (Playwright):
  - Full user journey: Register → Create Project → Create Task → Change Status
  - Board drag-and-drop
  - File upload
  - Search and navigation
```

Coverage target: 70% unit/integration, key E2E paths covered.
