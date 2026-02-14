# Arkaledge Frontend Design Document

## Design Direction: Clean Modern SaaS

A refined, professional interface inspired by Apple and Linear aesthetics. The design emphasizes clarity, elegance, and efficiency—stripping away unnecessary visual noise while maintaining warmth and approachability.

---

## 1. Visual Description & Color Palette

### Overall Aesthetic

The interface employs a light, airy feel with generous whitespace and carefully considered visual hierarchy. Elements float on subtle layered backgrounds with soft shadows that create depth without heaviness. The design feels like a natural extension of the user's workspace—professional enough for enterprise, refined enough for modern teams.

### Color Palette

#### Primary Colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Background Primary | Soft White | `#FAFAFA` | Main application background |
| Background Secondary | Light Gray | `#F4F4F5` | Cards, panels, elevated surfaces |
| Background Tertiary | Subtle Gray | `#E4E4E7` | Hover states, borders |
| Surface | Pure White | `#FFFFFF` | Cards, modals, input fields |

#### Accent Colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary Brand | Deep Indigo | `#4F46E5` | Primary actions, links, active states |
| Primary Hover | Rich Indigo | `#4338CA` | Button hover, focus states |
| Secondary | Soft Purple | `#8B5CF6` | Secondary actions, highlights |
| Success | Emerald | `#10B981` | Completed tasks, success states |
| Warning | Amber | `#F59E0B` | In-progress items, warnings |
| Error | Rose | `#EF4444` | Errors, rejections, critical |
| Info | Sky Blue | `#0EA5E9` | Information, tooltips |

#### Text Colors

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Text Primary | Near Black | `#18181B` | Headings, important content |
| Text Secondary | Dark Gray | `#52525B` | Body text, descriptions |
| Text Tertiary | Medium Gray | `#A1A1AA` | Labels, placeholders |
| Text Muted | Light Gray | `#D4D4D8` | Disabled, timestamps |

#### Semantic Task Colors (Kanban Columns)

| Status | Background | Border/Accent | Text |
|--------|------------|----------------|------|
| Backlog | `#F4F4F5` | `#A1A1AA` | `#52525B` |
| In Progress | `#FEF3C7` | `#F59E0B` | `#92400E` |
| Review | `#DBEAFE` | `#3B82F6` | `#1E40AF` |
| Done | `#D1FAE5` | `#10B981` | `#065F46` |

### Shadows & Elevation

```css
/* Subtle elevation for cards */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04),
            0 1px 2px rgba(0, 0, 0, 0.06);

/* Elevated panels, dropdowns */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05),
            0 2px 4px -1px rgba(0, 0, 0, 0.03);

/* Modals, popovers */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Focus ring */
box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
```

### Border Radius

| Element | Radius |
|---------|--------|
| Small (chips, tags) | `4px` |
| Medium (buttons, inputs) | `8px` |
| Large (cards, panels) | `12px` |
| Extra Large (modals) | `16px` |

---

## 2. Typography

### Font Stack

```
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono',
             Monaco, Consolas, monospace;
```

### Type Scale

| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 | `28px` | `600` | 1.2 | `-0.02em` |
| H2 | `22px` | `600` | 1.25 | `-0.01em` |
| H3 | `18px` | `600` | 1.3 | `0` |
| Body Large | `16px` | `400` | 1.5 | `0` |
| Body | `14px` | `400` | 1.5 | `0` |
| Body Small | `13px` | `400` | 1.4 | `0` |
| Caption | `12px` | `500` | 1.4 | `0.02em` |
| Code | `13px` | `400` | 1.5 | `0` |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Regular | `400` | Body text, descriptions |
| Medium | `500` | Labels, UI elements |
| Semibold | `600` | Headings, emphasis |
| Mono | `400` | Code, logs, technical |

---

## 3. Component Layout Wireframe

