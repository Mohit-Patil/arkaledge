# Arkaledge Frontend Design - Mission Control Interface

## Version 4 - Sci-Fi Space Mission Control Aesthetic

---

## 1. Visual Description & Color Palette

### Overall Aesthetic
A dark, immersive space mission control interface that feels like a holographic command center aboard a starship. The UI uses layered transparency, glowing accents, and geometric precision to create the feeling of operating advanced alien technology.

### Color Palette

| Role | Color | Hex Code | Usage |
|------|-------|----------|-------|
| **Deep Space** | Near-black with blue tint | `#0a0e17` | Primary background |
| **Void** | Dark navy | `#111827` | Panel backgrounds |
| **Nebula** | Dark purple | `#1a1a2e` | Card backgrounds, elevated surfaces |
| **Stardust** | Cool gray | `#2d3748` | Borders, dividers |
| **Holo Blue** | Cyan glow | `#00d4ff` | Primary accent, active states |
| **Plasma Purple** | Electric violet | `#8b5cf6` | Secondary accent, highlights |
| **Nebula Teal** | Ocean teal | `#14b8a6` | Success states, completed tasks |
| **Alert Red** | Warning crimson | `#ef4444` | Errors, blocked tasks |
| **Solar Gold** | Warm amber | `#f59e0b` | In-progress, active operations |
| **Ghost White** | Pale blue-white | `#e2e8f0` | Primary text |
| **Star Gray** | Muted silver | `#94a3b8` | Secondary text |

### Glow Effects
- **Primary glow**: `0 0 20px rgba(0, 212, 255, 0.5)` - Used for active/selected states
- **Secondary glow**: `0 0 10px rgba(139, 92, 246, 0.4)` - Used for hover states
- **Success glow**: `0 0 15px rgba(20, 184, 166, 0.5)` - Used for completed items
- **Pulse animation**: Subtle breathing effect on active agents (opacity oscillates 0.7-1.0 over 2s)

### Background Effects
- **Starfield**: CSS-generated static stars using radial gradients (tiny white dots at varying opacity 0.1-0.3)
- **Grid overlay**: Subtle `1px` lines at `rgba(45, 55, 72, 0.3)` creating a tactical grid pattern
- **Vignette**: Radial gradient from transparent center to `rgba(0, 0, 0, 0.4)` at edges

---

## 2. Typography

### Font Stack
```
Primary: 'Orbitron', sans-serif - Headings, labels, status indicators
Secondary: 'Rajdhani', sans-serif - Body text, descriptions
Monospace: 'JetBrains Mono', monospace - Code snippets, timestamps, IDs
```

### Type Scale

| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| Page Title | Orbitron | 700 | 28px | 1.2 |
| Panel Title | Orbitron | 600 | 18px | 1.3 |
| Section Header | Orbitron | 500 | 14px | 1.4 |
| Body Text | Rajdhani | 500 | 15px | 1.6 |
| Labels | Rajdhani | 600 | 12px | 1.2 |
| Timestamps | JetBrains Mono | 400 | 11px | 1.4 |
| Task Titles | Rajdhani | 600 | 16px | 1.4 |
| Status Badges | Orbitron | 500 | 10px | 1.0 |

### Text Effects
- **Headers**: Subtle text-shadow `0 0 10px rgba(0, 212, 255, 0.3)`
- **Active labels**: Glow effect matching accent color
- **Inactive text**: 60% opacity

---

## 3. Component Layout Wireframe

