# Arkaledge Frontend Design - IDE/Developer Tool Aesthetic

## Design Vision

The Arkaledge dashboard reimagines the autonomous AI Scrum team platform through the lens of a modern IDE. Just as developers spend their days in VS Code, WebStorm, or Cursor, this interface treats project management as a coding activity—familiar, efficient, and deeply integrated into the workflow developers already know.

## Visual Identity

### Color Palette

**Theme: "Midnight Developer" - A deep, rich dark theme inspired by popular IDEs but with distinctive character**

```
Primary Background:
├── Base:        #0D1117 (deep space black)
├── Elevated:    #161B22 (card/panel surfaces)
├── Surface:     #21262D (input fields, hover states)
└── Border:      #30363D (subtle dividers)

Accent Colors:
├── Primary:     #58A6FF (bright azure - links, active states)
├── Secondary:   #8B949E (muted gray - secondary text)
├── Success:     #3FB950 (mint green - completed, merged)
├── Warning:     #D29922 (amber - in progress, blocked)
├── Danger:     #F85149 (coral red - errors, failed)
└── Purple:      #A371F7 (violet - special highlights)

Agent Role Colors:
├── PM:          #DB61A2 (magenta pink)
├── SM:          #79C0FF (sky blue)
├── Engineer:    #7EE787 (mint)
└── Reviewer:    #FFA657 (orange)

Syntax Highlighting (for code/logs):
├── Keyword:     #FF7B72 (salmon)
├── String:      #A5D6FF (light blue)
├── Number:      #79C0FF (sky)
├── Comment:     #8B949E (gray)
├── Function:    #D2A8FF (lavender)
└── Variable:    #FFA657 (orange)
```

### Typography

**Primary Font: "JetBrains Mono" for all text - unified, developer-native experience**

```
Headings:
├── H1: 24px, weight 600, letter-spacing -0.5px
├── H2: 18px, weight 600, letter-spacing -0.3px
├── H3: 14px, weight 600, uppercase, letter-spacing 1px
└── H4: 13px, weight 500

Body:
├── Large:  14px, weight 400, line-height 1.6
├── Base:   13px, weight 400, line-height 1.5
└── Small:  12px, weight 400, line-height 1.4

Monospace (logs, code):
├── Base:   12px, weight 400, line-height 1.6
└── Status: 11px, weight 500, uppercase
```

### Spacing System

```
Unit Scale (4px base):
├── xs:   4px
├── sm:   8px
├── md:   12px
├── lg:   16px
├── xl:   24px
└── 2xl: 32px
```

### Visual Effects

```
Shadows:
├── Subtle:   0 1px 2px rgba(0,0,0,0.3)
├── Elevated: 0 4px 12px rgba(0,0,0,0.4)
└── Modal:    0 8px 32px rgba(0,0,0,0.6)

Borders:
├── Default: 1px solid #30363D
├── Active:  1px solid #58A6FF
└── Radius:  6px (cards), 4px (buttons), 2px (inputs)

Animations:
├── Transition: 150ms ease-out
├── Slide:     200ms cubic-bezier(0.4, 0, 0.2, 1)
└── Pulse:     2s infinite for active indicators
```

---

## Layout Architecture