### Overall Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER BAR (56px height)                                       │
│ [Logo] [Project Name]                    [Team Status] [User] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐│
│  │              │  │                                          ││
│  │   SIDEBAR    │  │           MAIN CONTENT AREA              ││
│  │   (240px)    │  │                                          ││
│  │              │  │  ┌────────┐ ┌────────┐ ┌────────┐       ││
│  │  • Dashboard │  │  │ Backlog│ │In Prog │ │ Review │ ──►  ││
│  │  • Projects  │  │  │        │ │        │ │        │       ││
│  │  • Kanban    │  │  │  Card  │ │  Card  │ │  Card  │       ││
│  │  • Activity  │  │  │  Card  │ │  Card  │ │        │       ││
│  │  • Settings  │  │  │        │ │        │ │        │       ││
│  │              │  │  └────────┘ └────────┘ └────────┘       ││
│  │              │  │                                          ││
│  │              │  │  ┌─────────────────────────────────────┐ ││
│  │              │  │  │      ACTIVITY FEED (Collapsible)    │ ││
│  │              │  │  │      Real-time agent logs          │ ││
│  │              │  │  └─────────────────────────────────────┘ ││
│  └──────────────┘  └──────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

| Breakpoint | Width | Layout Adjustments |
|------------|-------|-------------------|
| Desktop XL | `1440px+` | Full layout, expanded sidebar |
| Desktop | `1024px-1439px` | Full layout, collapsible sidebar |
| Tablet | `768px-1023px` | Hidden sidebar, hamburger menu |
| Mobile | `<768px` | Single column, bottom navigation |

---

## 4. Component Details

### 4.1 Header Bar

**Purpose**: Global navigation and project context

**Layout**:
```
[Logo Icon]  [Project Name ▼]           [Agent Status Pills]  [Avatar]
```

**Elements**:
- **Logo**: 32x32px Arkaledge logo, subtle indigo
- **Project Dropdown**: Current project name with chevron, white background, 8px radius
- **Agent Status Pills**: Horizontal row of small pills showing active agents
  - Each pill: 8px padding horizontal, 4px vertical, rounded-full
  - Color-coded dot (green=active, gray=idle, amber=working)
  - Agent name in caption size
- **User Avatar**: 32x32px circle, bottom right border

**Behavior**:
- Project dropdown opens on click, showing recent projects
- Agent pills show tooltip on hover with last activity
- Sticky on scroll

---

### 4.2 Sidebar Navigation

**Purpose**: Primary navigation and quick actions

**Layout**:
```
┌─────────────────────────┐
│ Navigation Items        │
│ ─────────────────────── │
│ 🏠 Dashboard            │
│ 📁 Projects             │
│ 📋 Kanban Board    ●    │
│ ⚡ Activity Feed    ●    │
│ ⚙️ Settings             │
│                         │
│ ─────────────────────── │
│ Quick Actions           │
│ + New Project           │
│ + New Task              │
└─────────────────────────┘
```

**Styling**:
- Background: `#F4F4F5`
- Width: 240px fixed
- Nav items: 40px height, 12px horizontal padding
- Active item: `#4F46E5` text, light indigo background `rgba(79, 70, 229, 0.1)`
- Hover: `#E4E4E7` background
- Badge (●): 8px dot, primary color, right-aligned

**Behavior**:
- Collapsible to 64px icon-only mode
- Smooth 200ms transition on collapse

---

### 4.3 Project Launcher (Home/Submit Specs)