### Overall Layout: Orbital Command Center

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [LOGO] ARKALEDGE MISSION CONTROL              [Status] [Settings] ⚙  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────┐   │
│  │                 │  │                                             │   │
│  │  TEAM STATUS    │  │           KANBAN BOARD                      │   │
│  │  (Left Panel)   │  │     (Central Tactical Display)              │   │
│  │                 │  │                                             │   │
│  │  • PM Agent     │  │  ┌─────────┬─────────┬─────────┬─────────┐   │   │
│  │  • SM Agent     │  │  │ BACKLOG │IN PROG │ REVIEW │  DONE  │   │   │
│  │  • Engineer 1  │  │  │         │         │         │         │   │   │
│  │  • Engineer 2  │  │  │ [Task]  │ [Task]  │ [Task]  │ [Task]  │   │   │
│  │  • Reviewer     │  │  │ [Task]  │ [Task]  │         │ [Task]  │   │   │
│  │                 │  │  │ [Task]  │         │         │         │   │   │
│  │                 │  │  └─────────┴─────────┴─────────┴─────────┘   │   │
│  └─────────────────┘  └─────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │       MISSION LOG                   │  │   TASK DETAIL PANEL      │  │
│  │       (Activity Feed)               │  │   (Slide-in from right)  │  │
│  │                                     │  │                          │  │
│  │  [12:01] PM created task #3       │  │   Operation: API Impl    │  │
│  │  [12:00] SM assigned task #2        │  │   Status: In Progress    │  │
│  │  [11:58] Engineer-1 started task#2  │  │   Assignee: Engineer-1   │  │
│  │  [11:55] Task #1 passed review     │  │   Priority: High         │  │
│  │                                     │  │   Branch: feature/api    │  │
│  └─────────────────────────────────────┘  └──────────────────────────┘  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  [+ NEW MISSION]  ────────────────────────────────────────────────  ││
│  │  [Spec File: ____________]  [Launch Mission]                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### Layout Specifications

| Panel | Position | Width | Height | Behavior |
|-------|----------|-------|--------|----------|
| **Header** | Fixed top | 100% | 60px | Always visible |
| **Team Status** | Left sidebar | 240px | Calc (100vh - 140px) | Collapsible to 60px |
| **Kanban Board** | Center main | Flex | Calc (100vh - 140px) | Scrollable columns |
| **Mission Log** | Bottom left | 60% | 200px | Collapsible to 40px |
| **Task Detail** | Right overlay | 400px | 100% | Slide-in on task click |
| **Project Launcher** | Bottom bar | 100% | 80px | Always visible |

### Responsive Breakpoints
- **Desktop (≥1280px)**: Full orbital layout
- **Tablet (768-1279px)**: Team status collapses, mission log moves to tab
- **Mobile (<768px)**: Single column, bottom navigation

---

## 4. Key UI Elements

### 4.1 Header Bar
- **Logo**: Geometric "A" icon with glow effect + "ARKALEDGE" in Orbitron
- **Status indicator**: Pulsing dot (green=operational, yellow=mission active, red=error)
- **Settings gear**: Opens settings modal

### 4.2 Team Status Panel (Crew Console)

**Structure:**
```
┌──────────────────────────┐
│ ◉ CREW STATUS            │
├──────────────────────────┤
│ ┌────┐                   │
│ │ ◉  │ PRODUCT MANAGER    │
│ │    │ Agent: Claude-3    │
│ └────┘ Status: ACTIVE     │
│         Current: #3 tasks│
│                          │
│ ┌────┐                   │
│ │ ◉  │ SCRUM MASTER       │
│ │    │ Agent: Claude-3    │
│ └────┘ Status: MONITORING │
│                          │
│ ┌────┐                   │
│ │ ◉  │ ENGINEER-1        │
│ │ ▣  │ Agent: Codex       │
│ └────┘ Status: CODING     │
│         Task: API Impl    │
│                          │
│ ┌────┐                   │
│ │ ○  │ ENGINEER-2         │
│ │    │ Agent: Claude-3    │
│ └────┘ Status: IDLE       │
└──────────────────────────┘
```

**Agent Avatar**:
- Circular, 48px diameter
- Border: 2px solid with role color (PM: purple, SM: blue, Engineer: teal, Reviewer: gold)
- Inner icon represents role
- Pulse animation when active

