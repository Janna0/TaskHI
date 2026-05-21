# TaskHI — Wireframe Recommendations

## Wireframing Approach

These wireframes use ASCII art for structural fidelity. They define layout, hierarchy, and interaction zones — not visual polish. The design system document covers colors, typography, and motion.

**Fidelity levels:**
- **Lo-fi** (here): Layout, zones, element placement
- **Mid-fi** (Figma): Real spacing, real typography, icon shapes
- **Hi-fi** (Figma): Full design tokens, component states, animations

---

## WF-01: Authentication — Login Page

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                                                        │
│              ┌──────────────────────────┐             │
│    [Logo]    │                          │             │
│              │   Sign in to TaskHI      │             │
│              │                          │             │
│              │  Email                   │             │
│              │  ┌────────────────────┐  │             │
│              │  │                    │  │             │
│              │  └────────────────────┘  │             │
│              │                          │             │
│              │  Password                │             │
│              │  ┌────────────────────┐  │             │
│              │  │                    │  │             │
│              │  └────────────────────┘  │             │
│              │                          │             │
│              │  □ Remember me  Forgot?  │             │
│              │                          │             │
│              │  ┌────────────────────┐  │             │
│              │  │   Sign In          │  │             │
│              │  └────────────────────┘  │             │
│              │                          │             │
│              │  ─────────── or ──────── │             │
│              │                          │             │
│              │  ┌────────────────────┐  │             │
│              │  │ G  Continue Google │  │             │
│              │  └────────────────────┘  │             │
│              │                          │             │
│              │  No account? Sign up →   │             │
│              └──────────────────────────┘             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Notes:**
- Centered card on neutral background
- No sidebar, no topnav (unauthenticated)
- Google button has Google logo icon
- Error state: red border on invalid field + inline error message below field
- Loading state: Sign In button shows spinner, disabled

---

## WF-02: Onboarding Flow

```
STEP 1/3: Name Your Workspace
┌────────────────────────────────────┐
│  ● ○ ○                             │ ← Step indicator
│                                    │
│  What's your workspace called?     │
│                                    │
│  ┌────────────────────────────┐    │
│  │ e.g. Acme Corp             │    │
│  └────────────────────────────┘    │
│                                    │
│  This is usually your company or   │
│  team name.                        │
│                                    │
│  ┌────────────────┐                │
│  │   Continue →   │                │
│  └────────────────┘                │
└────────────────────────────────────┘

STEP 2/3: Invite Your Team (skippable)
┌────────────────────────────────────┐
│  ○ ● ○                             │
│                                    │
│  Invite teammates                  │
│                                    │
│  ┌──────────────────┐ [Role ▾]     │
│  │ email@company.com│              │
│  └──────────────────┘              │
│  + Add another                     │
│                                    │
│  ┌──────────────┐  [Skip for now]  │
│  │ Send Invites │                  │
│  └──────────────┘                  │
└────────────────────────────────────┘

STEP 3/3: Create First Project
┌────────────────────────────────────┐
│  ○ ○ ●                             │
│                                    │
│  Create your first project         │
│                                    │
│  Project name                      │
│  ┌────────────────────────────┐    │
│  │ e.g. Website Redesign      │    │
│  └────────────────────────────┘    │
│                                    │
│  ┌──────────┐ ┌──────────────────┐ │
│  │ 🎨 Color │ │ Template (opt.) ▾│ │
│  └──────────┘ └──────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐  │
│  │   Create Project →           │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## WF-03: Dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  [☰] TaskHI   [⌘K Search projects and tasks…]   [🔔 3] [👤] │
├──────────┬───────────────────────────────────────────────────┤
│ [🏠] Dash│  Good morning, Alex                [+ New Project]│
│ [📁] Proj│ ─────────────────────────────────────────────────│
│ [✓] Tasks│  FAVORITE PROJECTS                               │
│ [📅] Time│  ┌──────────────┐  ┌──────────────┐  ┌─────────┐│
│ [📎] Files│  │ ████ blue   │  │ ████ green  │  │ ████ red││
│ [🔔] Notif│  │ Website Res.│  │ Q3 Campaign │  │ App Reb.││
│          │  │ ████░░ 60%  │  │ ██░░░░ 35%  │  │ ████░ 75%││
│ FAVORITES│  │ Due May 30  │  │ 5 overdue   │  │ On track ││
│ ● Website│  └──────────────┘  └──────────────┘  └─────────┘│
│ ● Q3 Camp│                                                   │
│          │  ┌──────────────────────────┬────────────────────┐│
│ RECENT   │  │ MY TASKS                 │ ACTIVITY           ││
│ · API Int│  │ Today                    │ Maya commented on  ││
│ · Onboard│  │ □ Write copy draft  🔴  │ "Homepage hero…"   ││
│          │  │ □ Review designs    🟡  │ 2 min ago          ││
│          │  │ Upcoming             │ James completed "API" ││
│          │  │ □ QA sign-off      🟢  │ 15 min ago         ││
│          │  │ □ Client call      🟡  │                    ││
│          │  │ + View all tasks        │ Load more…         ││
│          │  └──────────────────────────┴────────────────────┤│
│          │  UPCOMING DEADLINES                               │
│          │  🔴 Overdue (3)   🟡 Due Today (2)   🟢 Week (7) │
│  [⚙️ Set]│                                                   │
└──────────┴───────────────────────────────────────────────────┘
```

