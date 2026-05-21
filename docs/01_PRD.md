# TaskHI — Product Requirements Document (PRD)

## 1. Executive Summary

TaskHI is a modern, cloud-based project and task management platform designed for teams of all sizes. It combines the clean aesthetics of Linear with the flexibility of ClickUp, delivering a lightweight, fast, and intuitive experience that makes project collaboration feel effortless rather than overhead.

**Vision:** Make team coordination feel as natural as a conversation.

**Mission:** Deliver a project management tool so intuitive that teams adopt it without training, and so powerful that they never need another tool.

---

## 2. Problem Statement

Existing project management tools fall into two failure modes:

| Problem | Examples |
|---|---|
| Too simple — teams outgrow them fast | Trello, Basecamp |
| Too complex — steep learning curves, low adoption | Jira, Monday.com (advanced) |

Teams need a product that starts simple, scales with them, and never becomes a burden to maintain.

---

## 3. Target Users

### Primary Personas

**Persona 1 — The Team Lead (Alex, 34)**
- Manages 3–8 people across multiple projects
- Needs a bird's-eye view of all work and deadlines
- Frustrated by status meetings; wants async visibility
- Values: clarity, speed, no noise

**Persona 2 — The Individual Contributor (Maya, 27)**
- Works on 2–4 projects simultaneously
- Needs to know exactly what she owns today
- Frustrated by unclear priorities and missed context
- Values: focused task lists, quick updates, clean UI

**Persona 3 — The Stakeholder (James, 45)**
- Rarely logs in but needs high-level progress views
- Needs project health at a glance
- Values: dashboards, summaries, no digging around

### Secondary Personas
- Freelancers managing client projects
- Small agencies coordinating deliverables
- Remote-first teams needing async collaboration

---

## 4. Goals & Success Metrics

### Business Goals
- Reach 10,000 MAU within 12 months of launch
- Achieve 40%+ weekly retention at 30 days post-signup
- NPS > 45 within 6 months

### Product Goals

| Goal | Metric | Target |
|---|---|---|
| Fast onboarding | Time to first project created | < 2 minutes |
| Task adoption | % of users creating tasks in first session | > 70% |
| Collaboration | % of tasks with ≥1 comment or assignee | > 50% |
| Retention driver | DAU/MAU ratio | > 35% |

---

## 5. Scope — MVP vs Future

### MVP (Version 1.0)
- Authentication (email/password + Google OAuth)
- Dashboard with favorites, my tasks, deadlines
- Project creation with templates
- List, Board, Timeline, Overview, Files views
- Task CRUD with assignees, due dates, priority, status
- Comments and activity on tasks
- File uploads (task + project level)
- Notifications (in-app)
- Search (projects + tasks)
- Favorites and archiving

### V2 Enhancements
- AI task suggestions and summaries
- Time tracking
- Calendar sync
- Slack and Google Drive integration
- Automations/rules engine

### V3 Future
- Mobile apps (iOS/Android)
- Real-time multiplayer editing
- Advanced reporting and analytics
- Workload management
- Whiteboards

---

## 6. Functional Requirements

### 6.1 Authentication
- FR-AUTH-01: Users can register with email + password
- FR-AUTH-02: Users can log in with Google OAuth
- FR-AUTH-03: Password reset via email link
- FR-AUTH-04: Sessions expire after 30 days of inactivity
- FR-AUTH-05: JWT-based authentication with refresh tokens

### 6.2 Projects
- FR-PROJ-01: Create projects with name, description, color/cover, deadline, tags
- FR-PROJ-02: Edit any project field after creation
- FR-PROJ-03: Delete projects (soft delete, 30-day recovery window)
- FR-PROJ-04: Archive projects (removes from active list, preserves data)
- FR-PROJ-05: Mark projects as favorites (pinned to dashboard)
- FR-PROJ-06: Assign members with roles (Owner, Admin, Member, Viewer)
- FR-PROJ-07: Set projects as Private or Team-visible
- FR-PROJ-08: Duplicate a project
- FR-PROJ-09: Save a project as a template

