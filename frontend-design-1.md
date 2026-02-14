# Arkaledge Frontend Design - Terminal/Hacker Aesthetic

## Project Overview

Arkaledge Dashboard - A retro terminal-inspired interface for managing autonomous AI Scrum teams. The design evokes classic green-screen terminals, hacker culture, and cyberpunk aesthetics while maintaining modern usability.

---

## Visual Description

### Overall Aesthetic
- **Theme**: Retro terminal / Hacker / Cyberpunk
- **Mood**: Functional, immersive, slightly mysterious
- **Key Visual Elements**: Scanlines, phosphor glow, ASCII art, blinking cursors

### Color Palette

| Role | Color | Hex Code | Usage |
|------|-------|----------|-------|
| **Primary Background** | Deep Black | `#0a0a0a` | Main background |
| **Secondary Background** | Dark Terminal | `#0d1117` | Panel backgrounds |
| **Tertiary Background** | Charcoal | `#161b22` | Cards, elevated surfaces |
| **Primary Accent** | Phosphor Green | `#00ff41` | Primary text, active states |
| **Secondary Accent** | Amber Warning | `#ffb000` | Warnings, in-progress |
| **Tertiary Accent** | Cyan Info | `#00d4ff` | Links, info highlights |
| **Error Accent** | Red Alert | `#ff3333` | Errors, blockers |
| **Muted Text** | Dim Green | `#0f5132` | Secondary text, disabled |
| **Border Color** | Terminal Green | `#1a3a2a` | Panel borders |
| **Glow Effect** | Green Glow | `rgba(0, 255, 65, 0.15)` | Hover states, focus |

### Typography

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| **Headers (H1)** | "Fira Code", monospace | 28px | 700 | `#00ff41` |
| **Subheaders (H2)** | "Fira Code", monospace | 20px | 600 | `#00ff41` |
| **Body Text** | "JetBrains Mono", monospace | 14px | 400 | `#00ff41` |
| **Code/Monospace** | "Fira Code", monospace | 13px | 400 | `#00ff41` |
| **Small/Labels** | "JetBrains Mono", monospace | 12px | 400 | `#0f5132` |
| **ASCII Art** | "Courier New", monospace | Variable | 400 | `#00ff41` |

### Spacing System
- Base unit: 8px
- Panel padding: 24px (3 units)
- Card padding: 16px (2 units)
- Element gap: 8px (1 unit)
- Border radius: 2px (minimal, sharp edges)

---

## Component Layout Wireframe

```
+================================================================================+
|  > ARKALEDGE_AUTONOMOUS_SCRUM_TEAM_PLATFORM v2.4.7_                          |
+================================================================================+
|  [COMMAND:>_] [CONFIG:spec.yaml] [STATUS:ACTIVE]           [?] [⚙] [EXIT]     |
+--------------------------------------------------------------------------------+
|                                                                                |
|  +-----------------------------+  +---------------------------------------+    |
|  | PROJECT LAUNCHER            |  | TEAM STATUS                            |    |
|  | > Submit new specification  |  | ┌─────────────────────────────────┐   |    |
|  | +-------------------------+ |  | │ ● PM-AGENT    [ACTIVE]          │   |    |
|  | | spec_file.md            | |  | │   └─ Analyzing requirements     │   |    |
|  | +-------------------------+ |  | │ ● SM-AGENT     [ACTIVE]          │   |    |
|  | [EXECUTE:> run]            |  |  | │   └─ Assigning tasks             │   |    |
|  |                             |  |  │ ● ENGINEER-1  [BUILDING]         │   |    |
|  +-----------------------------+  | │   └─ Implementing: Task #42       │   |    |
|                                   | │ ● ENGINEER-2  [IDLE]             │   |    |
|  +-----------------------------+  | │ ● REVIEWER    [WAITING]          │   |    |
|  | AGENT ACTIVITY FEED         |  | │   └─ Pending reviews: 2          │   |    ( |
|  |Real-time Logs)            |  | └─────────────────────────────────┘   |    |
|  |                             |  +---------------------------------------+    |
|  | [14:32:01] PM: Breaking     |                                              |
|  |         down spec into      |  +---------------------------------------+    |
|  |         tasks...            |  | TASK DETAIL PANEL                     |    |
|  | [14:32:02] SM: Task #42     |  | > TASK-042                             |    |
|  |         assigned to         |  | ┌─────────────────────────────────────┐|    |
|  |         ENGINEER-1          |  | │ TITLE: Implement auth middleware  │|    |
|  | [14:32:03] ENG-1: Starting  |  | │ STATUS: [IN_PROGRESS]              │|    |
|  |         worktree feature/   |  | │ PRIORITY: HIGH                     │|    |
|  |         auth                 |  │ │ ASSIGNED: ENGINEER-1              │|    |
|  | [14:32:04] PM: Created       |  | │ ESTIMATED: 2h 15m                 │|    |
|  |         5 sub-tasks         |  | │ ELAPSED: 47m 32s                  │|    |
|  |                             |  | └─────────────────────────────────────┘|    |
|  | [14:32:05] REVIEWER:        |  | | HISTORY:                            |    |
|  |         Review requested    |  | | > Created by PM @ 14:15            |    |
|  |         for Task #39        |  | | > Assigned @ 14:20                 |    |
|  |                             |  | | > Started @ 14:32                  |    |
|  +-----------------------------+  | +---------------------------------------+    |
|                                   |                                              |
+-----------------------------------+----------------------------------------------+
|  +-----------------------------------------------------------------------+    |
|  | KANBAN BOARD                                                          |    |
|  |                                                                       |    |
|  | +------------+ +------------+ +------------+ +------------+            |    |
|  | |  BACKLOG   | |IN_PROGRESS | |   REVIEW   | |    DONE    |            |    |
|  | |  [12]      | |   [3]       | |   [2]      | |   [28]     |            |    |
|  | +------------+ +------------+ +------------+ +------------+            |    |
|  | | TASK-051   | | TASK-042   | | TASK-039   | | TASK-001   |            |    |
|  | | TASK-050   | | TASK-041   | | TASK-038   | | TASK-002   |            |    |
|  | | TASK-049   | | TASK-040   | |            | | TASK-003   |            |    |
|  | | ...        | |            | |            | | ...        |            |    |
|  | +------------+ +------------+ +------------+ +------------+            |    |
|  |                                                                       |    |
|  +-----------------------------------------------------------------------+    |
|                                                                                |
+================================================================================+
|  SYSTEM: Connected | MEM: 2.4GB | UPTIME: 04:23:15 | COMMANDS: 1,247           |
+================================================================================+
```

