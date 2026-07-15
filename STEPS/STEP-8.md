# Step 8: Frontend Task List View

## Two-Tier Task View Architecture

Step 8 introduces a two-tier approach to task viewing:

1. **Dialog (Quick Preview)** — Click any task card → lightweight dialog with title, description, priority, status, due date, and time estimate. Includes a "Ver detalhes completos" button that navigates to the dedicated route.
2. **Dedicated Route** (`/dashboard/tasks/[taskId]`) — Full task detail page with comments, subtasks, time entries, author info, and metadata.

This keeps the dialog lightweight for quick checks while providing a full workspace for collaboration-heavy tasks.

---

## 1. `components/tasks/task-card.tsx` — Task Card (List + Grid)

**Type:** CSR (`"use client"`)

**What it does:** Renders a single task card in either list mode (horizontal row) or grid mode (card box). Clickable — fires `onClick` callback to open the dialog.

**Props:**
- `task: ITask` — the task data to display
- `viewMode?: "list" | "grid"` — defaults to `"list"`
- `onClick?: () => void` — fired when card is clicked or activated via keyboard

**Internal components:**
- **`PriorityBadge`** — renders a `Badge` with color from `PRIORITY_CONFIG`
- **`TimeEstimateDisplay`** — shows `Xh Ym` with a clock icon; returns `null` if no estimate

**List mode layout:**
```
● Title ........................... Priority • Time
```
- Color-coded dot on the left (red=urgent, orange=high, blue=medium, green=low)
- Title truncates with `truncate`
- Priority badge and time estimate aligned to the right

**Grid mode layout:**
```
Title              [avatar]
Priority • Time
```
- Title on top with avatar initial on the right
- Priority badge and time estimate below

**Accessibility:** Both modes use `role="button"`, `tabIndex={0}`, and `onKeyDown` for Enter/Space activation.

---

## 2. `components/tasks/task-list.tsx` — Task List Container

**Type:** CSR (`"use client"`)

**What it does:** Renders a list or grid of `TaskCard` components based on `viewMode`. Handles empty state.

**Props:**
- `tasks: ITask[]` — array of tasks to render
- `viewMode: "list" | "grid"` — controls layout
- `onTaskClick?: (task: ITask) => void` — callback with the clicked task

**Returns:**
- If `tasks.length === 0`: centered "Nenhuma tarefa encontrada." message
- If `viewMode === "grid"`: responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)
- Otherwise: vertical stack with `gap-2`

---

## 3. `components/tasks/task-dialog.tsx` — Quick Preview Dialog

**Type:** CSR (`"use client"`)

**What it does:** Shadcn dialog showing a quick preview of a task. Includes a link to the full detail page.

**Props:**
- `task: ITask | null` — the task to display (renders `null` if no task)
- `open: boolean` — controls dialog visibility
- `onOpenChange: (open: boolean) => void` — called when dialog opens/closes

**Layout (top to bottom):**
1. **Title** — `DialogTitle`
2. **Description** — `DialogDescription` (conditional)
3. **Priority + Status badges** — side by side
4. **Due date** — with calendar icon, red if overdue
5. **Time estimate** — with clock icon
6. **Footer** — "Ver detalhes completos" button linking to `/dashboard/tasks/${task.id}`

**Internal components:**
- `PriorityBadge`, `StatusBadge`, `DueDateDisplay`, `TimeEstimateDisplay` — same logic as task-card but with larger text sizes

---

## 4. `app/dashboard/page.tsx` — Dashboard Page (SSR)

**Type:** SSR (no `"use client"`)

**What it does:** Server component that composes the page header and content.

**Returns:**
```tsx
<PageHeader title="Dashboard" />
<DashboardContent />
```

---

## 5. `app/dashboard/dashboard-content.tsx` — Dashboard Content (CSR)

**Type:** CSR (`"use client"`)

**What it does:** Contains all interactive dashboard logic — priority tabs, view toggle, task list, and dialog.

**State:**
- `activeTab: string` — active priority filter (`"all"`, `"urgent"`, `"high"`, `"medium"`, `"low"`)
- `viewMode: "list" | "grid"` — current view mode
- `selectedTask: ITask | null` — task selected for dialog preview
- `dialogOpen: boolean` — dialog visibility

**Logic:**
- Filters `MOCK_TASKS` by `activeTab` (matches `task.priority`)
- Sorts filtered tasks by `PRIORITY_ORDER` (urgent first)
- `handleTaskClick(task)` — sets selected task and opens dialog

**Toolbar layout (single row):**
```
Minhas tarefas — [Todas|Urgente|Alta|Média|Baixa] — [List|Grid icons]
```

