# TaskHI — Design System

## Naming Convention

The design system is called **"Clarity"** — reflecting the product's core UX philosophy. All design tokens are prefixed with `--c-` in CSS.

---

## 1. Color Palette

### Brand Colors
Primary is a rich indigo — professional, energetic, modern. Accent is a bright violet for interactive states and highlights.

```css
/* Primary */
--c-primary-50:  #eef2ff;
--c-primary-100: #e0e7ff;
--c-primary-200: #c7d2fe;
--c-primary-300: #a5b4fc;
--c-primary-400: #818cf8;
--c-primary-500: #6366f1;   /* Base primary */
--c-primary-600: #4f46e5;   /* Hover state */
--c-primary-700: #4338ca;   /* Active state */
--c-primary-800: #3730a3;
--c-primary-900: #312e81;

/* Neutral (slate-based) */
--c-neutral-0:   #ffffff;
--c-neutral-50:  #f8fafc;   /* App background */
--c-neutral-100: #f1f5f9;   /* Sidebar background */
--c-neutral-200: #e2e8f0;   /* Borders */
--c-neutral-300: #cbd5e1;   /* Disabled borders */
--c-neutral-400: #94a3b8;   /* Placeholder text */
--c-neutral-500: #64748b;   /* Secondary text */
--c-neutral-600: #475569;   /* Body text */
--c-neutral-700: #334155;   /* Primary text */
--c-neutral-800: #1e293b;   /* Headings */
--c-neutral-900: #0f172a;   /* Maximum contrast */
```

### Semantic Colors
```css
/* Status */
--c-status-todo:        #94a3b8;   /* Neutral slate */
--c-status-in-progress: #3b82f6;   /* Blue */
--c-status-review:      #8b5cf6;   /* Violet */
--c-status-blocked:     #ef4444;   /* Red */
--c-status-done:        #22c55e;   /* Green */

/* Priority */
--c-priority-low:    #22c55e;   /* Green */
--c-priority-medium: #f59e0b;   /* Amber */
--c-priority-high:   #ef4444;   /* Red */
--c-priority-urgent: #7c3aed;   /* Purple (for distinction from high) */

/* Feedback */
--c-success: #16a34a;
--c-warning: #d97706;
--c-error:   #dc2626;
--c-info:    #2563eb;

/* Background tints */
--c-success-bg: #f0fdf4;
--c-warning-bg: #fffbeb;
--c-error-bg:   #fef2f2;
--c-info-bg:    #eff6ff;
```

### Dark Mode Tokens
```css
[data-theme="dark"] {
  --c-neutral-0:   #0f172a;
  --c-neutral-50:  #1e293b;   /* App background */
  --c-neutral-100: #334155;   /* Sidebar background */
  --c-neutral-200: #475569;   /* Borders */
  --c-neutral-700: #cbd5e1;   /* Primary text */
  --c-neutral-800: #e2e8f0;   /* Headings */
  --c-neutral-900: #f8fafc;   /* Maximum contrast */
}
```

### Project/Avatar Colors (12 presets)
```
Indigo   #6366f1    Violet   #8b5cf6
Sky      #0ea5e9    Teal     #14b8a6
Emerald  #10b981    Lime     #84cc16
Amber    #f59e0b    Orange   #f97316
Rose     #f43f5e    Pink     #ec4899
Slate    #64748b    Stone    #78716c
```

---

## 2. Typography

**Font stack:**
```css
--c-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--c-font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

**Scale (using rem, base 16px):**
```css
--c-text-xs:   0.75rem;    /* 12px — meta info, timestamps */
--c-text-sm:   0.875rem;   /* 14px — body text, labels, table cells */
--c-text-base: 1rem;       /* 16px — default body */
--c-text-lg:   1.125rem;   /* 18px — section headings */
--c-text-xl:   1.25rem;    /* 20px — page section titles */
--c-text-2xl:  1.5rem;     /* 24px — panel/card titles */
--c-text-3xl:  1.875rem;   /* 30px — page headings */
--c-text-4xl:  2.25rem;    /* 36px — marketing/hero */

/* Line heights */
--c-leading-tight:  1.25;
--c-leading-snug:   1.375;
--c-leading-normal: 1.5;
--c-leading-relaxed: 1.625;