---

## Component Details

### 1. Project Launcher Panel

**Purpose**: Submit and launch new project specifications

**Visual Design**:
- ASCII art header: `[▓▓▓ PROJECT LAUNCHER ▓▓▓]`
- Input field with blinking cursor: `>_ spec_file.md`
- Execute button styled as terminal command: `[EXECUTE:> run]`
- Subtle scanline overlay effect

**States**:
- Default: Dim border `#1a3a2a`
- Hover: Glowing border `rgba(0, 255, 65, 0.3)`
- Active/Focus: Bright phosphor green border with glow
- Loading: Pulsing animation with typewriter effect

### 2. Kanban Board

**Purpose**: Visual task management across workflow stages

**Column Design**:
- Column headers as terminal-style labels: `:: BACKLOG [12] ::`
- Task cards as rectangular terminal windows
- Status indicators as bracketed text: `[▸TASK-042]`

**Task Card States**:
- Default: `#161b22` background, `#1a3a2a` border
- Hover: Green glow effect, slight lift
- Selected: Bright green border, active cursor indicator
- Blocked: Amber warning indicator `⚠`
- Completed: Muted green with strike-through title

**Drag & Drop**:
- Visual ghost with 50% opacity
- Drop zones highlight with pulsing green border

### 3. Agent Activity Feed

**Purpose**: Real-time streaming logs from all agents

**Visual Design**:
- Terminal-style log output with timestamp prefix
- Agent identifier as colored tag: `[PM]`, `[SM]`, `[ENG-1]`, `[REV]`
- Color-coded by agent type:
  - PM: Cyan `#00d4ff`
  - SM: Amber `#ffb000`
  - Engineer: Green `#00ff41`
  - Reviewer: Purple `#b388ff`

**Features**:
- Auto-scroll with pause on hover
- Timestamp format: `[HH:MM:SS]`
- Command output: Lines prefixed with `> `
- Error output: Red highlighted
- Success output: Dim green with checkmark

### 4. Task Detail Panel

**Purpose**: View and manage individual task information

**Sections**:
```
> TASK-042 ─────────────────────────────────
│ TITLE:    Implement auth middleware     │
│ STATUS:   [█░░░░░░░░] IN_PROGRESS (43%) │
│ PRIORITY: [★★★] HIGH                     │
│ ASSIGNED: ENGINEER-1                     │
│ ESTIMATED: 2h 15m                        │
│ ELAPSED:   47m 32s [████████░░░░]        │
│ SPRINT:   Sprint-3                       │
├─────────────────────────────────────────
│ DESCRIPTION:                             │
│ > Implement JWT-based authentication     │
│ > middleware with refresh tokens         │
│ > - /api/auth/login                      │
│ > - /api/auth/refresh                    │
│ > - /api/auth/logout                     │
├─────────────────────────────────────────
│ SUBTASKS:                                │
│ [✓] Database schema for sessions        │
│ [✓] JWT token generation                 │
│ [▢] Refresh token rotation               │
│ [▢] Logout endpoint                      │
├─────────────────────────────────────────
│ ACTIONS:                                  │
│ [REASSIGN] [BLOCK] [PRIORITY+] [ARCHIVE] │
└─────────────────────────────────────────
```

### 5. Team Status Panel

**Purpose**: Show active agents and their current activities

**Agent Card Design**:
```
┌─────────────────────────────────────────┐
│ ● AGENT-NAME         [STATUS]           │
│   └─ Current activity description       │
│   └─ Progress: ████████░░ 80%           │
└─────────────────────────────────────────┘
```