Currently uses mock data (`MOCK_TASKS` array) — will be replaced with API calls in later steps.

---

## 6. `app/dashboard/tasks/page.tsx` — Tasks Page (SSR)

**Type:** SSR (no `"use client"`)

**What it does:** Server component for the `/dashboard/tasks` route.

**Returns:**
```tsx
<PageHeader title="Tarefas" />
<TasksContent />
```

---

## 7. `app/dashboard/tasks/tasks-content.tsx` — Tasks Content (CSR)

**Type:** CSR (`"use client"`)

**What it does:** Same structure as `DashboardContent` but with different subtitle ("Gerencie suas tarefas pessoais e da equipe"). Contains priority tabs, view toggle, task list, and dialog.

**State and logic:** Identical to `DashboardContent` — both use the same `MOCK_TASKS` data.

**Toolbar layout (single row):**
```
Gerencie suas tarefas... — [Todas|Urgente|Alta|Média|Baixa] — [Lista|Kanban] — [List|Grid icons]
```

The List/Kanban tabs are visual-only for now — no functionality implemented yet.

---

## 8. `app/dashboard/tasks/[taskId]/page.tsx` — Task Detail Page (SSR)

**Type:** SSR (no `"use client"`)

**What it does:** Server component for the `/dashboard/tasks/[taskId]` route. Fetches the task from the API at request time using the session cookie for authentication.

**`getTask(taskId)` function:**
- Reads the session cookie (`better-auth.session_token` in dev, `__Secure-better-auth.session_token` in prod) from `next/headers`
- Forwards only this single cookie to `taskApi.getPersonal(taskId)` — no other cookies are sent
- **Error handling:**
  - `404` → returns `null` (renders "not found" UI)
  - `401` → throws `"Unauthorized"` (caught by page, calls `notFound()`)
  - `status === 0` → throws `"Request timed out"` (propagates as error)
  - Any other status → throws `"Server error: <status>"` (propagates as error)

**Rendering logic:**
- If `getTask` returns `null` → renders "Tarefa não encontrada" with a link back to `/dashboard/tasks`
- If `getTask` throws `"Unauthorized"` → calls `notFound()`
- Any other error → re-throws (Next.js error boundary handles it)
- On success → passes the task as a prop to `<TaskDetailContent task={task} />`

**Returns:**
```tsx
<PageHeader title="Detalhes da Tarefa" />
<TaskDetailContent task={task} />
```

---

## 9. `app/dashboard/tasks/[taskId]/task-detail-content.tsx` — Task Detail Content (CSR)

**Type:** CSR (`"use client"`)

**What it does:** Full task detail view with all information sections, edit/delete capabilities, and store-based edit synchronization.

**Data resolution pattern (`resolvedTask`):**
- Receives the initial task as a server prop
- Also reads the task from the Zustand store via `useTasksStore((s) => s.tasks.find((t) => t.id === task.id))`
- Uses `resolvedTask = getTask ?? displayTask` — if the store has an updated version (after an edit), it takes precedence; otherwise falls back to the server prop
- This ensures edits are reflected immediately without needing a full page reload

**State:**
- `displayTask` — stores the current task data, updated after edits complete
- `deleteDialogOpen` / `editDialogOpen` — dialog visibility
- `deleting` — loading state for delete operation
- `refreshKey` — incremented after edits to force `TaskCreateDialog` re-render

**Actions:**
- `handleDelete()` — calls `removeTask(id)` from the store, then navigates back to `/dashboard/tasks`
- `onEditTask()` — opens the edit dialog
- `onEditComplete()` — reads the updated task from the store, updates `displayTask`, and increments `refreshKey` to force dialog re-mount

**Layout:**
1. **"Voltar" button** — links back to `/dashboard/tasks`
2. **Title + Description + Priority/Status badges** — header section with a dropdown menu for Edit/Delete actions
3. **3-column card grid** (responsive `md:grid-cols-3`):
   - **Prazo** — formatted date with relative time, or "Sem prazo definido"
   - **Tempo estimado** — estimate + remaining time calculation, or "Sem estimativa"
   - **Autor** — avatar initial, name, creation date
4. **Separator**
5. **2-column layout** (`lg:grid-cols-3`):
   - **Left (2/3 width):**
     - **Comentários** card (placeholder)
     - **Subtarefas** card (placeholder)
   - **Right (1/3 width):**
     - **Registros de tempo** card (placeholder)
     - **Informações** card — created at, updated at, task ID
6. **`TaskCreateDialog`** — edit dialog, re-mounted via `key={refreshKey}` after successful edits to pick up updated task data