---

## WF-04: List View

```
┌──────────────────────────────────────────────────────────────┐
│ Website Redesign                                              │
│ [Overview] [List●] [Board] [Timeline] [Files]  [Members] [⚙]│
├──────────────────────────────────────────────────────────────┤
│ [🔽 Filter] [Group: Section▾] [Sort: Due Date▾] [⊞ Columns]│
│                                           [+ Add Task]       │
├──────────────────┬────────────┬──────────┬────────┬──────────┤
│ TASK TITLE       │ STATUS     │ PRIORITY │ASSIGNEE│ DUE DATE │
├──────────────────┴────────────┴──────────┴────────┴──────────┤
│ ▾ Design  (4)                                      [+ Task]  │
├──────────────────┬────────────┬──────────┬────────┬──────────┤
│ □ Create wireframes│● In Prog.│🔴 High   │ [MA]  │ May 22   │
│ □ Design system  │○ To Do    │🟡 Medium  │ [JD]  │ May 25   │
│ □ Prototype v1   │○ To Do    │🟢 Low     │       │ Jun 1    │
│ + Add task       │           │           │       │          │
├──────────────────┴────────────┴──────────┴────────┴──────────┤
│ ▾ Development  (3)                                 [+ Task]  │
├──────────────────┬────────────┬──────────┬────────┬──────────┤
│ □ Set up repo    │✓ Done     │🟡 Medium  │ [AL]  │          │
│ □ Auth flow      │● In Prog. │🔴 High    │ [JD]  │ May 24   │
│ □ Dashboard API  │○ To Do    │🔴 High    │ [AL]  │ May 28   │
│ + Add task       │           │           │       │          │
├──────────────────┴────────────┴──────────┴────────┴──────────┤
│ + Add section                                                 │
└──────────────────────────────────────────────────────────────┘
```

**Hover state on row:**
```
│ [☐]□ Create wireframes │● In Prog.│🔴 High   │ [MA]  │ May 22  [···]│
      ↑ checkbox appears  ↑ clickable anywhere    ↑ three-dot menu
```

---

## WF-05: Board View

```
┌──────────────────────────────────────────────────────────────┐
│ [Filter▾]  [Board]                              [+ Add Task]│
├────────────────┬───────────────┬───────────────┬────────────┤
│  TO DO  (5)   │ IN PROGRESS(3)│  REVIEW  (2)  │  DONE (8)  │
├────────────────┼───────────────┼───────────────┼────────────┤
│ ┌────────────┐ │ ┌───────────┐ │ ┌───────────┐ │            │
│ │Design sys. │ │ │ Auth flow │ │ │Wireframe  │ │ Set up repo│
│ │🟡 Med · JD │ │ │🔴 High·JD │ │ │review     │ │ ✓ Done ·AL │
│ │Due May 25  │ │ │Due May 24 │ │ │🟡 Med ·MA │ │            │
│ └────────────┘ │ └───────────┘ │ │Due May 22  │ │            │
│                │               │ └───────────┘ │            │
│ ┌────────────┐ │ ┌───────────┐ │               │            │
│ │Prototype v1│ │ │Dashboard  │ │ ┌───────────┐ │            │
│ │🟢 Low      │ │ │API        │ │ │Client call│ │            │
│ │Due Jun 1   │ │ │🔴High · AL│ │ │prep       │ │            │
│ └────────────┘ │ └───────────┘ │ │🔴 High    │ │            │
│                │               │ │MA · JD    │ │            │
│ + Add card     │ + Add card    │ └───────────┘ │            │
│                │               │ + Add card    │ + Add card  │
└────────────────┴───────────────┴───────────────┴────────────┘
```