/* Font weights */
--c-font-normal:   400;
--c-font-medium:   500;
--c-font-semibold: 600;
--c-font-bold:     700;
```

**Usage guide:**

| Element | Size | Weight | Color |
|---|---|---|---|
| Page title | 3xl | semibold | neutral-800 |
| Section title | xl | semibold | neutral-700 |
| Card title | lg | semibold | neutral-800 |
| Body text | sm | normal | neutral-600 |
| Label | xs | medium | neutral-500 |
| Timestamp / meta | xs | normal | neutral-400 |
| Badge text | xs | medium | — (varies) |
| Table cell | sm | normal | neutral-700 |
| Task title | sm | medium | neutral-800 |
| Task (completed) | sm | normal | neutral-400 (strikethrough) |

---

## 3. Spacing

**Base unit: 4px**

```css
--c-space-0:   0px;
--c-space-1:   4px;
--c-space-2:   8px;
--c-space-3:   12px;
--c-space-4:   16px;
--c-space-5:   20px;
--c-space-6:   24px;
--c-space-8:   32px;
--c-space-10:  40px;
--c-space-12:  48px;
--c-space-16:  64px;
--c-space-20:  80px;
--c-space-24:  96px;
```

**Layout dimensions:**
```css
--c-topnav-height:     48px;
--c-sidebar-width:     240px;
--c-sidebar-collapsed: 56px;
--c-task-panel-width:  480px;
--c-modal-sm:          400px;
--c-modal-md:          560px;
--c-modal-lg:          720px;
```

---

## 4. Border Radius

```css
--c-radius-sm:   4px;    /* Badges, chips, small inputs */
--c-radius-md:   6px;    /* Buttons, inputs, small cards */
--c-radius-lg:   8px;    /* Cards, panels */
--c-radius-xl:   12px;   /* Modals, large cards */
--c-radius-2xl:  16px;   /* Dialogs */
--c-radius-full: 9999px; /* Avatars, toggles, pill badges */
```

---

## 5. Shadows / Elevation

```css
--c-shadow-xs:  0 1px 2px rgb(0 0 0 / 0.05);
--c-shadow-sm:  0 1px 3px rgb(0 0 0 / 0.1), 0 1px 2px rgb(0 0 0 / 0.06);
--c-shadow-md:  0 4px 6px rgb(0 0 0 / 0.07), 0 2px 4px rgb(0 0 0 / 0.06);
--c-shadow-lg:  0 10px 15px rgb(0 0 0 / 0.1), 0 4px 6px rgb(0 0 0 / 0.05);
--c-shadow-xl:  0 20px 25px rgb(0 0 0 / 0.1), 0 8px 10px rgb(0 0 0 / 0.04);
--c-shadow-2xl: 0 25px 50px rgb(0 0 0 / 0.25);

/* Focus ring */
--c-ring: 0 0 0 2px var(--c-primary-500);
```

**Elevation guide:**
| Level | Shadow | Use |
|---|---|---|
| 0 | none | Flat elements (table rows, sidebar items) |
| 1 | xs | Subtle cards, inputs |
| 2 | sm | Cards, dropdowns |
| 3 | md | Kanban cards, popovers |
| 4 | lg | Drawers, task detail panels |
| 5 | xl | Modals |
| 6 | 2xl | Dragged cards (drag state) |

---

## 6. Animation & Motion

**Duration:**
```css
--c-duration-instant:  0ms;
--c-duration-fast:     100ms;
--c-duration-base:     200ms;
--c-duration-slow:     300ms;
--c-duration-slower:   400ms;
```

**Easing:**
```css
--c-ease-linear:   linear;
--c-ease-out:      cubic-bezier(0, 0, 0.2, 1);   /* Default: exits */
--c-ease-in:       cubic-bezier(0.4, 0, 1, 1);   /* Entrances */
--c-ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1); /* Position changes */
--c-ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy drops */
```

**Standard animations:**
```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Slide in from right */
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

/* Slide up (toasts, dropdowns) */
@keyframes slideUp {
  from { transform: translateY(8px); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
}

/* Pop (completion, badge increments) */
@keyframes pop {
  0%   { transform: scale(1);   }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1);   }
}

