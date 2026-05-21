# TaskHI — UI/UX Structure

## Design Philosophy

**Core Principle:** Calm productivity. The interface should fade into the background and let the work take center stage. Every element earns its place.

**Four UX pillars:**
1. **Speed** — Actions complete in < 100ms perceived time (optimistic UI)
2. **Clarity** — One thing at a time; no competing calls to action
3. **Flexibility** — Power users discover depth; beginners aren't overwhelmed
4. **Delight** — Micro-animations and polish that make the tool feel alive

---

## Application Shell

### Layout Grid
```
┌──────────────────────────────────────────────────────────┐
│  [Logo]  [Search]                    [Notif] [Avatar]    │  ← Top Nav (48px)
├────────┬─────────────────────────────────────────────────┤
│        │                                                  │
│ Side   │              Main Content Area                   │
│  bar   │                                                  │
│(240px) │                                                  │
│        │                                                  │
│        │                                                  │
└────────┴─────────────────────────────────────────────────┘
```

- Sidebar is **collapsible** → collapses to 56px icon-only strip
- Content area is **full height** (100vh - 48px topnav)
- Task detail panel slides in from right, **does not push** content — overlays with backdrop

### Top Navigation Bar (48px)
```
[TaskHI logo]  [⌘K Search...]                   [🔔 3] [Avatar ▾]
```
- Logo: links to Dashboard
- Search: opens search overlay on click or Cmd+K
- Bell: opens notification drawer
- Avatar: opens user dropdown (Profile, Settings, Sign out)

### Sidebar (240px expanded / 56px collapsed)

**Default state (project context):**
```
━━━━━━━━━━━━━━━━━
  🏠  Dashboard
  📁  Projects
  ✓   My Tasks
  📅  Timeline
  📎  Files
  🔔  Notifications
━━━━━━━━━━━━━━━━━
  FAVORITES
  ● Website Redesign
  ● Q3 Campaign
━━━━━━━━━━━━━━━━━
  RECENT PROJECTS
  · API Integration
  · Onboarding Flow
━━━━━━━━━━━━━━━━━
  ⚙   Settings
```

**Inside a project:**
```
━━━━━━━━━━━━━━━━━
  ← All Projects
━━━━━━━━━━━━━━━━━
  [● Project Name]
━━━━━━━━━━━━━━━━━
  Overview
  List
  Board
  Timeline
  Files
━━━━━━━━━━━━━━━━━
  Members (5)
  Settings
━━━━━━━━━━━━━━━━━
```

---

## Screen Designs

### 1. Dashboard

```
┌────────────────────────────────────────────────────────────┐
│ Good morning, Alex 👋                      [+ New Project] │
├────────────────────────────────────────────────────────────┤
│ FAVORITES                                                   │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ ██ Website   │ │ ██ Q3 Camp.  │ │ ██ App Rebr. │        │
│ │ Redesign     │ │              │ │              │        │
│ │ ▓▓▓▓▓░ 60%   │ │ ▓▓░░░░ 40%   │ │ ▓▓▓▓░░ 70%   │        │
│ │ 3 overdue    │ │ 5d left      │ │ On track     │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
├─────────────────────────┬──────────────────────────────────┤
│ MY TASKS                │ TEAM ACTIVITY                    │
│ ─── Today ───           │ Maya commented on "Homepage…"    │
│ □ Write copy draft  🔴  │ 2 min ago                        │
│ □ Review designs    🟡  │                                  │
│ □ Deploy staging    🔵  │ James completed "API docs"       │
│ ─── Upcoming ───        │ 15 min ago                       │
│ □ QA sign-off      🟢  │                                  │
│ □ Client call      🟡  │ Alex added Maya to "Website…"    │
│                         │ 1 hour ago                       │
│         [View All]      │                [Load More]       │
├─────────────────────────┴──────────────────────────────────┤
│ DEADLINES                                                   │
│ 🔴 Overdue (3)   🟡 Today (2)   🟢 This Week (7)           │
└────────────────────────────────────────────────────────────┘
```

**Interaction notes:**
- Favorite project cards are draggable to reorder
- Task rows have a hover state with a complete checkbox on the left
- Activity feed items are links — click navigates directly to context

---

### 2. Projects List