**All displayed fields use `resolvedTask`** (title, description, priority, status, due date, time estimate, dates, ID) so they refresh automatically when the store has a newer version after an edit.

---

## 10. `components/tasks/task-create-dialog.tsx` — Task Create/Edit Dialog

**Type:** CSR (`"use client"`)

**What it does:** Dual-purpose dialog for creating new tasks and editing existing ones. Uses `react-hook-form` with Zod validation.

**Props:**
- `open: boolean` — controls dialog visibility
- `onOpenChange: (open: boolean) => void` — called when dialog opens/closes
- `task?: ITask` — if provided, the dialog is in edit mode for this task
- `onEditComplete?: () => void` — called after a successful edit (not used for create)

**Form schema (Zod):**
- `title` — trimmed before validation, minimum 3 characters (whitespace-only fails)
- `description` — optional string, trimmed before submission
- `priority` — enum: `"low"`, `"medium"`, `"high"`, `"urgent"`
- `dueDate` — optional date
- `dueTime` — optional time string (e.g., `"08:00"`)
- `timeEstimate` — optional numeric string (minutes)

**Create vs Edit behavior:**
- **Create mode** (no `task` prop): Sends `title`, `description`, `priority`, `dueDate`, `timeEstimateMinutes` plus defaults (`status: "todo"`, `assigneeId: null`, `milestoneId: null`, `parentId: null`, `orgId: null`) to `addTask()`
- **Edit mode** (`task` provided): Sends only editable fields (`title`, `description`, `priority`, `dueDate`, `timeEstimateMinutes`) to `updateTask()` — preserves existing `status`, `assigneeId`, `milestoneId`, `parentId`, `orgId`
- On edit success, calls `onEditComplete?.()` to notify the parent component

**Form initialization:**
- On open with a `task`: populates all fields from the task data (including parsing `dueDate` into separate date and time values)
- On open without a `task`: resets to default values
- On close: resets the form

**Layout:**
1. **Title** — "Editar tarefa" or "Nova tarefa"
2. **Description** — textarea
3. **Priority** (select) + **Prazo** (date picker + time input) — side by side
4. **Tempo estimado** — number input (minutes)
5. **Footer** — Cancelar + Submit button ("Criar tarefa" / "Salvar alteracoes")

---

## 11. `components/page-header.tsx` — Dynamic Page Header

**Type:** SSR (no `"use client"`)

**What it does:** Reusable page header component with dynamic title. Left side shows the page title, right side shows notification badge and user menu.

**Props:**
- `title: string` — the page title to display (e.g., "Dashboard", "Tarefas", "Detalhes da Tarefa")

**Layout:**
```
Title ................................ Notifications • User • Logout
```

**Why SSR:** This component is rendered on every dashboard page. By keeping it as a server component, only the small `NotificationBadge` and `UserMenu` children are client-side, minimizing JS bundle.

---

## 12. `components/notification-badge.tsx` — Notification Bell

**Type:** CSR (`"use client"`)

**What it does:** Bell icon button with an unread count badge (currently hardcoded to `0`).

**Layout:** Relative-positioned button with absolute badge in top-right corner (red circle with count).

**Placeholder:** `unreadCount` is hardcoded — will be connected to Zustand store + WebSocket in later steps.

---

## 13. `components/user-menu.tsx` — User Info + Logout

**Type:** CSR (`"use client"`)

**What it does:** Displays user avatar initial, name, and logout button.

**Logic:**
- Gets `user` and `clearSession` from `useAuthStore`
- `handleLogout()` — POSTs to `/api/auth`, clears session, redirects to `/login`

**Layout:**
```
[Avatar] Name [Logout icon]
```

---

## Modified Files

### `app/dashboard/layout.tsx` — Converted to SSR

**Before:** `"use client"` with `useEffect` for auth check, `useRouter` for redirect, `useAuthStore` for session.

**After:** Pure server component — just renders `<Sidebar />`, `<DashboardHeader />`, and `<main>{children}</main>`.

**Why:** The `middleware.ts` already handles auth redirects server-side. No need for client-side auth guard in the layout. This reduces the client JS bundle significantly since the layout is rendered on every dashboard page.

### `components/dashboard-sidebar.tsx` — Removed user info, added Help Center

**Before:** Bottom section had user avatar, name, and logout button.

**After:** Bottom section has a single "Help Center" link with `CircleHelp` icon pointing to `/help`.

**Removed imports:** `useRouter` from `next/navigation`, `LogOut` from `lucide-react`, `useAuthStore` from store.