**Card anatomy:**
```
┌─────────────────────┐
│ ◾ Task title here   │  ← Priority color left border
│                     │
│ 🏷 tag1  🏷 tag2    │  ← Tag chips
│                     │
│ [MA][JD]  May 24 🔴 │  ← Avatars + due date
│ □2  💬3             │  ← Subtask count + comment count
└─────────────────────┘
```

---

## WF-06: Timeline View

```
┌──────────────────────────────────────────────────────────────┐
│ [Week▾]    [← May 2024 →]           [Today]  [+ Task]       │
├───────────────────┬──────────────────────────────────────────┤
│ TASK              │ 19   20   21   22   23   24   25   26    │
├───────────────────┼──────────────────────────────────────────┤
│ ▾ Design          │                                           │
│   Create wireframe│          ████████████                    │
│   Design system   │                    ████████████████      │
│   Prototype v1    │                              ████████    │
├───────────────────┼──────────────────────────────────────────┤
│ ▾ Development     │                  │  ← Today line         │
│   Auth flow       │     ██████████████                       │
│   Dashboard API   │               ████████████████████       │
├───────────────────┼──────────────────────────────────────────┤
│ + Add task        │                                           │
└───────────────────┴──────────────────────────────────────────┘
```

**Bar interaction:**
- Hover → shows tooltip: "Task name | May 20–24 | 🔴 High | [MA]"
- Click → opens task detail
- Drag bar → moves dates
- Drag left/right edge → extends/shortens duration

---

## WF-07: Overview Page

```
┌──────────────────────────────────────────────────────────────┐
│ Website Redesign — Overview                                   │
├─────────────────────────┬────────────────────────────────────┤
│ PROJECT HEALTH          │ UPCOMING DEADLINES                 │
│                         │                                    │
│    ╭──────╮             │ May 22 · Create wireframes · [MA] │
│   ╱ 60%   ╲            │         🔴 High · In Progress      │
│  │  done   │            │                                    │
│   ╲       ╱            │ May 24 · Auth flow · [JD]          │
│    ╰──────╯             │         🔴 High · In Progress      │
│                         │                                    │
│ 12 total  7 done        │ May 25 · Design system · [JD]     │
│ 3 overdue 2 in review   │         🟡 Medium · To Do          │
├─────────────────────────┼────────────────────────────────────┤
│ MEMBERS (5)             │ RECENT ACTIVITY                    │
│                         │                                    │
│ [MA] Maya Patel         │ Maya commented on wireframes · 2m  │
│ [JD] James Doe          │ Alex created "Dashboard API" · 1h  │
│ [AL] Alex Lee (you)     │ Status changed: Auth → In Prog · 2h│
│ [SR] Sam R.             │ James uploaded "brief_v2.pdf" · 3h │
│ [KL] Kim L.             │                                    │
│        [+ Invite]       │                   Load more…       │
├─────────────────────────┴────────────────────────────────────┤
│ RECENT FILES                          [View all files →]     │
│                                                              │
│ [🖼] header_img.png  JD · May 20      [📄] brief_v2.pdf  MA  │
│ [🖼] logo_final.svg  SR · May 19      [📊] roadmap.xlsx  AL  │
└──────────────────────────────────────────────────────────────┘
```

---

## WF-08: Task Detail Panel (right drawer)

