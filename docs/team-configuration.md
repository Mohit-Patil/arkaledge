# Team Configuration

Teams are configured via YAML files. The configuration defines which agents participate, what SDK/model they use, and workflow settings.

## Format

```yaml
team:
  - role: product-manager
    sdk: claude
    model: claude-opus-4-6
    tools: [Read, Write, Glob, Grep, WebSearch]

  - role: scrum-master
    sdk: claude
    model: claude-sonnet-4-5-20250929
    tools: [Read, Write, Glob, Grep, Bash]

  - role: engineer
    id: eng-1                    # Optional custom ID
    sdk: codex
    model: o3
    tools: [shell, file-ops, web-search]

  - role: engineer
    id: eng-2
    sdk: claude
    model: claude-sonnet-4-5-20250929
    tools: [Read, Write, Edit, Bash, Glob, Grep]

workflow:
  columns: [backlog, in_progress, review, done]
  max_retries: 3
  review_required: true
  auto_merge: true

plugins:
  - name: deploy-vercel
    path: ./plugins/deploy-vercel
  - name: run-playwright
    path: ./plugins/run-playwright
```

## Fields

### Team Members

| Field | Required | Description |
|-------|----------|-------------|
| `role` | Yes | One of: `product-manager`, `scrum-master`, `engineer`, `reviewer` |
| `id` | No | Custom agent ID. Auto-generated if omitted (e.g., `engineer-0`) |
| `sdk` | Yes | `claude` or `codex` |
| `model` | Yes | Model identifier (e.g., `claude-sonnet-4-5-20250929`, `o3`, `gpt-4.1`) |
| `tools` | Yes | List of tools available to this agent |

### Claude SDK Tools

`Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `WebSearch`, `WebFetch`

### Codex SDK Tools

Codex does not use a Claude-style per-tool allowlist. For `sdk: codex`, `tools` is currently treated as metadata only; runtime behavior is controlled via thread options (sandbox + approval policy) and configured MCP servers.

### Workflow Settings

| Field | Default | Description |
|-------|---------|-------------|
| `columns` | `[backlog, in_progress, review, done]` | Kanban column order |
| `max_retries` | `3` | Max retries before reassignment |
| `review_required` | `true` | Whether code review is mandatory |
| `auto_merge` | `true` | Auto-merge approved PRs to main |

### Plugins

Plugins extend agent capabilities with custom tools and lifecycle hooks. Each entry needs:

| Field | Description |
|-------|-------------|
| `name` | Plugin identifier |
| `path` | Relative path to the plugin directory |

## Validation

Configs are validated at load time using Zod schemas. Invalid configs produce clear error messages pointing to the problematic field.

## Default Config

If no config file is provided, a minimal default config is used:
- 1 PM (Claude Opus)
- 1 Scrum Master (Claude Sonnet)
- 1 Engineer (Claude Sonnet)
- Standard workflow settings
- No plugins