### Overall Structure: Four-Panel IDE Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Title Bar (32px)                                                        │
│ [Arkaledge] ─── project-name —──────────────────────── [─] [□] [×]   │
├────────┬──────────────────────────────────────────────────────────────┤
│        │ Tab Bar (36px)                                                │
│ Activity│[Board] [Activity] [Team] [Settings]                         │
│  Bar   ├──────────────────────────────────────────────────────────────┤
│ (48px) │                                                              │
│        │ Main Content Area                                            │
│ [🔬]   │ (flexible height)                                            │
│ [📋]   │                                                              │
│ [👥]   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│ [⚙️]   │  │ Backlog │ │In Progress│ │ Review  │ │  Done   │             │
│        │  │         │ │         │ │         │ │         │             │
│        │  │ [Card]  │ │ [Card]  │ │ [Card]  │ │ [Card]  │             │
│        │  │ [Card]  │ │ [Card]  │ │         │ │ [Card]  │             │
│        │  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│        │                                                              │
├────────┼──────────────────────────────────────────────────────────────┤
│        │ Terminal Panel (resizeable, default 200px)                  │
│ Status │ > PM analyzing spec...                                      │
│  Bar   │ > SM assigning tasks...                                     │
│ (24px) │ > Engineer-1 starting task #42...                          │
└────────┴──────────────────────────────────────────────────────────────┘
```

### Detailed Panel Descriptions

---

## Component Specifications

### 1. Activity Bar (Leftmost - 48px width)

A vertical icon bar similar to VS Code's activity bar. Fixed position, no scrolling.

**Icons (top to bottom):**
- 🧪 **Launch** - Create new project from spec
- 📋 **Board** - Kanban board view (active by default)
- 👥 **Team** - Agent status and activity
- 📊 **Activity** - Full activity log
- ⚙️ **Settings** - Configuration panel

**States:**
- Default: #8B949E icon color
- Hover: #E6EDF3 background (#21262D)
- Active: #58A6FF icon + left border 2px accent

---

### 2. Title Bar (Top - 32px height)

```
┌─────────────────────────────────────────────────────────────┐
│ [● ◆ ◈]  Arkaledge  │  project-name  │ ─ ─ ─ ─ ─ ─ ─ ─ ─  │  [_][□][×] │
└─────────────────────────────────────────────────────────────┘
     ^        ^            ^                    ^              ^
   Window   App Name    Project Name         Breadcrumbs     Window
   Controls                                    (optional)    Controls
```

**Elements:**
- Window controls (Linux: close/minimize/maximize on left)
- App icon + "Arkaledge" text
- Current project name (bold)
- Spacer
- Zoom controls (optional)

---

### 3. Tab Bar (Below title - 36px height)

Horizontal tabs for switching views within main content area.

```
┌─────────────────────────────────────────────────────────────┐
│ [ Board ]  [ Activity ]  [ Team ]  [ Settings ]    [+ New]  │
└─────────────────────────────────────────────────────────────┘
     ^                                            ^
   Active Tab                                  Add Tab