**Agent States:**
| State | Visual | Color |
|-------|--------|-------|
| Active | Pulsing glow | Role color at 100% |
| Working | Solid glow | Solar Gold |
| Idle | Dim outline | Star Gray at 50% |
| Error | Red border + flash | Alert Red |

### 4.3 Kanban Board (Tactical Display)

**Column Headers:**
- Icon + Column name in Orbitron
- Task count badge
- Subtle vertical line divider

**Column Colors:**
| Column | Header BG | Border Accent |
|--------|-----------|---------------|
| BACKLOG | `#1a1a2e` | `#8b5cf6` (Plasma Purple) |
| IN PROGRESS | `#1a1a2e` | `#f59e0b` (Solar Gold) |
| REVIEW | `#1a1a2e` | `#00d4ff` (Holo Blue) |
| DONE | `#1a1a2e` | `#14b8a6` (Nebula Teal) |

**Task Cards:**
```
┌────────────────────────────┐
│ #123                      │
│ Implement User Auth       │
│ ─────────────────────────│
│ ⚡ High  │ 👤 Engineer-1  │
│ ⏱ 2h ago │ 🔄 1 retry     │
└────────────────────────────┘
```

**Card Styling:**
- Background: `#111827` with 1px `#2d3748` border
- Hover: Lift effect (translateY -2px) + glow border
- Selected: `#00d4ff` border glow
- Priority indicator: Colored left border (4px)
- Hover reveals quick actions (assign, move, view)

### 4.4 Mission Log (Activity Feed)

**Entry Format:**
```
[HH:MM:SS] │ TYPE_ICON │ Agent Name │ Action description
```

**Event Types & Icons:**
| Event | Icon | Color |
|-------|------|-------|
| Task Created | ✦ | Purple |
| Task Assigned | → | Blue |
| Work Started | ▶ | Gold |
| Work Completed | ✓ | Teal |
| Review Started | 🔍 | Blue |
| Review Approved | ✓✓ | Teal |
| Review Rejected | ✗ | Red |
| Error | ⚠ | Red |

**Scroll Behavior:**
- Auto-scroll to newest (toggleable)
- Maximum 500 entries displayed
- "Load more" button for history
- Filter by agent, event type

### 4.5 Task Detail Panel (Operation Briefing)

**Slide-in from right (400px width)**

```
┌────────────────────────────────┐
│ ← BACK         OPERATION #123  │
├────────────────────────────────┤
│                                │
│  Implement User Authentication │
│                                │
│  STATUS    [●] IN PROGRESS     │
│  ─────────────────────────────│
│  ASSIGNEE   Engineer-1         │
│  PRIORITY   ⚡ High            │
│  EPIC       User System        │
│  CREATED    PM Agent           │
│  RETRIES    1                  │
│                                │
├────────────────────────────────┤
│  ACCEPTANCE CRITERIA           │
│  ─────────────────────────────  │
│  □ User can register           │
│  □ User can login              │
│  □ JWT tokens issued            │
│                                │
├────────────────────────────────┤
│  BRANCH    feature/auth        │
│  WORKTREE  /worktrees/eng-1    │
│                                │
├────────────────────────────────┤
│  [View Code] [Run Tests]       │
│  [Reassign]    [Block]         │
└────────────────────────────────┘
```

**Visual Effects:**
- Slide animation: 300ms ease-out
- Backdrop blur on main content
- Close button (X) and click-outside to dismiss

### 4.6 Project Launcher (Mission Control)

**Location**: Fixed bottom bar

```
┌────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────┐   ┌───────────────┐  │
│  │  📂 Select Spec File             │   │ LAUNCH MISSION│  │
│  │  [spec.md                    ]  │   │     ▶         │  │
│  └──────────────────────────────────┘   └───────────────┘  │
│                                                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Team Config: [default.yaml v]                     │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
```

**Launch Button States:**
- Default: `#00d4ff` background, "LAUNCH MISSION"
- Hover: Glow intensifies, slight scale (1.02)
- Loading: Pulsing animation, "INITIALIZING..."
- Disabled: Grayed out, no interaction