**Status Indicators**:
- `ACTIVE`: Pulsing green dot
- `IDLE`: Dim green dot
- `BUILDING`: Animated progress bar
- `WAITING`: Blinking amber dot
- `ERROR`: Red dot with error message

---

## Interaction Patterns

### Command Palette
- Global shortcut: `Ctrl+K` or `Cmd+K`
- Terminal-style input: `>_ command`
- Autocomplete with fuzzy matching
- Command history (up/down arrows)

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Ctrl+N` | New project |
| `Ctrl+1-4` | Switch to kanban column |
| `j/k` | Navigate tasks (vim-style) |
| `Enter` | Open selected task |
| `Esc` | Close panel/dialog |
| `r` | Refresh feed |
| `?` | Show help |

### Tooltips
- Appear after 500ms hover
- Styled as terminal output: `> Description text`
- Max width: 300px

### Notifications
- Toast notifications as terminal messages:
  ```
  [SYSTEM] > Task #42 moved to REVIEW
  ```
- Auto-dismiss after 5 seconds
- Stack from bottom-right

### Animations

| Animation | Duration | Easing |
|-----------|----------|--------|
| Panel transitions | 200ms | ease-out |
| Hover glow | 150ms | ease-in |
| Cursor blink | 1000ms | infinite |
| Scanline scroll | 8s | linear |
| Task drag | 200ms | ease-out |
| Feed update | 300ms | ease-in-out |

---

## Key UI Elements

### 1. ASCII Art Headers
- Main logo: Terminal-style "ARKALEDGE" with box drawing characters
- Decorative borders using box drawing: `┌─┐│└┘├┤┬┴┼`
- Programmatic sub-headers using brackets: `[▓▓▓ SECTION ▓▓▓]`

### 2. Status Indicators
- Progress bars: `████████░░░░` (filled/empty blocks)
- Percentage: `[████████░░░░] 80%`
- Spinner: `[▓▓▓░░░░░░░░]` (rotating animation)

### 3. Buttons
```
[PRIMARY]:    [ EXECUTE:> run    ]  - Green border, green text
[SECONDARY]:  [ CANCEL          ]  - Dim green border
[DANGER]:     [ DELETE:!        ]  - Red border, red text
```

### 4. Input Fields
```
> filename.md________________
  ^ Blinking cursor
```

### 5. Terminal Window Frame
```
┌─ WINDOW_TITLE ─────────────────────┐
│                                     │
│  Content here...                   │
│                                     │
└─────────────────────────────────────┘
```

### 6. Scanline Overlay
- Subtle CSS pseudo-element with repeating gradient
- Opacity: 3-5%
- Animated vertical scroll (optional, can be disabled)

### 7. Glow Effects
- Text-shadow for active elements: `0 0 10px #00ff41`
- Box-shadow for panels: `0 0 20px rgba(0, 255, 65, 0.15)`

---

## Responsive Behavior

### Desktop (1200px+)
- Full layout as shown in wireframe
- All panels visible simultaneously

### Tablet (768px - 1199px)
- Stacked layout: Launcher → Team Status → Kanban
- Activity feed collapses to icon + expandable drawer

### Mobile (< 768px)
- Single column, tabbed navigation
- Kanban as horizontal scroll
- Bottom navigation bar

---

## Accessibility Considerations

- All colors meet WCAG AA contrast (4.5:1 for text)
- Keyboard navigation for all interactions
- Screen reader labels on all interactive elements
- Reduced motion mode (disable animations)
- Focus indicators: Bright green outline

---

## Implementation Notes

### CSS Custom Properties
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #0d1117;
  --bg-tertiary: #161b22;
  --accent-primary: #00ff41;
  --accent-secondary: #ffb000;
  --accent-info: #00d4ff;
  --accent-error: #ff3333;
  --text-muted: #0f5132;
  --border-color: #1a3a2a;
  --glow: rgba(0, 255, 65, 0.15);
  --font-mono: 'Fira Code', 'JetBrains Mono', monospace;
}
```

### Recommended Libraries
- **Framework**: React or Vue with TypeScript
- **State**: Zustand or similar lightweight store
- **Styling**: CSS Modules or Styled Components
- **Icons**: Custom SVG terminal-style icons
- **Animations**: Framer Motion (with reduced motion support)
- **Drag & Drop**: @dnd-kit/core

---

## File Structure Recommendation

```
/frontend
├── src/
│   ├── components/
│   │   ├── ProjectLauncher/
│   │   ├── KanbanBoard/
│   │   ├── TaskCard/
│   │   ├── AgentFeed/
│   │   ├── TeamStatus/
│   │   ├── TaskDetail/
│   │   └── common/
│   │       ├── TerminalFrame/
│   │       ├── Button/
│   │       ├── Input/
│   │       └── ProgressBar/
│   ├── hooks/
│   ├── stores/
│   ├── styles/
│   │   └── variables.css
│   └── App.tsx
├── public/
│   └── fonts/
└── index.html
```