```
┌────────────────────────────────────────────────────────────┐
│ Projects                            [🔍 Search] [+ New]   │
│ [All ▾]  [My Projects]  [Archived]  [⊞ Grid] [☰ List]    │
├────────────────────────────────────────────────────────────┤
│ ┌───────────────────┐  ┌───────────────────┐              │
│ │ ██████ (blue)     │  │ ██████ (purple)   │              │
│ │                   │  │                   │              │
│ │ Website Redesign  │  │ Q3 Campaign       │              │
│ │ Due May 30 · 5 mem│  │ Due Jun 15 · 3 mem│              │
│ │ ▓▓▓▓░░ 60%        │  │ ▓▓░░░░ 33%        │              │
│ │ ★ Favorited       │  │ ☆ Add to favorites│              │
│ └───────────────────┘  └───────────────────┘              │
│                                                            │
│ ┌───────────────────────────────────────────────────────┐  │
│ │  +  New Project                                       │  │
│ └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

### 3. Project — List View

```
┌───────────────────────────────────────────────────────────────┐
│ [Overview] [List ●] [Board] [Timeline] [Files]   [+ Add task] │
│ [Filter ▾] [Group: Section ▾] [Sort: Due Date ▾]             │
├───────────────────────────────────────────────────────────────┤
│ TASK TITLE              STATUS      PRIORITY  ASSIGNEE  DUE   │
├───────────────────────────────────────────────────────────────┤
│ ▾ Design (4 tasks)                                            │
│   □ Create wireframes   ● In Prog.  🔴 High    [MA]   May 22  │
│   □ Design system       ○ To Do     🟡 Med      [JD]   May 25  │
│   □ Prototype v1        ○ To Do     🟢 Low      ---    Jun 1   │
│   □ Review with client  ○ To Do     🟡 Med      [MA]   Jun 3   │
│   + Add task                                                  │
├───────────────────────────────────────────────────────────────┤
│ ▾ Development (3 tasks)                                       │
│   □ Set up repo         ✓ Done      🟡 Med      [AL]   ---    │
│   □ Auth flow           ● In Prog.  🔴 High     [JD]   May 24  │
│   □ Dashboard API       ○ To Do     🔴 High     [AL]   May 28  │
│   + Add task                                                  │
├───────────────────────────────────────────────────────────────┤
│ + Add section                                                 │
└───────────────────────────────────────────────────────────────┘
```

**Inline editing:** Click any cell to edit. Status click → dropdown. Assignee click → member picker popover. Due date click → calendar popover.

---

### 4. Project — Board View

```
┌────────────────────────────────────────────────────────────────┐
│ [Filter ▾]  [Group by Status]                    [+ Add task]  │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│ TO DO (5)    │ IN PROGRESS  │ REVIEW (2)   │ DONE (8)         │
│              │ (3)          │              │                   │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐     │
│ │ Design   │ │ │ Auth flow│ │ │ Wireframe│ │ │ Set up   │     │
│ │ system   │ │ │          │ │ │ review   │ │ │ repo     │     │
│ │ 🟡 Med   │ │ │ 🔴 High  │ │ │ 🟡 Med   │ │ │ ✓        │     │
│ │ [JD]     │ │ │ [JD]     │ │ │ [MA]     │ │ │          │     │
│ │ May 25   │ │ │ May 24   │ │ │ May 22   │ │ └──────────┘     │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │                   │
│              │              │              │                   │
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │                   │
│ │ Prototype│ │ │ Dashboard│ │ │ Client   │ │                   │
│ │ v1       │ │ │ API      │ │ │ call prep│ │                   │
│ │ 🟢 Low   │ │ │ 🔴 High  │ │ │ 🔴 High  │ │                   │
│ │ ---      │ │ │ [AL]     │ │ │ [MA][JD] │ │                   │
│ │ Jun 1    │ │ │ May 28   │ │ │ May 23   │ │                   │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │                   │
│              │              │              │                   │
│ + Add card   │ + Add card   │ + Add card   │ + Add card        │
└──────────────┴──────────────┴──────────────┴───────────────────┘
```

---

### 5. Task Detail Panel

```
                              ┌─────────────────────────────────┐
                              │ ✓ Mark Complete    [···]   [✕]  │
                              │                                  │
                              │ Write homepage copy              │ ← Title (editable)
                              │ Website Redesign > Design        │ ← Breadcrumb
                              ├──────────────┬───────────────────┤
                              │              │ PROPERTIES        │
                              │ Description  │ Status  ● In Prog │
                              │              │ Priority 🔴 High  │
                              │ Describe the │ Assignee [MA][JD] │
                              │ task here…   │ Start    May 15   │
                              │              │ Due      May 22   │
                              │              │ Tags     #copy    │
                              │              │         #website  │
                              ├──────────────┴───────────────────┤
                              │ SUBTASKS  (2/5 completed)        │
                              │ ✓ Research competitor copy       │
                              │ ✓ Write first draft              │
                              │ □ Proofread                      │
                              │ □ Add to CMS                     │
                              │ □ Final review                   │
                              │ + Add subtask                    │
                              ├──────────────────────────────────┤
                              │ CHECKLIST: Pre-publish ████░ 4/5│
                              │ ✓ SEO title written              │
                              │ ✓ Meta description               │
                              │ ✓ Images optimized               │
                              │ ✓ Links verified                 │
                              │ □ CMS preview checked            │
                              ├──────────────────────────────────┤
                              │ ATTACHMENTS (2)                  │
                              │ [📄] brief_v2.pdf  12 KB · MA   │
                              │ [🖼] header_img.png  450 KB · JD│
                              │ + Attach file                    │
                              ├──────────────────────────────────┤
                              │ ACTIVITY                         │
                              │ [MA] Maya · 2h ago               │
                              │ "Looks good! Just a few tweaks"  │
                              │ 👍 2                             │
                              │                                  │
                              │ · Status changed to In Progress  │
                              │   by Alex · 1 day ago            │
                              │                                  │
                              │ [MA] Add a comment… [Ctrl+↵]    │
                              └─────────────────────────────────┘