/* Pulse (skeleton loading) */
@keyframes pulse {
  0%, 100% { opacity: 1;   }
  50%       { opacity: 0.5; }
}
```

**Reduced motion:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 7. Core Components

### Button

**Variants:**
```
Primary:   bg-primary-500  hover:bg-primary-600  text-white
Secondary: bg-neutral-100  hover:bg-neutral-200  text-neutral-700
Ghost:     bg-transparent  hover:bg-neutral-100  text-neutral-700
Danger:    bg-error        hover:bg-red-700       text-white
Link:      bg-transparent  underline              text-primary-500
```

**Sizes:**
```
xs: h-6  px-2  text-xs
sm: h-7  px-3  text-sm
md: h-8  px-4  text-sm   (default)
lg: h-10 px-5  text-base
```

**States:** default, hover, active, disabled (opacity-50, cursor-not-allowed), loading (spinner replaces text)

### Badge / Status Badge
```
To Do:       bg-neutral-100  text-neutral-600  border-neutral-200
In Progress: bg-blue-50      text-blue-700     border-blue-200
Review:      bg-violet-50    text-violet-700   border-violet-200
Blocked:     bg-red-50       text-red-700      border-red-200
Done:        bg-green-50     text-green-700    border-green-200
```

### Priority Badge
```
Low:    green dot  + "Low"
Medium: amber dot  + "Medium"
High:   red dot    + "High"
Urgent: purple dot + "Urgent"
```

### Avatar
- Sizes: xs (20px), sm (24px), md (32px), lg (40px), xl (56px)
- Fallback: initials (1–2 chars) on colored background (deterministic color from name hash)
- Image: circular, object-cover
- Status indicator: optional green/gray dot (online/offline — future)

### Avatar Stack
```
[MA][JD][AL]    (overlap with negative margin: -4px)
[MA][JD]+3      (show max 3, then +N overflow indicator)
```

### Input / Textarea
```
Default:  border border-neutral-200  bg-white  rounded-md  px-3 py-2
Focus:    border-primary-500  ring-2  ring-primary-100
Error:    border-red-500  ring-2  ring-red-100
Disabled: bg-neutral-50  cursor-not-allowed  opacity-50
```

### Dropdown / Select
- Trigger matches Input style
- Panel: bg-white, shadow-md, border border-neutral-200, border-radius md
- Items: px-3 py-2, hover:bg-neutral-50, selected: bg-primary-50 text-primary-700
- Search input at top (if > 5 items)
- Keyboard: ↑↓ navigate, Enter select, Esc close

### Checkbox
- 16×16px, border-radius 4px
- Default: border-neutral-300
- Checked: bg-primary-500, checkmark SVG
- Animation: check draws in on check, spring scale on check

### Toggle / Switch
- 36×20px pill
- Off: bg-neutral-200
- On: bg-primary-500
- Knob slides smoothly (200ms ease)

### Progress Bar
```
Container: bg-neutral-200  rounded-full  h-1.5
Fill:      bg-primary-500  transition-width  300ms
```

### Skeleton Loader
```
bg-neutral-200  rounded  animate-pulse
Match content shape: tall for titles, wide for text rows
```

### Popover / Tooltip
- Tooltip: max-w-xs, text-xs, bg-neutral-900, text-white, rounded-md, px-2 py-1
- Delay: 600ms before show (prevents flicker on fast hover)
- Popover: bg-white, shadow-lg, border, rounded-xl, p-4

### Toast / Notification
```
Position: bottom-right, stacked (max 3)
Width: 320px
Variants: success (green left border), error (red), warning (amber), info (blue)
Entry: slideUp 200ms ease-out
Exit: slideRight 200ms ease-in
Duration: 4s auto-dismiss (stays on hover)
```

---

## 8. Icon System

**Library:** Lucide React (MIT, consistent stroke-based SVGs)

**Sizes:** 12px, 14px, 16px (default), 20px, 24px  
**Stroke width:** 1.5px (Lucide default)  
**Color:** inherits `currentColor`

**Core icon map:**
```
Dashboard:    LayoutDashboard
Projects:     FolderOpen
My Tasks:     CheckSquare
Timeline:     GanttChartSquare
Files:        Paperclip
Notifications:Bell
Settings:     Settings2
Search:       Search
Add:          Plus
Menu:         Menu
Close:        X
Chevron Down: ChevronDown
Check:        Check
Priority Low: ArrowDown
Priority Med: ArrowRight
Priority High:ArrowUp
Priority Urg: AlertTriangle
Status Todo:  Circle
Status InProg:CircleDot
Status Review:CircleCheck
Status Done:  CheckCircle2
Status Block: Ban
Star:         Star (outline) / StarFill (filled)
Archive:      Archive
Delete:       Trash2
Edit:         Pencil
Duplicate:    Copy
Assign:       UserPlus
Comment:      MessageSquare
Reaction:     SmilePlus
Attachment:   Paperclip
Upload:       Upload
Download:     Download
```

---

## 9. Grid & Layout Patterns

### 12-Column Content Grid
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--c-space-6);
}
```

### Dashboard Card Grid
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--c-space-4);
}
```

### Overview Page Grid (3 cols on desktop, 1 col on mobile)
```css
.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--c-space-4);
}
@media (max-width: 1024px) { .overview-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px)  { .overview-grid { grid-template-columns: 1fr; } }
```

---

## 10. Figma Organization

**File structure:**
```
TaskHI Design System
├── 🎨 Foundations
│   ├── Colors (all tokens as Figma variables)
│   ├── Typography (styles)
│   ├── Spacing (as grid)
│   ├── Shadows (effects)
│   └── Icons (component set from Lucide)
├── 🧩 Components
│   ├── Buttons (all variants + states)
│   ├── Inputs (all variants + states)
│   ├── Badges (status, priority, tag)
│   ├── Avatar + Avatar Stack
│   ├── Checkbox + Toggle
│   ├── Progress Bar
│   ├── Skeleton
│   ├── Toast
│   ├── Dropdown
│   └── Popover / Tooltip
├── 📐 Layouts
│   ├── App Shell (sidebar expanded + collapsed)
│   ├── Top Navigation
│   └── Content Area
└── 📱 Screens
    ├── Auth (Login, Register, Forgot PW)
    ├── Onboarding (3 steps)
    ├── Dashboard
    ├── Projects (List, Grid)
    ├── List View
    ├── Board View
    ├── Timeline View
    ├── Overview Page
    ├── Files View
    ├── Task Detail Panel
    ├── Notifications Drawer
    └── Settings
```

**Naming convention:**
- Components: `ComponentName/Variant/State` (e.g., `Button/Primary/Default`)
- Colors: `Semantic/Role` (e.g., `Status/In Progress`)
- Layers: PascalCase for components, kebab-case for groups

**Figma variables:**
- Use Figma Variables (not just Styles) for all color tokens
- Create Light and Dark mode collections
- All components reference variables — never hard-coded colors