```

**Tab States:**
- Inactive: #8B949E text, transparent background
- Hover: #E6EDF3 text, #21262D background
- Active: #E6EDF3 text, bottom border 2px #58A6FF

---

### 4. Kanban Board (Main Content - Primary View)

Four columns matching the Arkaledge workflow: `backlog` → `in_progress` → `review` → `done`

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   BACKLOG    │ │ IN PROGRESS  │ │   REVIEW     │ │    DONE      │
│  (12 tasks)  │ │  (3 tasks)   │ │  (1 task)    │ │  (47 tasks)  │
├──────────────┤ ├──────────────┤ ├──────────────┤ ├──────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │ Task Card│ │ │ Task Card│ │ │ Task Card│ │ │ │ Task Card│ │
│ │ ──────── │ │ │ ──────── │ │ │ ──────── │ │ │ │ ──────── │ │
│ │ #42      │ │ │ #39      │ │ │ #41      │ │ │ │ #38      │ │
│ │ Auth API │ │ │ Fix bug  │ │ │ Refactor │ │ │ │ Setup    │ │
│ │ ──────── │ │ │ ──────── │ │ │ ──────── │ │ │ │ ──────── │ │
│ │ 🏗️ PM    │ │ │ 👷 Eng-2 │ │ │ 👁️ Review│ │ │ │ ✅ Merged│ │
│ │ P1  🔒   │ │ │ P1  ⚡   │ │ │ P2  ⏱️   │ │ │ │ P1  ✓    │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ │ └──────────┘ │
│ ┌──────────┐ │ ┌──────────┐ │              │ │ ┌──────────┐ │
│ │ Task Card│ │ │ Task Card│ │              │ │ │ Task Card│ │
│ └──────────┘ │ └──────────┘ │              │ │ └──────────┘ │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### Task Card Design

```
┌────────────────────────────────────────┐
│ #42  Implement OAuth2 Authentication   │
│ ────────────────────────────────────── │
│                                        │
│  Story: As a user I want to sign in... │
│                                        │
│ ────────────────────────────────────── │
│ 👤 engineer-1  │  P1  │  🔒 Security   │
│ ⏱️ 2h ago      │  📝 3 subtasks      │
└────────────────────────────────────────┘
```

**Card Anatomy:**
- Task ID + Title (bold, truncate at 2 lines)
- Description preview (1 line, faded)
- Divider line
- Bottom row: Assignee avatar | Priority badge | Tags
- Metadata row: Time + Subtask count

**Priority Badges:**
- P0: #F85149 background, white text
- P1: #D29922 background, dark text
- P2: #8B949E background, dark text

**Card Interactions:**
- Hover: Elevated shadow, border glow #58A6FF
- Click: Opens task detail panel (slide-in from right)
- Drag: Visual feedback with drop zone highlighting
- Right-click: Context menu (assign, change priority, move)

---

### 5. Task Detail Panel (Slide-in Panel - 400px width)

Appears when clicking a task card. Slides in from right edge, overlays content.

```
┌────────────────────────────────────────┐
│ ← Back                    Task #42    │
├────────────────────────────────────────┤
│ Title                                  │
│ ┌────────────────────────────────────┐ │
│ │ Implement OAuth2 Authentication    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Status                                 │
│ [In Progress           ▼]             │
│                                        │
│ Assignee                               │
│ [👤 engineer-1          ▼]             │
│                                        │
│ Priority     [P1 - High      ▼]       │
│                                        │
│ Description                             │
│ ┌────────────────────────────────────┐ │
│ │ As a user, I want to authenticate  │ │
│ │ with OAuth2 so that...              │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Subtasks (3/3 complete)                │
│ ├ ☑ Create OAuth2 service             │
│ ├ ☑ Add login endpoint                │
│ └ ☑ Implement callback handler        │
│                                        │
│ Activity                               │
│ ├ 2h ago: Started by engineer-1       │
│ ├ 3h ago: Assigned to engineer-1      │
│ └ 5h ago: Created by PM                │
│                                        │
│ ─────────────────────────────────────  │
│ [Move to Review]  [Edit]  [Delete]     │
└────────────────────────────────────────┘
```

**Panel Behaviors:**
- Overlay with backdrop blur
- Close via X button, Escape key, or clicking backdrop
- Smooth slide animation (200ms)
- Scrollable content area

---

### 6. Agent Activity Feed (Terminal Panel)

A terminal-like component showing real-time agent actions. Similar to VS Code's integrated terminal but styled for agent monitoring.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Terminal] [Problems] [Output] [Debug Console]            [_] [□] [×] │
├─────────────────────────────────────────────────────────────────────────┤
│ > ───────────────────────────────────────────────────────────────────  │
│ > 🧪 PM: Analyzing spec file...                                      │
│ > 🧪 PM: Identified 12 tasks from spec                               │
│ > 🧪 PM: Created task breakdown in kanban                             │
│ > ───────────────────────────────────────────────────────────────────  │
│ > 👷 SM: Starting daily standup...                                   │
│ > 👷 SM: 3 tasks in progress, 47 completed                           │
│ > 👷 SM: No blockers detected                                        │
│ > ───────────────────────────────────────────────────────────────────  │
│ > 👷 Engineer-1: Starting task #42 "Implement OAuth2"                │
│ > 👷 Engineer-1: Creating branch feature/oauth2                      │
│ > 👷 Engineer-1: Writing tests...                                     │
│ > 👷 Engineer-1: ✓ Tests passing                                     │
│ > ───────────────────────────────────────────────────────────────────  │
│ > 👁️ Reviewer: Pull request #42 ready for review                     │
│ > 👁️ Reviewer: Reviewing diff...                                     │
│ > ───────────────────────────────────────────────────────────────────  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
     ^                                                            ^
   Input                                                    Auto-scroll
   (future)                                                 to bottom
```