**Purpose**: Entry point to create new projects from specifications

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐      │
│    │                                                     │      │
│    │              🏗️  Start New Project                  │      │
│    │                                                     │      │
│    │    Transform your ideas into working software      │      │
│    │    with autonomous AI agents                       │      │
│    │                                                     │      │
│    │    ┌─────────────────────────────────────────┐       │      │
│    │    │                                         │       │      │
│    │    │     Drop specification file here       │       │      │
│    │    │     or click to browse                 │       │      │
│    │    │                                         │       │      │
│    │    │     📄 Supports .md, .txt, .yaml       │       │      │
│    │    │                                         │       │
│    │    └─────────────────────────────────────────┘       │      │
│    │                                                     │      │
│    │    [ Start Project ]                                │      │
│    │                                                     │      │
│    └─────────────────────────────────────────────────────┘      │
│                                                                 │
│    Recent Projects                                              │
│    ─────────────────────────────────────────────────────        │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│    │ Project A   │  │ Project B   │  │ Project C   │            │
│    │ 5 tasks     │  │ 12 tasks    │  │ 3 tasks     │            │
│    │ Updated 2h  │  │ Updated 1d  │  │ Updated 3d  │            │
│    └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Drop Zone**:
- Dashed border: 2px, `#D4D4D8`, 12px radius
- Background on drag: `rgba(79, 70, 229, 0.05)`
- Border color on drag: `#4F46E5`
- Icon: 48px upload cloud, `#A1A1AA`
- Pulse animation on hover

**Project Cards**:
- Background: white, 12px radius
- Shadow: subtle (see shadows section)
- Padding: 16px
- Hover: translate Y -2px, enhanced shadow
- Title: H3 style
- Meta: caption style, tertiary text color

---

### 4.4 Kanban Board

**Purpose**: Visual task management across workflow stages

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Project: E-Commerce Platform                            [+ Add Task]      │
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │   BACKLOG   │ │ IN PROGRESS │ │   REVIEW    │ │    DONE     │            │
│  │    (5)      │ │    (3)      │ │    (2)      │ │    (12)     │            │
│  │─────────────│ │─────────────│ │─────────────│ │─────────────│            │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │            │
│  │ │ Task    │ │ │ │ Task    │ │ │ │ Task    │ │ │ │ Task    │ │            │
│  │ │ Card    │ │ │ │ Card    │ │ │ │ Card    │ │ │ │ Card    │ │            │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │            │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │             │            │
│  │ │ Task    │ │ │ │ Task    │ │ │ │ Task    │ │ │             │            │
│  │ │ Card    │ │ │ │ Card    │ │ │ │ Card    │ │ │             │            │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │             │            │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Column Styling**:
- Column header: sticky, 48px height, background matches status color (light)
- Column count badge: circular, 24px, right-aligned
- Column background: status-specific light tint
- Gap between columns: 16px
- Horizontal scroll on overflow

**Task Card**:
```
┌────────────────────────────────┐
│ [Priority] Task Title          │
│                                │
│ Description preview...         │
│                                │
│ ┌──────┐ ┌──────┐              │
│ │ Tag  │ │ Tag  │              │
│ └──────┘ └──────┘              │
│                                │
│ 👤 Engineer    🕐 2h ago        │
└────────────────────────────────┘
```

- Background: white
- Border radius: 12px
- Padding: 16px
- Border-left: 4px solid, priority color
- Priority indicators:
  - Critical: `#EF4444` (rose)
  - High: `#F59E0B` (amber)
  - Medium: `#4F46E5` (indigo)
  - Low: `#A1A1AA` (gray)
- Hover: slight lift, shadow increase
- Click: opens task detail panel

**Drag & Drop**:
- Dragging card: 5° rotation, increased shadow, 0.9 opacity
- Drop target: dashed border, background highlight
- Animation: 200ms ease-out

---

### 4.5 Task Detail Panel

**Purpose**: Full task information, editing, and agent assignment

