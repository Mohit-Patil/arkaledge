# Execution Flow

## Full Lifecycle

```
1. User provides product spec via dashboard (or CLI)
         |
2. Orchestrator initializes project directory + git repo
         |
3. PM agent reads spec and creates tasks in kanban.json (backlog)
         |
4. Scrum Master loop starts
    |
    |-- Finds idle engineers
    |-- Assigns backlog tasks (status: in_progress)
    |-- Creates git worktree per assignment
    |-- Launches engineer agent with task prompt
         |
5. Engineer agent works
    |-- Writes code + tests in worktree
    |-- Self-corrects on test failure (up to 3x)
    |-- Moves task to review
         |
6. Scrum Master assigns reviewer
    |-- Different engineer reviews the diff
    |-- Approved: merge to main, task to done
    |-- Rejected: task to in_progress (back to engineer)
         |
7. Loop continues until all tasks are done
         |
8. PM verifies completeness
    |-- Creates new tasks if gaps exist
    |-- OR signals done
         |
9. Orchestrator emits "project_complete" event
```

## Task State Machine

```
  backlog --> in_progress --> review --> done
     ^            |            |
     |            v            |
     |         blocked         |
     |            |            |
     +--- reassign/retry <-----+
                               (rejected)
```

### Transitions

| From | To | Trigger |
|------|----|---------|
| `backlog` | `in_progress` | Scrum Master assigns to idle engineer |
| `in_progress` | `review` | Engineer completes implementation |
| `in_progress` | `blocked` | 3 failed retries, no alternate agent |
| `review` | `done` | Reviewer approves |
| `review` | `in_progress` | Reviewer requests changes |
| `blocked` | `in_progress` | Reassigned to different agent |

## Event Timeline (Example)

```
[00:00] project:started        - Project initialized
[00:01] agent:started           - PM agent booted
[00:03] task:created            - "Set up Express server" (backlog)
[00:03] task:created            - "Add GET /api/items" (backlog)
[00:03] task:created            - "Add POST /api/items" (backlog)
[00:04] agent:completed         - PM finished task breakdown
[00:04] agent:started           - Scrum Master loop started
[00:05] task:assigned           - "Set up Express server" -> eng-1
[00:05] task:status_changed     - backlog -> in_progress
[00:05] agent:started           - eng-1 working on task
[00:06] task:assigned           - "Add GET /api/items" -> eng-2
[00:15] agent:message           - eng-1: "Express server created with tests"
[00:16] task:status_changed     - in_progress -> review
[00:16] review:started          - eng-2 reviewing eng-1's work
[00:18] review:approved         - Code merged to main
[00:18] task:status_changed     - review -> done
[00:25] project:completed       - All tasks done
```

## Failure Handling Flow

```
Engineer fails on task
        |
        v
  retryCount < max_retries?
       / \
     yes   no
      |     |
      v     v
   Retry   Find alternate agent?
   (backoff) / \
            yes  no
             |    |
             v    v
        Reassign  Mark BLOCKED
        (reset    Emit error
        retries)  Human intervention
```

### Backoff Schedule

| Retry | Delay |
|-------|-------|
| 1 | 2 seconds |
| 2 | 4 seconds |
| 3 | 8 seconds |