### 6.3 Tasks
- FR-TASK-01: Create tasks within a project or section
- FR-TASK-02: Edit all task fields inline (title, status, priority, dates, assignees)
- FR-TASK-03: Delete tasks (soft delete)
- FR-TASK-04: Assign multiple users to a task
- FR-TASK-05: Set status: To Do, In Progress, Review, Blocked, Completed
- FR-TASK-06: Set priority: Low, Medium, High, Urgent
- FR-TASK-07: Set start date and due date with date picker
- FR-TASK-08: Add tags/labels
- FR-TASK-09: Add subtasks (nested, up to 3 levels)
- FR-TASK-10: Add checklists with completion tracking
- FR-TASK-11: Attach files directly to tasks
- FR-TASK-12: Add comments with @mention support
- FR-TASK-13: React to comments with emoji
- FR-TASK-14: View full activity timeline on each task

### 6.4 Views
- FR-VIEW-01: List view with sortable, filterable columns
- FR-VIEW-02: Board (Kanban) view with drag-and-drop cards
- FR-VIEW-03: Timeline (Gantt-style) view with date bars
- FR-VIEW-04: Overview page — project summary dashboard
- FR-VIEW-05: Files page — upload, preview, organize
- FR-VIEW-06: View preference persists per-project per-user

### 6.5 Dashboard
- FR-DASH-01: Shows favorite projects prominently
- FR-DASH-02: Shows recently viewed projects
- FR-DASH-03: Shows tasks assigned to current user
- FR-DASH-04: Highlights overdue and upcoming (next 7 days) tasks
- FR-DASH-05: Shows team activity feed
- FR-DASH-06: Shows per-project progress summaries

### 6.6 Templates
- FR-TMPL-01: System-provided templates: Marketing, Software Dev, CRM, Event Planning, Content Production
- FR-TMPL-02: User can create a template from any existing project
- FR-TMPL-03: Templates pre-populate task list, sections, and statuses
- FR-TMPL-04: Templates can be duplicated or deleted

### 6.7 Notifications
- FR-NOTIF-01: In-app notification center (bell icon)
- FR-NOTIF-02: Notify on: task assignment, comment, mention, status change, deadline approaching
- FR-NOTIF-03: Mark all as read
- FR-NOTIF-04: Notification preferences per category (email opt-in)

### 6.8 Search
- FR-SEARCH-01: Global search via keyboard shortcut (Cmd/Ctrl+K)
- FR-SEARCH-02: Search projects, tasks, comments, files, members
- FR-SEARCH-03: Filter results by type
- FR-SEARCH-04: Recent searches persisted locally

### 6.9 Files
- FR-FILE-01: Upload files up to 50MB per file
- FR-FILE-02: Preview images, PDFs in-browser
- FR-FILE-03: Download any file
- FR-FILE-04: See uploader and upload date
- FR-FILE-05: Delete files (owner or admin only)

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Page load < 1.5s on 4G; API responses < 300ms p95 |
| Availability | 99.9% uptime SLA |
| Security | OWASP Top 10 compliance; data encrypted at rest and in transit |
| Scalability | Support 10,000 concurrent users without degradation |
| Accessibility | WCAG 2.1 AA compliance |
| Browser support | Chrome, Firefox, Safari, Edge — latest 2 major versions |
| Data retention | Soft-deleted data retained 30 days before purge |

---

## 8. Constraints

- MVP delivered within 16 weeks
- Small team (3 engineers, 1 designer)
- No native mobile apps in MVP; responsive web only
- Cloud-hosted (no self-hosted option in MVP)

---

## 9. Assumptions

- Users have stable internet connections
- Primary usage on desktop/laptop
- Teams range from 2–50 members for MVP target market
- File storage will use a managed cloud provider (S3-compatible)
