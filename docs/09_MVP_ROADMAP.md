# TaskHI — MVP Roadmap

## Timeline Overview

**Total MVP duration:** 16 weeks  
**Team:** 3 engineers (1 fullstack lead, 1 frontend, 1 backend) + 1 designer  
**Methodology:** 2-week sprints, continuous deployment to staging, production deploy on Sprint completion

```
Week   1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16
       ├──────────────────────────────────────────────┤
Sprint │  S1  │  S2  │  S3  │  S4  │  S5  │  S6  │  S7│
Phase  │Foundation│  Core Loop  │  Collab │ Views│Polish│
```

---

## Phase 0: Pre-Sprint Setup (Week 0)

**Duration:** 3–5 days before Sprint 1  
**Goal:** Zero-to-running infrastructure, team alignment

### Tasks

- [ ] Repository setup (monorepo: `apps/web`, `apps/api`, `packages/shared`)
- [ ] CI/CD pipeline (GitHub Actions → Railway/Vercel)
- [ ] Database provisioning (Neon PostgreSQL)
- [ ] Redis provisioning (Upstash)
- [ ] S3/R2 bucket setup + IAM credentials
- [ ] Environment variable management (Doppler or .env.vault)
- [ ] Design system kickoff in Figma (tokens, component library shell)
- [ ] Database schema v1 (users, workspaces, projects, tasks tables)
- [ ] ESLint + Prettier + Husky pre-commit hooks
- [ ] Shared TypeScript types package

**Deliverable:** "Hello World" API + frontend deployed to staging

---

## Sprint 1 (Weeks 1–2): Foundation — Auth + Shell

**Goal:** Users can register, log in, and see the app shell

### Backend
- [ ] User registration (email + password)
- [ ] Email verification flow
- [ ] Google OAuth integration
- [ ] JWT access token + refresh token rotation
- [ ] Password reset flow (email link)
- [ ] Rate limiting on auth endpoints
- [ ] `GET /auth/me` — current user endpoint

### Frontend
- [ ] App shell layout (sidebar + topnav)
- [ ] Login page
- [ ] Registration page
- [ ] Forgot password page
- [ ] Email verification page
- [ ] Protected route wrapper
- [ ] Auth store (Zustand)
- [ ] React Query setup + API client
- [ ] Basic design tokens (colors, typography, spacing) in Tailwind

### Design
- [ ] Login/register Figma screens (hi-fi)
- [ ] App shell Figma layout (hi-fi)
- [ ] Color palette + typography scale finalized
- [ ] Component library: Button, Input, Badge, Avatar

**Sprint 1 Demo:** User can register with email or Google, receive verification email, log in, see empty app shell with navigation.

---

## Sprint 2 (Weeks 3–4): Projects — CRUD + List

**Goal:** Users can create, view, and manage projects

### Backend
- [ ] Workspace creation on registration
- [ ] `POST /projects` — create project (name, description, color, deadline, privacy)
- [ ] `GET /projects` — list projects with filters (active, archived, favorites)
- [ ] `GET /projects/:id` — project detail
- [ ] `PATCH /projects/:id` — update project
- [ ] `POST /projects/:id/archive` — archive/unarchive
- [ ] `DELETE /projects/:id` — soft delete
- [ ] `POST /projects/:id/favorite` — toggle favorite
- [ ] Project members: add, remove, change role
- [ ] Project tags: create and assign

### Frontend
- [ ] Projects list page (grid + list toggle)
- [ ] Project card component (name, color, progress, deadline, favorite star)
- [ ] Create project modal (step 1: blank vs template; step 2: details; step 3: members)
- [ ] Color picker component
- [ ] Project settings page (edit, archive, delete)
- [ ] Members management page
- [ ] Favorite toggle (optimistic update)
- [ ] Project sidebar (inside a project)
- [ ] Empty state for no projects

### Design
- [ ] Project card (all states: default, hover, favorited)
- [ ] Create project modal (all 3 steps)
- [ ] Project settings page

**Sprint 2 Demo:** User can create, edit, favorite, archive projects. Project list with grid/list view. Members can be invited.

---

## Sprint 3 (Weeks 5–6): Tasks — Core CRUD + List View

**Goal:** Users can create and manage tasks in List View — the core product loop