```

---

### 6. Search Overlay (Cmd+K)

```
              ┌──────────────────────────────────────────┐
              │ 🔍  Search tasks, projects, files…        │
              ├──────────────────────────────────────────┤
              │ RECENT                                    │
              │ ⏱  Website Redesign                      │
              │ ⏱  Write homepage copy                   │
              ├──────────────────────────────────────────┤
              │ PROJECTS  (2)                             │
              │ ●  Website Redesign                       │
              │ ●  Q3 Campaign                            │
              ├──────────────────────────────────────────┤
              │ TASKS  (5)                                │
              │ □  Write homepage copy  · Website Redesign│
              │ □  Copy review session  · Q3 Campaign     │
              │ □  Write API docs       · App Rebranding  │
              │                                           │
              │ View all results for "write" →            │
              └──────────────────────────────────────────┘
```

---

## Micro-interaction Patterns

### Task Completion
1. User clicks complete button or checks checkbox
2. Checkbox animates (spring scale: 1 → 1.3 → 1)
3. Task row gets strikethrough text style (transition: 200ms)
4. Row fades to reduced opacity (transition: 300ms)
5. In Board view, card floats to bottom of Done column

### Status Change (Board Drag)
1. Card lifts (box-shadow increases, slight scale-up: 1.02)
2. Drop target column highlights with border
3. Card drops (spring bounce on landing)
4. Status badge on card updates immediately

### Notification arrival
1. Bell icon pulses (scale animation)
2. Count badge increments with a pop animation
3. Subtle slide-in toast appears (bottom-right): "Maya commented on a task"
4. Toast auto-dismisses after 4s; stays on hover

### Panel open/close
- Task detail panel: slides in from right (300ms ease-out)
- Notification drawer: slides in from right (250ms ease-out)
- Backdrop: fades in (200ms)
- Close: reverse animation

---

## Empty States

Each empty state has an illustration (simple, line-based), a heading, and a CTA.

| Context | Heading | CTA |
|---|---|---|
| No projects | "Your workspace is ready" | Create first project |
| No tasks in section | "No tasks yet" | Add a task |
| No favorites | "Star projects to pin them here" | Go to Projects |
| No search results | "Nothing matched '…'" | Clear search |
| No notifications | "You're all caught up" | — |
| No files | "No files uploaded yet" | Upload file |

---

## Responsive Design

**Breakpoints:**
- Desktop: ≥ 1280px — full sidebar + content
- Tablet: 768–1279px — sidebar collapses to icon strip by default
- Mobile (V2): < 768px — bottom navigation bar; no sidebar

**Adaptive behaviors:**
- Timeline view: minimum viable on tablet; horizontal scroll
- Board view: horizontally scrollable columns on narrower viewports
- Task detail: becomes full-screen sheet on tablet

---

## Accessibility (WCAG 2.1 AA)

- All interactive elements keyboard focusable with visible focus ring
- Color is never the only differentiator (status uses icon + color + label)
- `aria-label` on all icon-only buttons
- Drag-and-drop has keyboard alternative (Move button → position picker)
- Screen reader announcements on status changes and toast notifications
- Minimum touch target: 44×44px
- Color contrast: minimum 4.5:1 for normal text; 3:1 for large text
- Reduced motion: all animations respect `prefers-reduced-motion`