**Terminal Features:**
- Monospace font (JetBrains Mono 12px)
- Color-coded agent prefixes:
  - 🧪 PM: #DB61A2
  - 👷 SM: #79C0FF
  - 👷 Engineer-X: #7EE787
  - 👁️ Reviewer: #FFA657
  - ⚙️ System: #8B949E
- Timestamp on hover for each line
- Clickable elements (task IDs, PR numbers)
- Filter by agent type
- Search within logs
- Copy line/selection

---

### 7. Team Status Panel

Shows all AI agents, their current status, and what they're working on.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 👥 Team Status                                    [Show: All ▼]        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🧪 Product Manager                                              │   │
│  │ ─────────────────────────────────────────────────────────────  │   │
│  │ Status: ● Active                                                │   │
│  │ Current: Analyzing project-spec.md                            │   │
│  │ Tasks completed today: 8                                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 👷 Scrum Master                                                 │   │
│  │ ─────────────────────────────────────────────────────────────  │   │
│  │ Status: ● Active                                                │   │
│  │ Current: Assigning task #43 to engineer-2                     │   │
│  │ Sprint progress: 12/24 tasks (50%)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                   │
│  │ 👷 Engineer-1│ │ 👷 Engineer-2│ │ 👷 Engineer-3│                   │
│  │ ──────────── │ │ ──────────── │ │ ──────────── │                   │
│  │ ● Active     │ │ ○ Idle       │ │ ● Active     │                   │
│  │ #42 OAuth2   │ │ Waiting...   │ │ #38 Tests    │                   │
│  │ ⏱️ 2h        │ │              │ │ ⏱️ 45m       │                   │
│  └──────────────┘ └──────────────┘ └──────────────┘                   │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 👁️ Reviewer                                                     │   │
│  │ ─────────────────────────────────────────────────────────────  │   │
│  │ Status: ● Active                                               │   │
│  │ Current: Reviewing PR #42                                      │   │
│  │ Queue: 1 PR waiting                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Agent Status Indicators:**
- ● Active (pulsing green dot): Currently working
- ○ Idle (gray dot): Waiting for task
- ⚠ Blocked (yellow triangle): Needs assistance
- ⏸ Paused (blue pause icon): Suspended

---

### 8. Project Launcher (Modal)