### Backend
- [ ] Sections: create, update, delete, reorder
- [ ] `POST /projects/:id/tasks` — create task
- [ ] `GET /projects/:id/tasks` — list tasks with filters (status, priority, assignee, due date)
- [ ] `GET /tasks/:id` — task detail
- [ ] `PATCH /tasks/:id` — update any task field
- [ ] `DELETE /tasks/:id` — soft delete
- [ ] Task assignees: assign/unassign users
- [ ] Task tags: assign/remove
- [ ] Task reordering (bulk position update)
- [ ] Activity log entries for all task mutations

### Frontend
- [ ] List view (sections, task rows, inline editing)
- [ ] Column headers (sortable)
- [ ] Status badge (clickable → dropdown)
- [ ] Priority badge (clickable → dropdown)
- [ ] Assignee column (multi-avatar, clickable → member picker)
- [ ] Due date column (clickable → date picker)
- [ ] Section headers (collapsible, editable, draggable)
- [ ] Quick-add task (press Enter on last row)
- [ ] Filter panel (status, priority, assignee, due date, tags)
- [ ] Group-by dropdown (section, status, priority)
- [ ] Sort dropdown

**Sprint 3 Demo:** Full task CRUD in List View. Inline editing of all fields. Sections. Filters.

---

## Sprint 4 (Weeks 7–8): Task Detail Panel + Comments

**Goal:** Rich task details, collaboration foundation

### Backend
- [ ] Task description storage (rich text HTML)
- [ ] Subtasks (parent_task_id relationship, up to 3 levels)
- [ ] Checklists + checklist items (CRUD)
- [ ] Comments: create, edit, delete
- [ ] Comment reactions: add/remove emoji
- [ ] `GET /tasks/:id/activity` — full activity log
- [ ] Mentions: extract @usernames from comment body, create notifications

### Frontend
- [ ] Task detail panel (right-side drawer, slide-in animation)
- [ ] Rich text editor (Tiptap) for description and comments
- [ ] @mention autocomplete in comment composer
- [ ] Subtask list (nested, collapsible, quick-add)
- [ ] Checklist group (with progress bar)
- [ ] Checklist item (checkbox, text, drag to reorder)
- [ ] Attachments section (upload, list, download link)
- [ ] Activity feed (comments + system events interleaved)
- [ ] Comment reactions (emoji picker popover)
- [ ] "Mark Complete" button (with animation)

**Sprint 4 Demo:** Open any task → full detail panel with description, subtasks, checklists, comments, activity. @mention a teammate in a comment.

---

## Sprint 5 (Weeks 9–10): Board View + Notifications

**Goal:** Kanban view + real-time-ish notifications

### Backend
- [ ] Notification creation service (triggered by task mutations, comments, assignments)
- [ ] `GET /notifications` — list (paginated, filtered by type, read status)
- [ ] `PATCH /notifications/:id/read`
- [ ] `POST /notifications/read-all`
- [ ] `GET/PATCH /notifications/preferences`
- [ ] BullMQ notification queue + worker
- [ ] Resend email integration (task assignment, mention, deadline reminder)
- [ ] Deadline reminder cron job

### Frontend
- [ ] Board view (Kanban columns)
- [ ] Task card component (priority border, avatars, due date, subtask count)
- [ ] Drag-and-drop with @dnd-kit (card → column, card within column)
- [ ] Status auto-updates on drop
- [ ] Quick-add card per column
- [ ] Board column collapse
- [ ] Notification bell (count badge)
- [ ] Notification drawer (slide-in, tabs, read/unread)
- [ ] In-app toast for incoming notifications
- [ ] Notification preferences page

**Sprint 5 Demo:** Drag cards between Kanban columns → status updates. Notifications for assignments, mentions, comments appear in-app and via email.

---

## Sprint 6 (Weeks 11–12): Timeline View + Files + Overview

**Goal:** Complete the remaining views

### Backend
- [ ] Files: presign-upload, confirm-upload, list, delete
- [ ] Thumbnail generation worker (images)
- [ ] Presigned download URLs
- [ ] Template CRUD (system templates seeded in DB)
- [ ] `GET /templates` — list templates
- [ ] `POST /templates` — create from project
- [ ] `POST /projects` with `template_id` — create from template

