# TaskHI — User Flows

## Flow Notation
- **Rectangles** = Screens / Pages
- **Diamonds** = Decisions
- **Arrows** = User actions
- `[action]` = User interaction
- `→` = Navigation

---

## Flow 1: New User Onboarding

```
Landing Page
  [Sign Up]
    ↓
Registration Form (email + password) OR [Continue with Google]
  [Submit]
    ↓
◇ Email signup?
  YES → Email verification sent → [Click email link]
  NO  → Google OAuth callback
    ↓
Onboarding Step 1: Name Your Workspace
  [Enter workspace name] → [Next]
    ↓
Onboarding Step 2: Invite Teammates
  [Enter email addresses OR Skip]
    ↓
Onboarding Step 3: Create First Project
  [Enter project name OR Use template] → [Create]
    ↓
Project created → Land in List View (empty state with hint)
    ↓
[Dismiss onboarding banner]
    ↓
Normal App State
```

**Empty States with Hints:**
- List View empty: "Add your first task → press Enter or click '+ Add Task'"
- Board View empty: "Drag tasks here or click '+ Add Task' in any column"

---

## Flow 2: Creating a Project from Template

```
Dashboard OR Projects Page
  [+ New Project]
    ↓
Project Creation Modal — Step 1: Choose Start
  [Choose from template] → Template Gallery modal
    ↓
Template Gallery
  [Browse/search templates]
  [Click template card] → Template Preview modal
    ↓
Template Preview
  Shows: sections, task structure, description
  [Use this template] OR [Back]
    ↓
Step 2: Project Details (pre-filled with template name)
  [Edit name, description, color, tags, deadline, privacy]
  [Next]
    ↓
Step 3: Add Members
  [Search + select members] OR [Skip]
  [Create Project]
    ↓
Project created with template structure
  → Land on Overview page
  → Toast: "Project created from [Template Name]"
```

---

## Flow 3: Task Creation (Full Detail)

```
Inside Project — Any View
  [+ Add Task] OR [Press Enter on last task row (List View)]
    ↓
◇ Quick create or full create?

QUICK CREATE (inline):
  Type task title → [Enter]
  Task created with defaults (status: To Do, no assignee/date)

FULL CREATE (modal):
  Task Detail Panel opens (empty, right-side drawer)
  [Enter title] (required)
  [Set status] from dropdown
  [Set priority] from dropdown
  [Assign members] — type name, select from dropdown
  [Set due date] — date picker, optional start date
  [Add tags] — type to search/create
  [Write description] — rich text
  [Add subtasks] — press Enter in subtask field
  [Add checklist] — "Add checklist" link
  [Attach files] — drag-drop or file picker
  [Click outside OR X button to close]
    ↓
Task saved (auto-save on each field blur)
Task appears in view immediately (optimistic UI update)
```

---

## Flow 4: Task Status Update

```
Any View (List, Board, Timeline)

LIST VIEW:
  [Click status badge on task row]
  → Status dropdown appears
  [Select new status]
  → Task row updates immediately
  → Activity logged: "Alex changed status to In Progress"
  → Assignees notified

BOARD VIEW:
  [Drag task card to different column]
  → Card animates to new column
  → Status updates to match column name
  → Activity logged + notification sent

TASK DETAIL PANEL:
  [Click status in properties sidebar]
  → Dropdown appears
  [Select new status]
  → Header badge updates
  → Activity entry added to feed
```

---

## Flow 5: Collaboration — Comment with Mention

```
Task Detail Panel
  [Scroll to Activity section at bottom]
  [Click comment composer]
  [Type "@" to trigger mention autocomplete]
    ↓
Mention Autocomplete Dropdown
  Shows: project members matching typed name
  [Select member]
    ↓
"@Maya Patel" inserted with highlight styling
  [Finish typing comment]
  [Press Ctrl/Cmd+Enter OR click Send]
    ↓
Comment posted:
  - Appears in activity feed immediately
  - Maya receives in-app notification: "Alex mentioned you in 'Design assets'"
  - If Maya has email notifications on: email sent
```

---

## Flow 6: Dashboard → Task Resolution

```
Dashboard
  [View "Overdue" card] → expands or navigates to filtered view
    ↓
Overdue Tasks List
  [Click task name]
    ↓
Task Detail Panel opens (full context)
  [Read description, check comments]
  [Click "Mark Complete" button]
    ↓
Task marked complete:
  - Panel header shows ✓ Completed badge
  - Activity logged: "Alex completed this task"
  - Creator notified
  - Task disappears from "Overdue" section on dashboard
    ↓
[← Back to Dashboard]
Dashboard overdue count decreased by 1
```