A modal dialog for starting new projects from specs.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         🚀 Launch New Project                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Project Name                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ my-awesome-project                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Spec File                                                              │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ /path/to/project-spec.md                              [Browse]│     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  Configuration                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ /path/to/config.yaml                                 [Browse]│     │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Output Directory                                                      │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ /workspace/output                                   [Browse]│     │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  Team Size                                                             │
│  ○ 1 Engineer    ● 3 Engineers    ○ 5 Engineers                       │
│                                                                         │
│  ───────────────────────────────────────────────────────────────────   │
│                                                                         │
│                              [Cancel]  [Launch Project]                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Form Elements:**
- All inputs use #21262D background, #30363D border
- Focus state: #58A6FF border glow
- Validation errors: #F85149 border, error message below
- Buttons: Primary (#238636), Secondary (outline #30363D)

---

### 9. Status Bar (Bottom - 24px height)

Similar to VS Code's status bar, showing contextual information.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🧪 PM ● │ 👷 3 active │ ⏵ master │  ✓ Connected │ 12:45 PM │ UTF-8  │
└─────────────────────────────────────────────────────────────────────────┘
 ^       ^    ^        ^          ^              ^          ^
 │       │    │        │          │              │          │
 │       │    │        │          │              │          └─ Encoding
 │       │    │        │          │              └─ Time
 │       │    │        │          └─ Connection status
 │       │    │        └─ Branch name
 │       │    └─ Active engineers count
 │       └─ PM status indicator
 └─ Current agent view (clickable to filter)
```

---

## Interaction Patterns

### Navigation

1. **Activity Bar Click**: Switches main view, updates tab bar
2. **Tab Click**: Changes content within current view
3. **Keyboard Shortcuts**:
   - `Ctrl/Cmd + 1-4`: Switch to tab 1-4
   - `Ctrl/Cmd + B`: Toggle sidebar
   - `Ctrl/Cmd + J`: Toggle terminal panel
   - `Escape`: Close modal/panel

### Kanban Interactions

1. **Card Click**: Opens task detail panel
2. **Card Drag**: Move between columns, updates task status
3. **Column Header Click**: Collapse/expand column
4. **Card Hover**: Shows quick actions (assign, change priority)

### Terminal Interactions

1. **Auto-scroll**: Terminal scrolls to bottom on new output
2. **Scroll lock**: Click to pause auto-scroll, manual scroll enables it
3. **Text selection**: Standard mouse selection, copy on Ctrl+C
4. **Click on task/PR**: Navigate to that entity
5. **Filter dropdown**: Show/hide specific agent types

### Modal Interactions

1. **Open**: Fade in backdrop, slide down modal
2. **Close**: Click outside, X button, or Escape key
3. **Form submission**: Enter key submits, validation on blur

---

## Responsive Behavior

### Desktop (1200px+)
Full four-panel layout as designed

### Tablet (768px - 1199px)
- Activity bar collapses to icons only (32px)
- Terminal panel hidden by default, toggle via keyboard
- Kanban columns stack 2x2

### Mobile (< 768px)
- Single column view
- Bottom navigation bar replaces activity bar
- Task detail becomes full-screen modal
- Terminal in separate "Activity" tab

---

## Accessibility Considerations

1. **Keyboard Navigation**: All interactive elements reachable via Tab
2. **Focus Indicators**: Visible #58A6FF outline on focus
3. **Color Contrast**: All text meets WCAG AA (4.5:1 minimum)
4. **Screen Reader**: ARIA labels on icons and non-text elements
5. **Reduced Motion**: Respect `prefers-reduced-motion` media query

---

## Implementation Notes

### Tech Stack Recommendation
- **Framework**: React or Vue 3 (component-based, reactive)
- **State**: Zustand or Pinia (lightweight, TypeScript-friendly)
- **Styling**: CSS Modules or Tailwind with custom theme
- **Drag & Drop**: @dnd-kit (accessible, lightweight)
- **Icons**: Lucide (consistent, MIT licensed)
- **Fonts**: JetBrains Mono (Google Fonts or self-hosted)

### Performance Targets
- Initial load: < 2s
- Interaction response: < 100ms
- Smooth 60fps animations

---

## Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --bg-base: #0D1117;
  --bg-elevated: #161B22;
  --bg-surface: #21262D;
  --border-default: #30363D;
  --border-active: #58A6FF;

  --text-primary: #E6EDF3;
  --text-secondary: #8B949E;
  --text-muted: #6E7681;

  --accent-primary: #58A6FF;
  --accent-success: #3FB950;
  --accent-warning: #D29922;
  --accent-danger: #F85149;
  --accent-purple: #A371F7;

  --agent-pm: #DB61A2;
  --agent-sm: #79C0FF;
  --agent-engineer: #7EE787;
  --agent-reviewer: #FFA657;

  /* Typography */
  --font-mono: 'JetBrains Mono', monospace;
  --font-size-xs: 11px;
  --font-size-sm: 12px;
  --font-size-base: 13px;
  --font-size-lg: 14px;
  --font-size-xl: 18px;
  --font-size-2xl: 24px;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* Effects */
  --shadow-subtle: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-elevated: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-modal: 0 8px 32px rgba(0,0,0,0.6);
  --radius-sm: 4px;
  --radius-md: 6px;
  --transition-fast: 150ms ease-out;
  --transition-normal: 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Summary

This design transforms Arkaledge into a familiar, developer-centric interface that feels like an extension of the tools engineers already use daily. The IDE aesthetic provides:

1. **Familiarity**: Developers instantly understand the layout
2. **Efficiency**: Keyboard shortcuts, dense information, quick actions
3. **Visual Hierarchy**: Clear distinction between areas of responsibility
4. **Real-time Feedback**: Terminal-style activity feed keeps everyone informed
5. **Professional Polish**: Consistent design tokens, smooth animations, thoughtful interactions

The result is a dashboard that feels less like a management tool and more like a powerful IDE for orchestrating autonomous AI teams.
