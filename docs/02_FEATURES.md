# TaskHI — Full Feature Breakdown

## Feature Map Overview

```
TaskHI
├── Authentication
├── Dashboard
├── Projects
│   ├── Project CRUD
│   ├── Views (List, Board, Timeline, Overview, Files)
│   ├── Members & Roles
│   └── Settings
├── Tasks
│   ├── Task CRUD
│   ├── Subtasks & Checklists
│   ├── Comments & Activity
│   └── File Attachments
├── Templates
├── Search & Filter
├── Notifications
└── User Settings
```

---

## 1. Authentication Module

### 1.1 Registration
- Email + password signup with validation
- Google OAuth one-click signup
- Email verification flow
- Welcome onboarding wizard (workspace name, invite teammates, create first project)

### 1.2 Login
- Email + password login
- Google OAuth login
- "Remember me" option (30-day persistent session)
- Failed login rate limiting (5 attempts → 15-min lockout)

### 1.3 Password Management
- Forgot password → email link (expires in 1 hour)
- Reset password flow
- Password strength indicator on creation
- Change password from settings

### 1.4 Session Management
- JWT access token (15-min expiry) + refresh token (30-day expiry)
- Logout from current device
- Logout from all devices

---

## 2. Dashboard

### 2.1 Favorites Section
- Horizontally scrollable project cards (if > 4 favorites)
- Project name, color/cover, progress bar (% tasks completed)
- Quick-create task button per project card
- Click to navigate directly into project

### 2.2 My Tasks Panel
- Tasks assigned to current user across all projects
- Grouped by: Today, Upcoming, No Date
- Priority badge and status badge visible inline
- Click to open task detail panel (right-side drawer)
- Mark complete directly from dashboard

### 2.3 Activity Feed
- Chronological feed of recent actions across user's projects
- Action types: task created, status changed, comment added, member added, file uploaded
- Each entry links to the relevant project/task
- Paginated, loads 20 entries at a time

### 2.4 Deadline Summary
- Cards for: Overdue, Due Today, Due This Week
- Count badge per card, expandable list
- Quick-jump to task

### 2.5 Progress Summaries
- One card per active (non-archived) project
- Shows: tasks total, tasks completed, % complete, days until deadline
- Color-coded health: Green (on track), Yellow (at risk), Red (overdue)

---

## 3. Project Module

### 3.1 Project List Page (/projects)
- Grid and list view toggle
- Sort by: Name, Last Modified, Deadline, Date Created
- Filter by: Status (Active, Archived), Tags, My Projects, All Projects
- Search bar (client-side filter on project names)
- "New Project" CTA button (top right)

### 3.2 Project Creation
**Step 1 — Choose Start**
- Start from scratch
- Choose from template gallery (5 prebuilt + user-saved templates)

**Step 2 — Project Details**
- Project name (required)
- Description (optional, rich text)
- Color picker (12 presets) or cover image upload
- Tags (create or select existing)
- Deadline (date picker)
- Privacy: Private (only invited members) / Team (all workspace members)

**Step 3 — Add Members**
- Search by name or email
- Select role: Owner (auto), Admin, Member, Viewer
- Skip option (add later)

### 3.3 Project Settings
- Edit all project details
- Transfer ownership
- Manage members (add, remove, change role)
- Archive project (reversible)
- Delete project (permanent after 30 days)
- Export project data (JSON/CSV)

### 3.4 Project Sidebar (inside a project)
```
[Project Name]
─────────────
Overview
List
Board
Timeline
Files
─────────────
Members (count badge)
Settings
```

### 3.5 Roles & Permissions

| Action | Viewer | Member | Admin | Owner |
|---|---|---|---|---|
| View tasks | ✓ | ✓ | ✓ | ✓ |
| Create tasks | ✗ | ✓ | ✓ | ✓ |
| Edit/delete any task | ✗ | ✗ | ✓ | ✓ |
| Manage members | ✗ | ✗ | ✓ | ✓ |
| Edit project settings | ✗ | ✗ | ✓ | ✓ |
| Delete project | ✗ | ✗ | ✗ | ✓ |

---

## 4. Task Module

### 4.1 Task List (inside List View)
- Grouped by Section (default) or by Status/Priority/Assignee
- Columns: Title, Status, Priority, Assignee(s), Due Date, Tags
- Column visibility toggle (show/hide)
- Click any cell to edit inline
- Row hover: quick action buttons (Complete, Assign, Set Due Date)
- Keyboard navigation: Tab between cells, Enter to open detail

### 4.2 Task Creation
**Quick Create (one-click inline):**
- Press Enter at end of any task row
- Type title + Enter = task created with defaults