---

## Flow 7: Switching Views

```
Inside Project — e.g., List View

Sub-navigation bar (horizontal tabs):
  Overview | List | Board | Timeline | Files

[Click "Board"]
  → URL changes to /projects/{id}/board
  → Board view loads (same tasks, kanban layout)
  → View preference saved for this project

[Click "Timeline"]
  → URL changes to /projects/{id}/timeline
  → Timeline/Gantt loads
  → Tasks with date ranges shown as bars

[Click "Overview"]
  → URL changes to /projects/{id}/overview
  → Summary dashboard loads
```

---

## Flow 8: File Upload to Project

```
Files View (/projects/{id}/files)
  [Click "Upload File" button]
    OR
  [Drag-and-drop file onto drop zone]
    ↓
Upload Progress Indicator
  - Progress bar per file
  - Multiple files: queue shown
  - Cancel option per file
    ↓
Upload Complete:
  - File appears in grid/list immediately
  - Toast: "File uploaded successfully"
  - Activity logged on project: "Alex uploaded 'Design_v3.png'"

PREVIEW:
  [Click file thumbnail/name]
    ↓
Preview Modal
  - Image: full-size render
  - PDF: embedded viewer
  - Other: download prompt
  [Download] [Delete (owner/admin)] [✕ Close]
```

---

## Flow 9: Global Search

```
Anywhere in App
  [Cmd/Ctrl+K]
    ↓
Search Overlay (centered spotlight)
  Shows: Recent searches, Recent projects
  [Start typing]
    ↓
Results appear (debounced 200ms):
  Section: Projects (max 3 shown)
  Section: Tasks (max 5 shown)
  Section: Members (max 3 shown)
  [View all results →] link
    ↓
[Press ↑↓ to navigate, Enter to select]
  OR
[Click result]
    ↓
◇ Result type?
  Project → Navigate to /projects/{id}/overview
  Task → Open task detail panel in context
  Member → Navigate to member profile
    ↓
[Esc] → Dismiss overlay
```

---

## Flow 10: Notifications

```
Any Page — Notification Bell (top nav)
  [Unread count badge visible: "3"]
  [Click bell icon]
    ↓
Notification Drawer slides in from right
  Tab: All | Unread | Mentions | Assignments
  [Click "Unread" tab]
    ↓
List of unread notifications:
  "Maya commented on 'Homepage redesign' · 5m ago"
  "You were assigned to 'Write API docs' · 1h ago"
  "Deadline reminder: 'Q3 Report' due tomorrow · 2h ago"
    ↓
[Click any notification]
  → Notification marked as read
  → Navigate to relevant task or project
    ↓
[Click "Mark all as read"]
  → All notifications marked read
  → Bell badge disappears

[Click ⚙️ Notification Settings]
  → Navigate to /settings/notifications
```

---

## Flow 11: Project Archive / Delete

```
Project Settings Page (/projects/{id}/settings)

ARCHIVE:
  [Click "Archive Project"]
  → Confirmation dialog: "Archive [Project Name]? Members won't be able to add tasks, but all data is preserved."
  [Confirm Archive]
  → Project moves to "Archived" filter in Projects list
  → Project sidebar disappears from main nav
  → Can be unarchived at any time

DELETE:
  [Click "Delete Project"]
  → Confirmation dialog: "This will permanently delete [Project Name] in 30 days. Type the project name to confirm."
  [Type project name exactly]
  [Confirm Delete]
  → Project soft-deleted
  → Toast: "Project scheduled for deletion. You have 30 days to undo this."
  → Appears in "Trash" section (can restore)
  → After 30 days: hard deleted from database
```

---

## Flow 12: Invite Member to Project

```
Project Members Page OR Project Settings > Members

[+ Add Members]
  → Input field appears
  [Type name or email]
    ↓
◇ User exists in workspace?
  YES → Dropdown shows matching users
    [Select user]
    [Assign role: Member / Admin / Viewer]
    [Send invite]
    → User added immediately
    → User notified: "Alex added you to 'Website Redesign'"

  NO → Prompt to invite by email
    [Enter email]
    [Select role]
    [Send invite]
    → Invitation email sent with "Join TaskHI" link
    → Pending member shows in list with "Pending" badge
    → On signup: auto-added to project
```
