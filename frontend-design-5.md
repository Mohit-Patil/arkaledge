# Arkaledge Frontend Design - Zen Workshop

## Design Direction

**Aesthetic**: "Zen Workshop" - A refined, Japanese craft-inspired minimalism where every element has purpose and place. Think sophisticated dashboard meets pottery studio. Clean, intentional, with subtle warmth that feels human而不是冷冰冰。

**Core Vibe**: Quiet competence. This is a tool for autonomous teams that hums with quiet efficiency. Not flashy, but beautiful in its restraint.

---

## Visual Foundation

### Color Palette

```css
:root {
  /* Base - warm charcoal */
  --bg-primary: #1a1a1e;
  --bg-secondary: #232328;
  --bg-tertiary: #2a2a30;
  --bg-elevated: #32323a;

  /* Text - warm white */
  --text-primary: #f5f5f3;
  --text-secondary: #a8a8a3;
  --text-muted: #6b6b67;

  /* Accents - amber/warm gold */
  --accent-primary: #e8b84a;
  --accent-secondary: #d4a43a;
  --accent-glow: rgba(232, 184, 74, 0.15);

  /* Status colors */
  --status-backlog: #8b8b9e;
  --status-progress: #5b9cf6;
  --status-review: #c792ea;
  --status-done: #7ec699;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-active: rgba(232, 184, 74, 0.3);

  /* Shadows */
  --shadow-soft: 0 4px 24px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 8px 40px rgba(0, 0, 0, 0.4);
}
```

### Typography

**Primary Font**: "DM Sans" - refined, geometric, excellent readability
**Display Font**: "Fraunces" - a variable serif with character, warmth, and optical sizing

```
Headings: Fraunces, 600 weight
  - H1: 32px / 1.2
  - H2: 24px / 1.25
  - H3: 18px / 1.3

Body: DM Sans, 400/500 weight
  - Large: 15px / 1.5
  - Regular: 13px / 1.5
  - Small: 11px / 1.4
```

---

## Layout Structure

The interface uses a **3-column bento grid** layout:

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Project Name + Quick Actions                        │
├─────────────┬─────────────────────────────────────┬───────────────┤
│             │                                     │               │
│   TEAM      │        KANBAN BOARD                 │   TASK        │
│   STATUS    │   ┌─────┬─────┬─────┬─────┐         │   DETAIL      │
│   (1x2)     │   │back │prog │rev  │done │         │   PANEL       │
│             │   │log  │ress │iew  │     │         │   (1x2)       │
│             │   └─────┴─────┴─────┴─────┘         │               │
├─────────────┤                                     │               │
│             │                                     │               │
│  ACTIVITY   │        PROJECT LAUNCHER             │               │
│  FEED       │   (appears in dedicated card)       │               │
│  (1x1)      │                                     │               │
│             │                                     │               │
└─────────────┴─────────────────────────────────────┴───────────────┘
```

### Grid Specifications

- **Grid gap**: 16px
- **Container padding**: 24px
- **Max width**: 1600px centered
- **Bento cards**: border-radius: 20px, subtle border, soft shadow

---

## Component Specifications

### 1. Header Bar

```
┌─────────────────────────────────────────────────────────────────────┐
│  ● ● ●    Arkaledge          Sprint Q1 2026    [New Project] [⚙] │
└─────────────────────────────────────────────────────────────────────┘
```

- Fixed height: 64px
- Logo: Small geometric mark (diamond/hexagon) in amber
- Project name in Fraunces, 20px
- Quick actions: minimal icon buttons with tooltips

### 2. Team Status Panel (Left Column, Top)

```
┌───────────────────┐
│  TEAM              │
├───────────────────┤
│  ┌───────────────┐ │
│  │ ● Product     │ │
│  │   Manager     │ │
│  │   "Analyzing" │ │
│  └───────────────┘ │
│                   │
│  ┌───────────────┐ │
│  │ ● Scrum       │ │
│  │   Master      │ │
│  │   "Sprint 3"  │ │
│  └───────────────┘ │
│                   │
│  ○ Engineer 1     │
│  ○ Engineer 2     │
│  ○ Engineer 3     │
│                   │
│  ○ Reviewer       │
└───────────────────┘
```

**Design**:
- Each agent as a rounded pill/card
- Active: amber dot + subtle glow
- Idle: muted gray
- Current action shown in secondary text
- Subtle pulse animation on active agents

### 3. Kanban Board (Center, 4 columns)

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKLOG        IN PROGRESS       REVIEW          DONE          │
├────────────────┬────────────────┬────────────────┬──────────────┤
│                │                │                │              │
│  ┌──────────┐  │  ┌──────────┐  │  ┌──────────┐  │  ┌──────────┐ │
│  │ Task #12 │  │  │ Task #8  │  │  │ Task #5  │  │  │ Task #1  │ │
│  │ API      │  │  │ Auth    │  │  │ UI Comp  │  │  │ Setup    │ │
│  │ design   │  │  │ flow    │  │  │ onents   │  │  │          │ │
│  │          │  │  │         │  │  │          │  │  │          │ │
│  │ [PM]     │  │  │ [John]  │  │  │ [Jane]   │  │  │ [All]    │ │
│  └──────────┘  │  └──────────┘  │  └──────────┘  │  └──────────┘ │
│                │                │                │              │
│  ┌──────────┐  │                │                │              │
│  │ Task #13 │  │                │                │              │
│  └──────────┘  │                │                │              │
│                │                │                │              │
└────────────────┴────────────────┴────────────────┴──────────────┘
```

