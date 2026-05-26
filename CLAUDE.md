# TaskHI

Develop all changes on branch `main`. This is a Vite + React 18 + TypeScript SPA backed by Supabase. It deploys automatically to GitHub Pages when you push to `main`.

## Stack
- Vite 5 + React 18 + TypeScript
- Tailwind CSS
- Supabase (auth + database)
- @dnd-kit/core + @dnd-kit/sortable for drag-and-drop
- react-router-dom v6 with HashRouter (required for gh-pages)

## Key conventions
- All DB queries go through `src/lib/supabase.ts`
- Types are in `src/types/index.ts`
- Views: `src/components/views/ListView.tsx` and `BoardView.tsx`
- Both views group tasks by `section_id` (not by task `status`)
- When a task moves between sections, its `status` is auto-updated via `sectionNameToStatus()`
- Deploy: push to `main` → CI runs `tsc && vite build` → publishes `./dist` to gh-pages