---

## 5. Interaction Patterns

### 5.1 Navigation
- **No page navigation** - Single-page application
- **Panel collapse/expand** - Click panel headers to minimize
- **Task detail** - Click task card to open slide-in panel
- **Tab switching** - On smaller screens, bottom tabs replace panels

### 5.2 Task Interactions
| Action | Trigger | Result |
|--------|---------|--------|
| View details | Click task card | Slide-in panel opens |
| Quick assign | Drag to column | Task moves, assignee dropdown appears |
| Change status | Drag between columns | Kanban state updates |
| Create subtask | Right-click → Add subtask | Inline subtask input |
| Copy branch name | Click branch badge | Copies to clipboard |

### 5.3 Real-Time Updates
- **WebSocket/SSE**: Events stream in live
- **Optimistic UI**: Immediate visual update, rollback on error
- **Connection status**: "Reconnecting..." banner if lost
- **New event indicator**: Badge on mission log tab when new entries arrive

### 5.4 Animations

| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Panel slide-in | translateX | 300ms | ease-out |
| Task card hover | translateY + box-shadow | 150ms | ease |
| Agent pulse | opacity | 2000ms | ease-in-out (loop) |
| New log entry | fadeIn + slideDown | 400ms | ease-out |
| Button hover | scale + glow | 150ms | ease |
| Loading spinner | rotate | 1000ms | linear (loop) |
| Status change | color transition | 300ms | ease |

### 5.5 Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `N` | New mission (focus launcher) |
| `Esc` | Close task panel |
| `1-4` | Switch Kanban column focus |
| `/` | Focus search |
| `?` | Show shortcuts help |

---

## 6. Technical Implementation Notes

### 6.1 Recommended Stack
- **Framework**: React 18+ or Vue 3
- **State Management**: Zustand or Pinia
- **Styling**: Tailwind CSS + custom CSS variables
- **Real-time**: Socket.io or native WebSocket
- **Drag & Drop**: @dnd-kit or react-beautiful-dnd

### 6.2 CSS Custom Properties
```css
:root {
  --color-deep-space: #0a0e17;
  --color-void: #111827;
  --color-nebula: #1a1a2e;
  --color-stardust: #2d3748;
  --color-holo-blue: #00d4ff;
  --color-plasma-purple: #8b5cf6;
  --color-nebula-teal: #14b8a6;
  --color-alert-red: #ef4444;
  --color-solar-gold: #f59e0b;
  --color-ghost-white: #e2e8f0;
  --color-star-gray: #94a3b8;

  --font-primary: 'Orbitron', sans-serif;
  --font-secondary: 'Rajdhani', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  --glow-primary: 0 0 20px rgba(0, 212, 255, 0.5);
  --glow-secondary: 0 0 10px rgba(139, 92, 246, 0.4);
  --glow-success: 0 0 15px rgba(20, 184, 166, 0.5);
}
```

### 6.3 Accessibility
- All interactive elements have focus states with `outline: 2px solid var(--color-holo-blue)`
- ARIA labels on all icons and buttons
- Color is never the only indicator (icons + text always accompany status)
- Minimum contrast ratio 4.5:1 for text

---

## 7. Summary

This Mission Control interface transforms the Arkaledge Kanban workflow into an immersive sci-fi experience:

- **Deep space aesthetic** with starfield backgrounds and glowing accents
- **Orbital layout** keeps all panels visible in a command center feel
- **Space terminology** throughout (missions, operations, crew, mission log)
- **Real-time activity** streamed as mission events
- **Smooth animations** for all interactions (panel slides, card hovers, agent pulses)
- **Production-ready** with accessibility, responsive breakpoints, and keyboard shortcuts

The design balances visual drama with functional clarity - agents are clearly tracked, tasks are easily managed, and the overall experience feels like commanding a sophisticated AI crew on an interstellar mission.