```
┌─────────────────────────────────────────────┐
│ [✓ Mark Complete]                    [···][✕]│
├─────────────────────────────────────────────┤
│                                             │
│  Create homepage wireframes                 │ ← Title (h2, editable)
│  Website Redesign › Design                  │ ← Breadcrumb
│                                             │
├──────────────────────────┬──────────────────┤
│                          │ Status           │
│  Description             │ ● In Progress    │
│                          │                  │
│  Draft a lo-fi wireframe │ Priority         │
│  for the homepage that   │ 🔴 High          │
│  covers hero, features,  │                  │
│  and CTA sections.       │ Assignee         │
│                          │ [MA] [JD] +      │
│                          │                  │
│                          │ Start Date       │
│                          │ May 15, 2024     │
│                          │                  │
│                          │ Due Date         │
│                          │ May 22, 2024 🔴  │
│                          │                  │
│                          │ Tags             │
│                          │ #design #ux      │
├──────────────────────────┴──────────────────┤
│ SUBTASKS  ████░░ 2/4                        │
│ ✓ Competitor analysis                       │
│ ✓ Draft hero section                        │
│ □ Features grid layout                      │
│ □ CTA variations                            │
│ + Add subtask                               │
├─────────────────────────────────────────────┤
│ CHECKLIST: "Pre-design"  ██░░░ 2/5          │
│ ✓ Read brief                                │
│ ✓ User research notes reviewed              │
│ □ Brand guidelines checked                  │
│ □ Content inventory done                    │
│ □ Stakeholder notes read                    │
├─────────────────────────────────────────────┤
│ ATTACHMENTS                                 │
│ [🖼] homepage_inspo.png  2.1 MB  [MA] May 19│
│ [📄] content_brief.pdf   180 KB  [JD] May 18│
│ + Drag & drop or click to upload            │
├─────────────────────────────────────────────┤
│ ACTIVITY                                    │
│                                             │
│ [MA] Maya Patel  2h ago                     │
│ "Can we add a testimonial section above the │
│ CTA? @Alex check the brief for this."       │
│ 👍 1  ❤️ 1                                  │
│                                             │
│ · Alex changed status to In Progress · 1d   │
│                                             │
│ [AL] Maya commented · 3d ago               │
│ "Starting wireframes today"                 │
│                                             │
├─────────────────────────────────────────────┤
│ [AL] ┌─────────────────────────────────┐   │
│      │ Add a comment… @mention         │   │
│      └─────────────────────────────────┘   │
│      B I `code` 🔗  📎  😊    [Cmd+↵ Send] │
└─────────────────────────────────────────────┘
```

---

## WF-09: Notification Center (Drawer)

```
                              ┌──────────────────────────────┐
                              │ Notifications    [✓ All read]│
                              ├──────────────────────────────┤
                              │ All │ Unread(3) │ Mentions │  │
                              ├──────────────────────────────┤
                              │ ● [MA] Maya commented on     │ ← unread dot
                              │   "Homepage wireframes"       │
                              │   Website Redesign · 2m ago   │
                              ├──────────────────────────────┤
                              │ ● [SY] You were assigned to  │
                              │   "Write API docs"            │
                              │   App Rebranding · 1h ago     │
                              ├──────────────────────────────┤
                              │ ● ⏰ Deadline tomorrow:       │
                              │   "Create wireframes"         │
                              │   Website Redesign · 2h ago   │
                              ├──────────────────────────────┤
                              │   [JD] James completed       │
                              │   "Set up repository"        │
                              │   Website Redesign · 1d ago   │
                              ├──────────────────────────────┤
                              │   [AL] You created           │
                              │   "Dashboard API"            │
                              │   Website Redesign · 1d ago   │
                              ├──────────────────────────────┤
                              │       Load older…            │
                              └──────────────────────────────┘
```

---

## WF-10: Template Gallery

```
┌─────────────────────────────────────────────────────────┐
│ Choose a Template                                   [✕] │
├─────────────────────────────────────────────────────────┤
│ [All] [Marketing] [Engineering] [Operations] [Personal] │
│                                                         │
│ ┌────────────────┐  ┌────────────────┐                  │
│ │████████████████│  │████████████████│                  │
│ │ Marketing      │  │ Software Dev   │                  │
│ │ Campaign       │  │ Sprint         │                  │
│ │ 18 tasks       │  │ 24 tasks       │                  │
│ │ [Preview] [Use]│  │ [Preview] [Use]│                  │
│ └────────────────┘  └────────────────┘                  │
│                                                         │
│ ┌────────────────┐  ┌────────────────┐                  │
│ │████████████████│  │████████████████│                  │
│ │ Event Planning │  │ CRM            │                  │
│ │                │  │ Implementation │                  │
│ │ 22 tasks       │  │ 16 tasks       │                  │
│ │ [Preview] [Use]│  │ [Preview] [Use]│                  │
│ └────────────────┘  └────────────────┘                  │
│                                                         │
│ [← Start from scratch]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## Wireframe Handoff Notes for Designers

1. **Spacing unit:** 4px base grid. All spacing values multiples of 4.
2. **Sidebar width:** 240px expanded, 56px collapsed, transition 200ms ease.
3. **Task detail panel:** 480px wide, full viewport height minus topnav.
4. **Card shadows:** Prefer elevation over bordered cards for primary surfaces.
5. **Focus states:** Visible at all times; use primary color ring.
6. **Loading skeletons:** Every data surface needs a skeleton loader matching the content shape.
7. **Toast stack:** Bottom-right, max 3 visible, slide-up entry, slide-right exit.
8. **Modal backdrop:** `rgba(0,0,0,0.4)`, click-to-dismiss.
9. **Dropdown menus:** Min width 180px; max 320px; consistent border-radius.
10. **Date picker:** Month-view calendar, range selection for start+end dates.