### Frontend
- [ ] Timeline view (Gantt bars, date grid, resize + drag bars)
- [ ] Day/Week/Month granularity toggle
- [ ] Today line
- [ ] Files view (grid + list toggle)
- [ ] File upload (drag-drop zone + button)
- [ ] File preview modal (images + PDF)
- [ ] Download + delete actions
- [ ] Overview page (health card, deadlines, members, activity, files cards)
- [ ] Template gallery modal (browsing + preview)
- [ ] Create project from template (pre-fill sections + tasks)
- [ ] Save project as template

**Sprint 6 Demo:** All 5 views working. Files upload and preview. Create project from template.

---

## Sprint 7 (Weeks 13–14): Dashboard + Search + Polish

**Goal:** Complete the dashboard, global search, and UX polish pass

### Backend
- [ ] Dashboard aggregation endpoint: favorites, my tasks, activity, deadlines
- [ ] `GET /search?q=&type=&limit=` — global full-text search
- [ ] Soft-delete purge cron (30-day)
- [ ] API performance audit + N+1 fixes
- [ ] Security audit (OWASP checklist)

### Frontend
- [ ] Dashboard page (favorites, my tasks, activity, deadlines)
- [ ] My Tasks page (cross-project task list with date grouping)
- [ ] Global search overlay (Cmd+K, spotlight style)
- [ ] Search results grouped by type
- [ ] Recent searches
- [ ] Onboarding wizard (3 steps: workspace, invite, first project)
- [ ] Empty states for all views
- [ ] Keyboard shortcuts (full suite)
- [ ] Responsive layout adjustments (tablet)
- [ ] Loading skeletons for all data surfaces
- [ ] Error boundary + offline banner
- [ ] Animation polish (Framer Motion)
- [ ] User settings (profile, preferences, notifications)

**Sprint 7 Demo:** Full dashboard. Global search works. Complete onboarding. Keyboard shortcuts. Polish.

---

## Weeks 15–16: QA, Beta, Launch Prep

### QA Sprint
- [ ] Full E2E test suite (Playwright): registration → create project → create task → collaborate → close
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Tablet responsive testing
- [ ] Accessibility audit (axe DevTools + screen reader pass)
- [ ] Load testing (k6): 500 concurrent users, p95 < 300ms
- [ ] Security pentest (basic: SQLi, XSS, IDOR, rate limits)
- [ ] Fix all P0/P1 issues

### Beta Launch
- [ ] Invite 20–50 beta users (friends, colleagues, early signups)
- [ ] Feedback collection (Hotjar session recordings + in-app survey)
- [ ] Monitor error rates in Sentry
- [ ] Performance monitoring in Datadog/Grafana

### Launch Prep
- [ ] Landing page (marketing site)
- [ ] Pricing page (Free tier: 3 projects, 10 members; Pro tier: unlimited)
- [ ] Terms of Service + Privacy Policy
- [ ] Help documentation (basic: getting started, creating tasks)
- [ ] Support channel (Intercom or email)
- [ ] Production deployment with full monitoring
- [ ] Status page (statuspage.io)

---

## Post-MVP Backlog (V2 Priorities)

Ordered by estimated impact/effort:

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Slack integration (notifications) | M | High |
| 2 | Calendar view | L | High |
| 3 | Automations (if-this-then-that) | XL | High |
| 4 | Time tracking | L | Medium |
| 5 | Google Drive integration | M | Medium |
| 6 | AI task suggestions | XL | High |
| 7 | Reporting dashboard | L | Medium |
| 8 | Mobile app (React Native) | XL | High |
| 9 | Workload view (per-member capacity) | L | Medium |
| 10 | Guest access (share link, no account) | M | Medium |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Timeline view complexity (Gantt) underestimated | Medium | High | Timebox to 1.5 sprints; cut to basic bars if behind |
| Real-time drag-and-drop on board view conflicts | Low | Medium | Use @dnd-kit (battle-tested); test early in Sprint 5 |
| File upload/storage costs exceed budget | Low | Medium | Cap file size at 50MB; R2 is cheaper than S3 |
| Notification spam (too many emails) | Medium | High | Default email to daily digest; in-app is real-time |
| Team burnout at 16-week pace | Medium | High | No crunch; cut scope (e.g., defer Timeline to V1.1) |
| PostgreSQL full-text search insufficient | Low | Low | Easy Elasticsearch upgrade path if needed |