**Layout** (Slide-in panel from right, 480px width):
```
┌────────────────────────────────────────────┐
│ ×                              [Archive]   │
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ [Critical ▼] Task Title                │ │
│ │ Editable inline                        │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Status: [In Progress ▼]                    │
│                                            │
│ ── Description ────────────────────────── │
│ Full task description with                │
│ requirements, acceptance criteria,        │
│ and technical notes...                    │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Edit in Markdown mode                  │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ── Details ────────────────────────────── │
│ Assignee:    [Select Agent ▼]             │
│ Reporter:    Product Manager              │
│ Created:     Jan 15, 2026                 │
│ Due:         [Select Date ▼]              │
│ Priority:    [Critical ▼]                │
│ Tags:        [frontend] [api] [+]         │
│                                            │
│ ── Subtasks ───────────────────────────── │
│ ☐ Subtask 1                               │
│ ☑ Subtask 2                               │
│ ☐ Subtask 3                               │
│ [+ Add Subtask]                           │
│                                            │
│ ── Activity ───────────────────────────── │
│ ┌────────────────────────────────────────┐ │
│ │ 👤 Engineer moved to In Progress      │ │
│ │    2 hours ago                         │ │
│ │                                        │ │
│ │ 👤 Product Manager created            │ │
│ │    1 day ago                           │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

**Styling**:
- Panel background: white
- Overlay: `rgba(0, 0, 0, 0.3)` with backdrop blur
- Slide animation: 250ms ease-out
- Close button: top right, 32px, hover background

**Form Elements**:
- Input fields: full width, 40px height, 8px radius
- Select dropdowns: custom styled to match design system
- Textarea: auto-resize, markdown preview toggle

---

### Agent Activity Feed

 4.6**Purpose**: Real-time streaming logs of agent activities

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Activity Feed                          [Filter ▼] [Clear]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [10:32:15] 🔵 **Product Manager**                           │ │
│ │     Analyzing specification for user authentication       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [10:32:18] 🟢 **Scrum Master**                              │ │
│ │     Created 5 tasks from spec analysis                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [10:32:20] 🔵 **Engineer-1**                                │ │
│ │     Pulling latest changes from main...                    │ │
│ │     ✓ Ready to start implementation                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [10:32:45] 🟠 **Engineer-2**                                │ │
│ │     [WORKING] Implementing login form component            │ │
│ │     ████████████░░░░░░░░░░  45%                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Entry Styling**:
- Background: `#F4F4F5`, 8px radius
- Padding: 12px 16px
- Margin-bottom: 8px
- Max-height: scrollable, 400px

**Message Types**:
- **Info** (🔵): `#4F46E5` left border
- **Success** (🟢): `#10B981` left border
- **Warning** (🟠): `#F59E0B` left border
- **Error** (🔴): `#EF4444` left border

**Timestamp**: Monospace, caption size, tertiary color

**Progress Bars**: Animated striped gradient, rounded

**Behavior**:
- Auto-scroll to newest (toggleable)
- Pause on hover
- Filter by agent type
- Search within logs

---

### 4.7 Team Status Panel

**Purpose**: Show active agents and their current work

**Layout** (Header or Sidebar):
```
┌─────────────────────────────────┐
│ 👥 Team Status                  │
├─────────────────────────────────┤
│                                 │
│  🟢 Product Manager            │
│     Analyzing specs...          │
│     ───────────●──────────     │
│                                 │
│  🟢 Scrum Master               │
│     Assigning tasks            │
│     ───────────●──────────     │
│                                 │
│  🟡 Engineer-1                 │
│     Implementing: Auth         │
│     ██████████░░░░░░░  52%      │
│                                 │
│  🟢 Engineer-2                 │
│     Waiting for task           │
│     ───────────●──────────     │
│                                 │
│  🟢 Reviewer                    │
│     Ready for reviews          │
│                                 │
└─────────────────────────────────┘
```

**Agent Card**:
- Avatar: 32px circle with agent initial
- Status indicator: 10px dot (green/yellow/red/gray)
- Name: Body Large, semibold
- Current task: Body Small, secondary color
- Progress bar: if applicable, 4px height

**Status Colors**:
| Status | Color | Meaning |
|--------|-------|---------|
| Active | `#10B981` (green) | Working on task |
| Working | `#F59E0B` (amber) | Currently executing |
| Idle | `#A1A1AA` (gray) | Waiting |
| Error | `#EF4444` (red) | Blocked/failed |

---

## 5. Interaction Patterns

### 5.1 Buttons