**Full Create (modal/detail panel):**
- Title (required)
- Status picker
- Priority picker
- Assignee(s) — multi-select from member list
- Start date / Due date (date range picker)
- Tags (multi-select with create-new)
- Description (rich text: bold, italic, links, code, bullets, numbered lists)
- Add to section
- Add subtasks

### 4.3 Task Detail Panel (right-side drawer, full-width option)

**Header**
- Task title (editable)
- Breadcrumb: Project > Section
- Mark Complete button (prominent)
- Three-dot menu: Duplicate, Move to project, Delete

**Properties sidebar**
- Status
- Priority
- Assignee(s)
- Start Date
- Due Date
- Tags
- Created by / Created at

**Body**
- Description (rich text editor)
- Subtasks (collapsible list)
  - Each subtask has its own status, assignee, due date
  - Add subtask inline
- Checklists (collapsible)
  - Named checklist (e.g., "Pre-launch checks")
  - Individual checklist items with checkbox
  - Progress bar: 3/5 completed
- Attachments
  - Drag-and-drop or click to upload
  - Preview thumbnails for images
  - File name, size, uploader, upload date

**Activity Section (bottom)**
- Comment composer (at bottom, always visible)
  - @mention autocomplete
  - Rich text: bold, italic, code, links
  - Emoji picker
  - File attachment in comment
- Activity feed (comments + system events interleaved)
  - Comments: avatar, name, timestamp, message, emoji reactions
  - Events: "Maya changed status to In Progress · 2h ago"

### 4.4 Task Status Workflow

```
To Do → In Progress → Review → Done
         ↑                      ↑
         └──── Blocked ─────────┘
```

Status changes are logged in activity history automatically.

### 4.5 Subtasks
- Up to 3 nesting levels
- Each subtask is a full task record (has its own detail panel)
- Parent task shows completion: "Subtasks: 3/5"
- Parent task auto-completes when all subtasks done (optional setting)

### 4.6 Checklists
- Multiple named checklists per task
- Reorder items via drag-and-drop
- Check/uncheck items
- Delete individual items or entire checklist
- Progress shown as fraction and bar

---

## 5. View Module

### 5.1 List View

**Toolbar**
- Filter button → filter panel (assignee, status, priority, due date, tags)
- Group by dropdown (Section, Status, Priority, Assignee, Due Date)
- Sort by dropdown (Due Date ASC/DESC, Priority, Alphabetical)
- Search within project

**Section Headers**
- Collapsible sections
- Section name editable inline
- Task count per section
- Add task within section button
- Drag entire section to reorder

**Task Rows**
- Fixed columns: Title (flexible width), Status, Priority, Assignee, Due Date
- Resizable columns
- Row striping (subtle alternate background)
- Completed tasks styled with strikethrough and muted colors
- Bulk select (checkbox column appears on hover)
- Bulk actions: change status, change priority, assign, delete, move

### 5.2 Board View (Kanban)

**Columns**
- Default columns map to Status: To Do, In Progress, Review, Done
- Custom columns supported
- Add column button (rightmost)
- Column header: name, task count
- Column color indicator (matches status color)
- Column collapse to slim bar (icon + count)

**Cards**
- Task title (truncated at 2 lines)
- Priority indicator (colored left border)
- Assignee avatar(s) (up to 3, then "+N")
- Due date (red if overdue)
- Subtask count if any
- Comment count if any
- Tag chips (max 2 visible, then "+N")

**Interactions**
- Drag card to different column → status updates automatically
- Drag card within column to reorder
- Click card → opens task detail panel
- Quick-add card at bottom of each column

