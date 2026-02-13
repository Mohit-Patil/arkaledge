# Agent Roles & Behavior

## Product Manager

**Input**: Raw product spec from user
**Output**: Structured epics and tasks in Kanban backlog

### Behavior

1. Reads the product spec
2. Breaks it into epics (major features)
3. For each epic, creates granular tasks with:
   - Title
   - Description
   - Acceptance criteria
   - Priority (high/medium/low)
4. Writes tasks to `kanban.json` with status `backlog`
5. Continuously monitors "done" tasks and creates follow-up tasks if gaps exist

### System Prompt Focus

The PM agent is prompted to think like a senior product manager who understands technical decomposition. It should create tasks that are:
- Small enough for a single engineer session
- Have clear, testable acceptance criteria
- Ordered by dependency and priority

---

## Scrum Master

**Input**: Kanban state
**Output**: Task assignments, blocker resolution, review triggers

### Behavior

1. Monitors Kanban state in a loop
2. When backlog tasks exist and engineers are idle: assigns highest-priority task
3. When a task moves to `review`: assigns a *different* engineer as reviewer
4. When a task is blocked (3 failed retries): reassigns to different agent/model
5. When all tasks are done: signals PM to verify completeness
6. Emits summary events for dashboard

### Decision Logic

```
IF backlog tasks exist AND idle engineers available:
    Assign highest-priority unblocked task to idle engineer
    Create git worktree for the assignment
    Launch engineer agent

IF task in review:
    Find different engineer (not the author)
    Assign as reviewer

IF task blocked (retryCount >= max_retries):
    Find alternate agent (different model/SDK)
    Reset retry count, reassign

IF all tasks done:
    Signal PM for completeness check
```

---

## Engineer

**Input**: Assigned task from Kanban
**Output**: Code in git worktree, tests, PR-ready branch

### Behavior

1. Reads task details from Kanban (title, description, acceptance criteria)
2. Gets assigned a git worktree (`git worktree add`)
3. Implements the feature/fix in its worktree
4. Writes tests
5. Runs tests; if failing, enters self-correcting loop (up to 3 attempts)
6. Commits and moves task to `review`

### Self-Correction Loop

```
FOR attempt IN 1..3:
    Run tests
    IF all pass: break, move to review
    Read test output
    Fix the failing code
    Commit fix
IF still failing after 3 attempts:
    Mark task as blocked
    Emit error event
```

---

## Reviewer

Uses the same Engineer agent with a review-focused system prompt.

**Input**: Task in `review` status + the branch diff
**Output**: Approve (merge) or request changes

### Behavior

1. Reads the diff between the task branch and main
2. Checks:
   - Code quality
   - Test coverage
   - Acceptance criteria met
3. If approved:
   - Merges branch to main
   - Removes worktree
   - Moves task to `done`
4. If changes requested:
   - Adds review comments to the task
   - Moves task back to `in_progress`
   - Original engineer picks it up again
