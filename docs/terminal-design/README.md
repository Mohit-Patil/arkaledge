# Arkaledge Terminal Design Language

## Overview

This document defines the visual design language for Arkaledge's terminal/hacker aesthetic interface. This design was chosen as the primary frontend for the platform.

---

## Font Specification

### Primary Fonts

| Font Family | Usage | Source |
|-------------|-------|--------|
| **Fira Code** | Headers, logo, primary text | Google Fonts |
| **JetBrains Mono** | Body text, code, input fields | Google Fonts |
| **Courier New** | Fallback / ASCII art | System font |

### Font Import

```html
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Font Weights

- Fira Code: 400, 500, 600, 700
- JetBrains Mono: 400, 500

### Font CSS Variables

```css
--font-mono: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace;
```

---

## Color Palette

### Core Colors

| Role | Color Name | Hex Code | Usage |
|------|-----------|----------|-------|
| Primary Background | Deep Black | `#0a0a0a` | Main app background |
| Secondary Background | Dark Terminal | `#0d1117` | Panel backgrounds |
| Tertiary Background | Charcoal | `#161b22` | Cards, elevated surfaces |

### Accent Colors

| Role | Color Name | Hex Code | Usage |
|------|-----------|----------|-------|
| Primary Accent | Phosphor Green | `#00ff41` | Primary text, active states |
| Secondary Accent | Amber Warning | `#ffb000` | Warnings, in-progress |
| Tertiary Accent | Cyan Info | `#00d4ff` | Links, info highlights |
| Error Accent | Red Alert | `#ff3333` | Errors, blockers |
| Purple Accent | Lavender | `#b388ff` | Reviewer agent |

### Utility Colors

| Role | Color Name | Hex Code | Usage |
|------|-----------|----------|-------|
| Muted Text | Dim Green | `#0f5132` | Secondary text, disabled |
| Border Color | Terminal Green | `#1a3a2a` | Panel borders |
| Glow Effect | Green Glow | `rgba(0, 255, 65, 0.15)` | Hover states, focus |

### CSS Variables

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #0d1117;
  --bg-tertiary: #161b22;
  --accent-primary: #00ff41;
  --accent-secondary: #ffb000;
  --accent-info: #00d4ff;
  --accent-error: #ff3333;
  --accent-purple: #b388ff;
  --text-muted: #0f5132;
  --border-color: #1a3a2a;
  --glow: rgba(0, 255, 65, 0.15);
  --font-mono: 'Fira Code', 'JetBrains Mono', monospace;
}
```

---

## Visual Effects

### Scanlines

```css
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  z-index: 9999;
  animation: scanlines 8s linear infinite;
}
```

### Glow Effects

```css
/* Text glow */
text-shadow: 0 0 10px #00ff41;

/* Box glow */
box-shadow: 0 0 20px rgba(0, 255, 65, 0.15);

/* Focus glow */
box-shadow: 0 0 10px var(--glow);
```

### Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `glow` | 2s | ease-in-out | Logo text pulse |
| `blink` | 1s | step-end | Cursor blink |
| `pulse` | 2s | infinite | Status dot animation |
| `scanlines` | 8s | linear | CRT scanline effect |
| `progress` | 2s | ease-in-out | Progress bar fill |

---

## Component Specifications

### Layout Structure

```
+================================================================================+
|  HEADER - Logo, Status, Controls                                             |
+================================================================================+
|  LEFT PANEL     |  MAIN CONTENT (Kanban)    |  RIGHT PANEL                  |
|  - Launcher    |  - 4 Kanban columns       |  - Team Status                |
|  - Activity    |    (backlog/in_progress/  |  - Task Detail               |
|    Feed          review/done)              |                               |
+================================================================================+
|  STATUS BAR - Connection, Memory, Uptime                                       |
+================================================================================+
```

### Grid Layout

```css
.main-container {
  display: grid;
  grid-template-columns: 300px 1fr 350px;
  grid-template-rows: auto 1fr auto;
  height: calc(100vh - 50px);
  gap: 1px;
  background: var(--border-color);
}
```

### Panel Styling

```css
.panel {
  background: var(--bg-secondary);
  padding: 16px;
  overflow: hidden;
}

.panel-header {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}
```

---

## UI Elements

### Input Fields

```css
.input-field {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--accent-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 12px 16px;
  width: 100%;
  margin-bottom: 12px;
  outline: none;
  transition: all 0.2s;
}

.input-field:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--glow);
}
```

### Buttons

```css
.btn {
  background: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.btn:hover {
  background: var(--accent-primary);
  color: var(--bg-primary);
  box-shadow: 0 0 20px var(--glow);
}
```

### Task Cards

```css
.task-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 10px;
  margin-bottom: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.task-card:hover {
  border-color: var(--accent-primary);
  box-shadow: 0 0 10px var(--glow);
  transform: translateY(-1px);
}
```

### Status Indicators

```css
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-dot.active { background: var(--accent-primary); }
.status-dot.idle { background: var(--text-muted); }
.status-dot.building { background: var(--accent-secondary); }
.status-dot.waiting { background: var(--accent-info); }
```

### Progress Bars

```css
.progress-bar {
  height: 3px;
  background: var(--bg-secondary);
  margin-top: 8px;
  overflow: hidden;
}

.progress-bar .fill {
  height: 100%;
  background: var(--accent-primary);
}
```

---

## Typography Scale

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| H1 (Logo) | Fira Code | 28px | 700 | `#00ff41` |
| H2 (Panel) | Fira Code | 20px | 600 | `#00ff41` |
| Body | JetBrains Mono | 14px | 400 | `#00ff41` |
| Code | Fira Code | 13px | 400 | `#00ff41` |
| Small/Labels | JetBrains Mono | 12px | 400 | `#0f5132` |
| ASCII Art | Courier New | Variable | 400 | `#00ff41` |

---

## Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 8px | Base unit |
| `--space-2` | 16px | Card padding |
| `--space-3` | 24px | Panel padding |
| `--space-4` | 32px | Section gap |

- Border radius: 2px (minimal, sharp edges)
- Panel padding: 24px (3 units)
- Card padding: 16px (2 units)
- Element gap: 8px (1 unit)

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Desktop | 1200px+ | Full 3-column layout |
| Tablet | 768-1199px | Stacked layout, collapsible panels |
| Mobile | <768px | Single column, bottom nav |

---

## Accessibility

- All colors meet WCAG AA contrast (4.5:1 for text)
- Keyboard navigation for all interactions
- Screen reader labels on all interactive elements
- Reduced motion mode (disable animations)
- Focus indicators: Bright green outline

---

## File Structure

```
docs/terminal-design/
├── README.md              # This file
├── colors.css             # Color variables only
├── typography.css         # Font specifications
├── components.css         # Reusable component styles
└── animations.css         # Animation keyframes
```

---

## Usage

Import the design system:

```html
<head>
  <!-- Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <!-- Design System CSS -->
  <link rel="stylesheet" href="docs/terminal-design/colors.css">
  <link rel="stylesheet" href="docs/terminal-design/typography.css">
  <link rel="stylesheet" href="docs/terminal-design/components.css">
  <link rel="stylesheet" href="docs/terminal-design/animations.css">
</head>
```

---

## Design Assets

### External Resources

| Resource | URL |
|----------|-----|
| Fira Code | https://fonts.google.com/specimen/Fira+Code |
| JetBrains Mono | https://fonts.google.com/specimen/JetBrains+Mono |

---

## Version

- **Version**: 1.0.0
- **Last Updated**: 2026-02-14
- **Author**: Arkaledge Design Team