**Filtering**
- Filter button (same as List View)
- Filtered cards dim non-matching cards (don't hide — reduce clutter anxiety)

### 5.3 Timeline View

**Layout**
- Left panel: task list (collapsible sections)
- Right panel: Gantt bars on a date grid

**Date Grid**
- Toggle: Day / Week / Month granularity
- Today highlighted with vertical line
- Horizontal scroll for future/past dates

**Bars**
- Bar width = task duration (start to due date)
- Bar color = priority color
- Bar label = task name (appears inside bar if wide enough)
- Resize bar ends to change dates
- Drag bar horizontally to shift dates

**Interactions**
- Click bar → opens task detail
- Drag to create a new task on empty row/date
- Milestone markers (zero-duration tasks shown as diamond)

### 5.4 Overview Page

**Layout** — 3-column responsive grid of cards

**Card: Project Health**
- % tasks completed (donut chart)
- Count: total tasks, completed, overdue, in progress

**Card: Upcoming Deadlines**
- Next 7 days of tasks with due dates
- Sorted by date, shows assignee and priority

**Card: Team Members**
- Avatar grid of project members
- Click member → filter views to that member's tasks

**Card: Recent Activity**
- Last 10 activity events
- Same format as dashboard activity feed

**Card: Files**
- Last 5 uploaded files
- Thumbnail or file icon, filename, uploader, date
- "View all files" link

**Card: Key Links / Pinned**
- User-pinnable links or tasks
- Up to 6 pinned items

### 5.5 Files View

**Layout**
- Toolbar: Upload button, Search, View toggle (grid/list)
- Filter: By uploader, date range, file type

**Grid View**
- Thumbnail tiles (image preview or file-type icon)
- File name below
- Uploader avatar + name on hover
- Right-click context menu: Download, Delete, Copy link, Preview

**List View**
- Columns: Name, Uploaded by, Date, Size, Actions
- Sortable columns

**Preview Modal**
- Full-width image preview
- PDF inline viewer
- Download button
- Delete button (owner/admin only)
- Navigation arrows (prev/next file)

---

## 6. Templates

### 6.1 Template Gallery
- Grid of template cards (cover image, name, description, task count)
- Categories: Marketing, Engineering, Operations, Personal
- Preview modal before applying

### 6.2 Built-in Templates

**Marketing Campaign**
```
Sections: Strategy, Creative, Launch, Post-Launch
Tasks: Brief, Audience research, Copy drafts, Design assets,
       Landing page, Email sequence, Social posts, Analytics review
```

**Software Development**
```
Sections: Backlog, Sprint, In Review, Done
Tasks: User story writing, Design specs, Dev implementation,
       Code review, QA testing, Deployment, Retrospective
```

**CRM Implementation**
```
Sections: Discovery, Setup, Migration, Training, Go-Live
Tasks: Requirements gathering, CRM selection, Data mapping,
       Data migration, User training, Go-live checklist
```

**Event Planning**
```
Sections: Pre-Event, Week Of, Day Of, Post-Event
Tasks: Venue booking, Catering, Invites, AV setup,
       Run-of-show doc, On-site checklist, Feedback survey
```

**Content Production**
```
Sections: Ideation, Writing, Editing, Design, Publishing
Tasks: Topic research, Outline, Draft, Review, SEO optimization,
       Visuals, Scheduling, Distribution
```

### 6.3 User Templates
- Save any project as template from Project Settings
- Appears in "My Templates" tab in gallery
- Captures: sections, task titles, task statuses (not assignees or dates)

---

## 7. Search & Filter

### 7.1 Global Search (Cmd/Ctrl+K)
- Spotlight-style overlay
- Search as you type (debounced 200ms)
- Results grouped: Projects, Tasks, Files, Members
- Keyboard navigation (arrow keys, Enter to select)
- Recent searches (last 5) shown before typing
- Esc to dismiss

### 7.2 Project-Level Filter Panel
- Slide-in panel from right
- Filter chips at top of view when active
- Filter options:
  - Assignee: multi-select from member avatars
  - Status: checkbox list
  - Priority: checkbox list
  - Due date: None / Overdue / Today / This Week / This Month / Custom range
  - Tags: multi-select
- "Clear all" button
- Filters persist for session per project per view

---

## 8. Notifications

### 8.1 In-App Notification Center
- Bell icon in top nav with unread count badge (max "99+")
- Drawer opens from right side
- Tabs: All, Unread, Mentions, Assignments
- Each notification: avatar, description, project name, timestamp, link
- Mark individual as read (click)
- Mark all as read button
- Notification settings shortcut

### 8.2 Notification Events
| Trigger | Recipient |
|---|---|
| Assigned to task | Assignee |
| @mentioned in comment | Mentioned user |
| Comment on task | All task assignees + task creator |
| Status changed on your task | Task creator + assignees |
| Deadline in 24h | Task assignees |
| Added to project | New member |
| Task completed | Task creator |

### 8.3 Notification Preferences
- Per-category toggle: In-app / Email / Both / None
- Digest mode: real-time vs daily digest email

---

## 9. User Settings

### 9.1 Profile
- Update name, avatar, job title
- Change email (re-verification required)
- Change password

### 9.2 Preferences
- Theme: Light / Dark / System
- Default view for new projects
- Language (English MVP; i18n-ready)
- Timezone

### 9.3 Notifications
- Per-category notification settings (see above)

### 9.4 Connected Accounts
- Google (link/unlink for OAuth login)
- Future: Slack, GitHub

### 9.5 Danger Zone
- Delete account (soft delete, 30-day grace)
- Export all personal data (GDPR)