**Design**:
- Column headers: small caps, secondary text color, letter-spacing: 0.1em
- Task cards: 12px padding, 12px radius
- Card states:
  - Default: bg-tertiary
  - Hover: slight lift + border glow
  - Dragging: elevated shadow + slight rotation
- Priority indicator: small colored dot (left edge)
- Assignee: tiny avatar/initials in corner
- Column scroll: vertical, smooth

### 4. Activity Feed (Left Column, Bottom)

```
┌───────────────────┐
│  ACTIVITY         │
├───────────────────┤
│                   │
│  14:32  Jane      │
│  Pushed 3 commits │
│  to feature/auth  │
│                   │
│  ────────────────│
│                   │
│  14:28  Reviewer  │
│  Approved PR #42  │
│  Merged to main   │
│                   │
│  ────────────────│
│                   │
│  14:15  PM        │
│  Created task     │
│  "API v2 design"  │
│                   │
└───────────────────┘
```

**Design**:
- Timestamps in muted, monospace
- Agent name in accent color
- Action in secondary
- Dividers: subtle gradient line
- Auto-scroll to newest
- Subtle fade-in animation for new entries

### 5. Task Detail Panel (Right Column)

```
┌─────────────────────────────────────┐
│  TASK #8                            │
│  Authentication Flow                │
├─────────────────────────────────────┤
│                                     │
│  STATUS          ASSIGNEE           │
│  ● In Progress   John Doe           │
│                                     │
│  PRIORITY         ESTIMATE          │
│  High            3 points           │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  DESCRIPTION                         │
│  Implement OAuth2 flow with:        │
│  - Google provider                  │
│  - GitHub provider                  │
│  - Session management               │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  SUBTASKS                            │
│  ○ Setup OAuth providers            │
│  ● Create auth middleware           │
│  ○ Add session handling             │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  COMMENTS (2)                        │
│  [Add comment...]                    │
│                                     │
└─────────────────────────────────────┘
```

**Design**:
- Section dividers: thin gradient lines
- Key-value pairs in compact grid
- Status as pill with status color
- Subtasks: checkbox list with strike-through
- Comments: compact, timestamp + author + text

### 6. Project Launcher (Appears as Modal/Overlay)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │                                                 │     │
│    │           Upload your spec file                │     │
│    │                                                 │     │
│    │      ┌───────────────────────────────┐        │     │
│    │      │                               │        │     │
│    │      │      📄 Drop spec.md          │        │     │
│    │      │         or click to browse    │        │     │
│    │      │                               │        │     │
│    │      └───────────────────────────────┘        │     │
│    │                                                 │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│    ───────────────────  OR  ───────────────────            │
│                                                             │
│    ┌─────────────────────────────────────────────────┐     │
│    │  Paste your spec here...                        │     │
│    │                                                 │     │
│    └─────────────────────────────────────────────────┘     │
│                                                             │
│    [LAUNCH PROJECT]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Design**:
- Centered modal with backdrop blur
- Drop zone: dashed border, subtle pulse on drag
- Text area: minimal, auto-expanding
- Primary button: amber, prominent, subtle hover glow

---

## Interaction Patterns

### Hover States
- Cards: translateY(-2px), border-color transition to accent
- Buttons: background lighten, subtle scale(1.02)
- Task columns: header underline animation

### Click/Tap
- Task card: expand to detail panel with slide animation
- Kanban columns: collapse/expand with smooth height transition
- Status indicators: tooltip with more info

### Drag & Drop
- Task cards: lift with shadow, ghost in original position
- Drop zones: subtle highlight animation
- Invalid drop: gentle shake + red flash

### Animations
- Page load: staggered fade-in (50ms delay per element)
- New activity: slide-in from top + fade
- Task status change: color transition + checkmark animation
- Modal: backdrop fade + content scale from 0.95

---

## Key UI Elements

### Status Indicators
```
● Active     - amber with pulse glow
○ Idle       - muted gray
! Blocked    - amber with warning icon
```

### Priority Dots
```
● Critical   - red (#ef6666)
● High       - amber (#e8b84a)
● Medium     - blue (#5b9cf6)
● Low        - gray (#6b6b67)
```

### Agent Avatars
- Initials on gradient background (unique per role)
- PM: amber gradient
- SM: blue gradient
- Engineer: green gradient
- Reviewer: purple gradient

### Buttons
- Primary: amber bg, dark text, rounded-lg
- Secondary: transparent, border, hover fill
- Icon-only: subtle circle bg on hover

---

## Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| 1600px+    | Full 3-column bento |
| 1200-1600  | Kanban 4 cols, side panels collapse |
| 800-1200   | Kanban 2x2 grid, panels as drawers |
| <800       | Single column, bottom nav |

---

## Implementation Notes

- Use CSS Grid for bento layout
- CSS custom properties for theming
- CSS-only animations where possible
- Intersection Observer for lazy loading
- LocalStorage for user preferences
- WebSocket-ready for real-time updates

---

## Acceptance Criteria

1. ✅ All 5 components present and visually distinct
2. ✅ Bento grid layout with proper gaps and alignment
3. ✅ Fraunces + DM Sans typography hierarchy
4. ✅ Warm amber accent against dark charcoal
5. ✅ Smooth hover and interaction animations
6. ✅ Responsive down to tablet (800px)
7. ✅ Real-time ready activity feed design
8. ✅ Clear visual hierarchy and information density
9. ✅ No generic "AI slop" - truly distinctive aesthetic
10. ✅ Japanese craft-inspired minimalism achieved