**Primary Button**:
- Background: `#4F46E5`
- Text: white, semibold
- Padding: 10px 20px
- Radius: 8px
- Hover: `#4338CA`, translate Y -1px
- Active: `#3730A3`, translate Y 0
- Focus: 3px ring, `rgba(79, 70, 229, 0.3)`

**Secondary Button**:
- Background: transparent
- Border: 1px solid `#D4D4D8`
- Text: `#52525B`
- Hover: background `#F4F4F5`

**Ghost Button**:
- Background: transparent
- Text: `#52525B`
- Hover: background `#F4F4F5`

**Icon Button**:
- Size: 32px or 40px
- Radius: 8px
- Hover: background `#F4F4F5`

### 5.2 Form Inputs

**Text Input**:
- Height: 40px
- Background: white
- Border: 1px solid `#E4E4E7`
- Radius: 8px
- Padding: 0 12px
- Focus: border `#4F46E5`, ring
- Placeholder: `#A1A1AA`

**Textarea**:
- Min-height: 100px
- Padding: 12px
- Resize: vertical

**Select/Dropdown**:
- Custom styled to match inputs
- Chevron icon: right-aligned
- Dropdown panel: white, shadow, 8px radius
- Option hover: `#F4F4F5`

### 5.3 Animations

**Transitions**:
- Default duration: 150ms
- Easing: `ease-out`
- Color transitions: 100ms

**Micro-interactions**:
- Button press: scale(0.98)
- Card hover: translateY(-2px), shadow increase
- Focus rings: fade in 100ms
- Loading spinners: smooth rotation

**Page Transitions**:
- Fade: 200ms
- Slide: 250ms ease-out
- Modal: 200ms fade + slide

### 5.4 Loading States

**Skeleton Screens**:
- Background: linear gradient `#F4F4F5` → `#E4E4E7` → `#F4F4F5`
- Animation: shimmer 1.5s infinite
- Border radius: matches element

**Spinners**:
- Size: 20px (small), 32px (medium)
- Color: `#4F46E5`
- Style: ring with gap

**Progress Bars**:
- Height: 4px (small), 8px (medium)
- Background: `#E4E4E7`
- Fill: gradient `#4F46E5` → `#8B5CF6`
- Animation: striped moving gradient when indeterminate

---

## 6. Key UI Elements Summary

| Element | Style |
|---------|-------|
| Page Background | `#FAFAFA` |
| Card Background | White with subtle shadow |
| Primary Action | Indigo `#4F46E5` button |
| Success | Emerald `#10B981` |
| Warning | Amber `#F59E0B` |
| Error | Rose `#EF4444` |
| Text Primary | Near black `#18181B` |
| Text Secondary | Dark gray `#52525B` |
| Border Radius | 8px (buttons), 12px (cards) |
| Spacing Scale | 4, 8, 12, 16, 24, 32, 48px |
| Font | Inter (sans), JetBrains Mono (code) |

---

## 7. Accessibility Considerations

- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI
- **Focus States**: Visible focus rings on all interactive elements
- **Keyboard Navigation**: Full tab navigation, arrow keys in menus
- **Screen Readers**: Proper ARIA labels, live regions for activity feed
- **Reduced Motion**: Respect `prefers-reduced-motion`

---

## 8. Implementation Notes

### CSS Variables (Suggested)

```css
:root {
  /* Colors */
  --color-bg-primary: #FAFAFA;
  --color-bg-secondary: #F4F4F5;
  --color-surface: #FFFFFF;
  --color-primary: #4F46E5;
  --color-primary-hover: #4338CA;
  --color-text-primary: #18181B;
  --color-text-secondary: #52525B;
  --color-text-muted: #A1A1AA;
  --color-border: #E4E4E7;

  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### Framework Recommendations

- **React** with TypeScript for type safety
- **Tailwind CSS** for utility classes matching this design system
- **Framer Motion** for animations
- **React Query** for data fetching
- **Socket.io** or WebSocket for real-time activity feed

---

*Design document created for Arkaledge - Clean Modern SaaS aesthetic*