### `components/dashboard-header.tsx` — Added fake nav links, static title

**Before:** Had a hardcoded "Dashboard" title on the left and a bell icon on the right.

**After:** Has a static "Dashboard" title on the left and fake nav links (Overview, Tasks, Calendar, Settings) aligned to the right via `ml-auto`. Mobile sheet trigger is still present.

**Note:** The title is currently hardcoded as "Dashboard" — the per-page title is handled by `PageHeader` which appears below this header.

### `app/dashboard/tasks/[taskId]/page.tsx` — Server-side task fetch

**What changed:** Replaced mock data with server-side API fetch via `taskApi.getPersonal()`. Forwards only the session cookie to the API. Handles 404 (not found UI), 401 (notFound), and other errors (throw).

### `app/dashboard/tasks/[taskId]/task-detail-content.tsx` — Store-based edit sync

**What changed:** Replaced mock data with server-prop task. Added `resolvedTask` pattern that reads from the Zustand store after edits to reflect changes without page reload. Added edit/delete dropdown menu, `TaskCreateDialog` for editing, and `AlertDialog` for deletion confirmation.

### `components/tasks/task-create-dialog.tsx` — Create/Edit dialog

**What changed:** New component (or updated from previous task-dialog). Dual-purpose for creating and editing tasks. Uses react-hook-form with Zod validation. Edit mode sends only editable fields, preserving status/assignee/milestone/parent/org.

---

## Route Structure

```
/dashboard                          → PageHeader "Dashboard" + DashboardContent (minhas tarefas)
/dashboard/tasks                    → PageHeader "Tarefas" + TasksContent
/dashboard/tasks/[taskId]           → PageHeader "Detalhes da Tarefa" + TaskDetailContent (SSR fetch + CSR edit sync)
```

---

## Information Flow

```text
User clicks task card in list/grid
  → TaskCard fires onClick()
    → DashboardContent/TasksContent handleTaskClick(task)
      → setSelectedTask(task) + setDialogOpen(true)
        → TaskDialog opens with quick preview
          → User clicks "Ver detalhes completos"
            → Next.js navigates to /dashboard/tasks/[taskId]
              → Server component fetches task via taskApi.getPersonal() with session cookie
              → TaskDetailContent renders full detail page with server-fetched task

Edit flow:
  → User clicks "Editar tarefa" in dropdown menu
    → TaskCreateDialog opens in edit mode (pre-filled with task data)
    → User submits changes
      → updateTask() sends only editable fields to API (optimistic store update)
      → onEditComplete() reads updated task from store
      → displayTask is updated, refreshKey increments
      → All fields using resolvedTask reflect the new data immediately

Delete flow:
  → User clicks "Excluir tarefa" in dropdown menu
    → AlertDialog confirms
    → removeTask() deletes from store and API
    → Navigates back to /dashboard/tasks
```

---

## Key Design Decisions

1. **Server/Client split:** Page files (`page.tsx`) are SSR and compose `<PageHeader>` (SSR) + `<*Content>` (CSR). The task detail page fetches data server-side with the session cookie, then passes it as a prop to the client component.

2. **Hybrid data resolution in task detail:** The client component receives the task as a server prop but also reads from the Zustand store. After an edit, the store has the updated version (from optimistic update reconciliation), so `resolvedTask = storeTask ?? serverProp` ensures the UI reflects changes without a full reload.

3. **Dialog vs Route:** Dialog for quick preview (title, description, priority, time), dedicated route for full details (comments, subtasks, time entries, metadata). This avoids a mostly-empty page for simple tasks while providing a full workspace when needed.

4. **Layout as SSR:** The dashboard layout no longer handles auth — `middleware.ts` does it server-side. This means the layout shell (sidebar + header) is rendered on the server, reducing client JS.

5. **Edit payload scoping:** When editing a task, only editable fields (`title`, `description`, `priority`, `dueDate`, `timeEstimateMinutes`) are sent to the API. Fields like `status`, `assigneeId`, `milestoneId`, `parentId`, and `orgId` are preserved server-side and not overwritten by the edit form.

6. **Title validation:** The title field is trimmed before Zod's minimum-length check, so whitespace-only input (e.g., `"   "`) fails validation and the submitted value is already clean.

7. **Cookie forwarding:** The server component forwards only the session cookie (`better-auth.session_token` or `__Secure-better-auth.session_token`) to the API — no other frontend cookies are sent.

8. **Error handling in SSR fetch:** Different HTTP statuses are handled differently — 404 shows a "not found" UI, 401 triggers `notFound()`, and other errors (timeouts, server errors) are thrown to Next.js's error boundary.
