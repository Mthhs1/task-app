# Task Service — Detailed Explanation

## Architecture Overview

The task service follows a **two-mode access pattern**: tasks can belong to either an **organization** (shared tasks) or a **personal user** (private tasks). Every service function that reads or mutates tasks needs to enforce which mode is active, and this is where the `whereClause` pattern comes from.

### Authorization Layers

There are **two layers** of authorization working together:

| Layer | Where | What it does |
|-------|-------|--------------|
| **Middleware** | `auth.middleware.ts`, `org.middleware.ts` | Verifies the user is authenticated and (for org routes) is a member of the organization. Runs **before** the controller. |
| **Service-level scope check** | `task.service.ts` (whereClause) | Ensures the task being accessed actually belongs to the org or user making the request. Prevents IDOR attacks. |

The middleware alone is not enough. Consider: User A (org member) knows the URL to delete a task that belongs to User B's personal scope. The middleware passes (User A is authenticated), but the service-level `whereClause` blocks it because the task's `userId` doesn't match User A's ID.

---

## The `whereClause` Pattern Explained

Every mutation function (`updateTask`, `deleteTask`, `reorderTask`) builds a `whereClause` array:

```typescript
const whereClause: any[] = [eq(tasks.id, taskId)];
if (orgId) {
  whereClause.push(eq(tasks.organizationId, orgId));
} else if (userId) {
  whereClause.push(eq(tasks.userId, userId));
}
```

### Why this pattern?

1. **IDOR Prevention** (Insecure Direct Object Reference): Just knowing a task's UUID shouldn't let you modify it. The `whereClause` adds an ownership constraint — the query only matches if the task belongs to the specified org **or** the specified user.

2. **Dual-mode support**: The same service function handles both org tasks and personal tasks. The `whereClause` dynamically builds the right SQL constraint based on which mode is active.

3. **Fail-safe by default**: If neither `orgId` nor `userId` is provided, the `whereClause` only contains `eq(tasks.id, taskId)`. The subsequent `findFirst` query returns `null` (task not found in the right scope), and the function throws or returns `false`.

### How it flows from controller to service

**Org task deletion:**
```
Controller: deleteOrgTask(request, reply)
  → groupId from URL params
  → calls deleteTask(taskId, groupId, null)
    → whereClause: [id = taskId, organizationId = groupId]
    → finds task only if it belongs to that org
    → if not found → returns false → controller sends 404
    → if found → deletes → returns true → controller sends 204
```

**Personal task deletion:**
```
Controller: deletePersonalTask(request, reply)
  → userId from session (request.user)
  → calls deleteTask(taskId, null, userId)
    → whereClause: [id = taskId, userId = userId]
    → finds task only if it was created by this user
    → if not found → returns false → controller sends 404
    → if found → deletes → returns true → controller sends 204
```

### Is there validation that the user who deletes is the same who created?

**For personal tasks: Yes, indirectly.** The `whereClause` includes `eq(tasks.userId, userId)`. The `userId` column stores the creator's ID (set during `createTask`). So the delete only succeeds if the requesting user's ID matches the task's `userId`.

**For org tasks: No individual ownership check.** Any org member can delete any task in that org. The middleware (`requireOrgMember`) ensures the requester is a member, and the `whereClause` ensures the task belongs to that org. If you need per-user ownership within orgs, you'd add a check against `createdById` or `assigneeId`.

---

## Function-by-Function Breakdown

### `createTask(userId, data)`

Creates a task. The `userId` is always the authenticated user making the request.

- If `orgId` is provided → task is an **org task**: `organizationId` is set, `userId` column is `null` (no personal owner), `createdById` records who created it.
- If `orgId` is `null` → task is a **personal task**: `userId` column is set to the creator's ID, `organizationId` is `null`.

The `userId` column means different things depending on context:
- **Personal task**: the owner (can read/write/delete)
- **Org task**: always `null` (ownership is at the org level, not individual)

### `listTasks(orgId, userId, query)`

Returns tasks filtered by scope:

- If `orgId` is set → returns tasks where `organizationId = orgId`
- If `userId` is set → returns tasks where `userId = userId` (personal tasks)
- Always excludes subtasks (`isNull(tasks.parentId)`) — subtasks are fetched via the parent task detail view

The `conditions` array works the same way as `whereClause` — it's a dynamic SQL WHERE clause built from active filters.

### `getTaskById(taskId)`

