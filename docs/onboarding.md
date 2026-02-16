# Contributor Onboarding

This guide gives a practical read-and-run sequence for new contributors.

## 1. Understand the System Boundary

Read:
- `architecture.md`
- `project-structure.md`
- `interfaces.md`

Goal:
- Know the major runtime components and where they live in the codebase.

## 2. Understand Multi-Agent Behavior

Read:
- `agent-roles.md`
- `execution-flow.md`

Goal:
- Understand task lifecycle, assignment/review flow, and failure handling.

## 3. Run the Project Locally

From repo root:

```bash
npm install
npm run build
```

Single-agent smoke run:

```bash
node packages/cli/dist/index.js --prompt "Create a hello world Express app" --sdk claude
```

Orchestrated run:

```bash
node packages/cli/dist/index.js \
  --spec ./spec.md \
  --config ./examples/team-config.yaml \
  --output ./output
```

Important:
- For fresh runs, `--output` must be empty.
- Use `--resume` only when `<output>/.arkaledge/kanban.json` exists.

## 4. Observe Dashboard + API

During orchestration, API server runs on `http://localhost:4400`.

Start dashboard in another terminal:

```bash
cd packages/dashboard
npm run dev
```

Open `http://localhost:3000`.

Core API endpoints:
- `GET /api/tasks`
- `GET /api/events` (SSE)
- `GET /api/tasks/:taskId/worktree/*path`

## 5. Know Quality Gates

From repo root:

```bash
npm run lint
npm run typecheck
npm run check:sdk
```

`lint` and `typecheck` are also enforced by `.husky/pre-commit`.

## 6. Know What To Build Next

Read:
- `implementation-plan.md`
- `NEXT.md`

Goal:
- Align your work with current roadmap and verification expectations.