Simple lookup by ID. **No scope check** — this is a gap. Any authenticated user can fetch any task by ID regardless of ownership. This should ideally use the same `whereClause` pattern.

### `updateTask(taskId, orgId, userId, data)`

Updates a task with optimistic scope validation:

1. Builds `whereClause` with ownership constraint
2. Queries the task with `findFirst(where: and(...whereClause))`
3. If not found → throws `"Task not found"` → controller catches and returns 404
4. If found → applies only the fields that were provided in `data` (partial update)
5. Auto-manages `completedAt`: sets timestamp when status changes to `"done"`, clears it when status changes away from `"done"`

**Note**: The actual UPDATE query uses `eq(tasks.id, taskId)` instead of the full `whereClause`. This is a minor inconsistency — the scope check happens in step 2 (the `findFirst`), and if it passes, the update proceeds by ID. In a high-concurrency scenario, there's a tiny race window between the check and the update. For most apps this is fine, but a stricter implementation would use the `whereClause` in the UPDATE's WHERE clause too.

### `deleteTask(taskId, orgId, userId)`

Deletes a task with scope validation:

1. Builds `whereClause` with ownership constraint
2. Queries the task with `findFirst(where: and(...whereClause))`
3. If not found → returns `false` → controller sends 404
4. If found → `DELETE FROM tasks WHERE id = taskId` → returns `true` → controller sends 204

**Cascade behavior**: The database schema has `onDelete: "cascade"` on `userId` and `onDelete: "set null"` on `assigneeId`, `milestoneId`, and `parentId`. When a task is deleted:
- Subtasks (`parentId` → this task) get their `parentId` set to `null` (they become top-level tasks)
- The task's comments, time entries, and tags are NOT automatically deleted by the schema — they'd need explicit cleanup or FK constraints

### `reorderTask(taskId, orgId, userId, data)`

Reorders a task within its status column (for Kanban drag-and-drop):

1. Validates scope with `whereClause` (same pattern as update/delete)
2. Finds all tasks in the same scope (same org or same user) AND same status AND not subtasks
3. Removes the target task from the array, re-inserts it at the new position (based on `afterTaskId`)
4. Updates all `position` values in a single `Promise.all` batch
5. Returns the refreshed task

The `position` column is an integer that determines display order. Lower values appear first.

---

## Database Schema Reference

| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary key |
| `organization_id` | TEXT (FK → organization.id) | Org scope — if set, task belongs to an org |
| `user_id` | TEXT (FK → user.id, onDelete: cascade) | Personal scope — if set, task belongs to a user |
| `created_by_id` | TEXT (FK → user.id, NOT NULL) | Always set — who created the task |
| `parent_id` | UUID (FK → tasks.id, onDelete: set null) | Subtask reference — if set, this is a subtask |
| `assignee_id` | TEXT (FK → user.id, onDelete: set null) | Who the task is assigned to (can differ from creator) |
| `milestone_id` | UUID (FK → milestones.id, onDelete: set null) | Linked milestone |
| `position` | INTEGER (default: 0) | Display order within a status column |
| `status` | ENUM (todo, in_progress, done, archived) | Current workflow state |
| `priority` | ENUM (low, medium, high, urgent) | Priority level |
| `completed_at` | TIMESTAMP | Set automatically when status → "done" |

### Key distinction: `userId` vs `createdById` vs `assigneeId`

- **`userId`**: The "owner" of a personal task. Only set for personal tasks (null for org tasks). Controls who can access the task.
- **`createdById`**: Always set. Records who created the task (for audit/history purposes). Not used for access control.
- **`assigneeId`**: Who the task is assigned to work on. Can be different from the creator. Used for filtering and display.

---

## Known Gaps and Improvements

1. **`getTaskById` has no scope check** — any user can fetch any task by ID. Should accept `orgId`/`userId` and use the `whereClause` pattern.

2. **UPDATE uses ID-only WHERE clause** — after the scope check passes via `findFirst`, the actual `UPDATE` uses `eq(tasks.id, taskId)`. Should use the full `whereClause` for atomicity.

3. **No cascade cleanup on delete** — comments and time entries for a deleted task are not cleaned up by FK constraints. Either add `onDelete: "cascade"` to those relations or add explicit delete logic.

4. **Org task deletion has no per-user check** — any org member can delete any org task. Consider adding role-based checks (admin-only delete) or ownership checks (only creator can delete).

5. **`any[]` type on whereClause** — loses type safety. Could use Drizzle's `SQL` type or a generic helper for better TypeScript inference.
