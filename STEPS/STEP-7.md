# Step 7: Frontend API Client + WebSocket Client + Task Store

## 1. `lib/api.ts` — Typed Fetch Wrapper

**What it does:** Centralizes all HTTP communication with the backend.

**Core function — `request<T>()`:**
- Takes a path and `RequestInit` options
- Prefixes the path with `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`)
- Always sends `credentials: 'include'` so the browser attaches the session cookie automatically
- Always sets `Content-Type: application/json`
- Returns a discriminated union: `{ data: T, error: null }` or `{ data: null, error: ApiError }`
- Handles 204 (no content) gracefully
- Catches network errors and wraps them in `ApiError`

**Helper functions:**
- `apiGet<T>(path, query?)` — appends query params as `?key=value`
- `apiPost<T, TBody>(path, body)` — serializes body to JSON
- `apiPatch<T, TBody>(path, body)` — same pattern
- `apiDelete<T>(path)` — no body needed

**Namespaced API modules:**
Each module groups related endpoints so the call site reads naturally:

```ts
// Instead of:
apiGet<ITask[]>(`/api/groups/${groupId}/tasks`, filters)

// You write:
taskApi.listOrg(groupId, filters)
```

The modules cover:
- **`taskApi`** — org tasks + personal tasks (list, get, create, update, delete, reorder)
- **`tagApi`** — list, create, delete tags per org
- **`milestoneApi`** — list, create, update, delete milestones per org
- **`timeApi`** — list/create/delete time entries + stats endpoint
- **`commentApi`** — list/create comments per task, delete by commentId
- **`notificationApi`** — list, mark-read, mark-all-read

All methods are fully typed — the return type matches the Zod-inferred types from `@meu-projeto/types`, and the body types match the `CreateXInput` / `UpdateXInput` types.

---

## 2. `lib/ws.ts` — WebSocket Singleton

**What it does:** Manages a single WebSocket connection to the backend for real-time updates.

**Why singleton:** You only want one WS connection per browser tab. Multiple connections waste server resources and cause duplicate events.

**`WsClient` class internals:**

- **`connect(token)`** — Opens a WebSocket to `ws://localhost:3001/ws?token=<session_token>`. The token is the session cookie value, passed as a query param because browsers can't set custom headers on WebSocket connections.

- **Auto-reconnect with exponential backoff:**
  - On `onclose` or `onerror`, it schedules a reconnect after 1 second
  - Each failed attempt doubles the delay (1s → 2s → 4s → 8s...)
  - Caps at 30 seconds max
  - Resets to 1s on successful connection

- **`onMessage(handler)`** — Subscribes a callback to incoming messages. Returns an unsubscribe function. Uses a `Set<EventHandler>` so multiple components can listen simultaneously.

- **`switchOrg(orgId)`** — Sends `{ event: "switch_org", orgId }` to the server so the backend knows which org's events to broadcast to this client. Also stores `activeOrgId` so reconnections re-send it automatically.

- **`disconnect()`** — Clears the reconnect timer and closes the socket. Used on logout.

- **`isConnected()`** — Returns true if socket state is `OPEN`.

**Exported instance:** `wsClient` — a single shared instance that the whole app uses.

---

## 3. `lib/format.ts` — Date/Duration Formatting

**What it does:** Human-readable time formatting for task estimates, due dates, and time tracking.

**Functions:**

- **`formatDuration(minutes)`** — Converts minutes to `"2d 3h 15m"` format. Handles zero, negative values, and skips zero units (e.g., `1440` → `"1d"`, not `"1d 0h 0m"`).

- **`formatDate(date)`** — Formats a Date to `"02 Jul 2026"` (pt-BR locale). Returns empty string for null.

- **`formatRelativeTime(date)`** — Uses `Intl.RelativeTimeFormat` to produce `"2 days ago"`, `"in 3 hours"`, `"just now"`, etc. in pt-BR.

- **`formatTimeRemaining(estimateMinutes, loggedMinutes)`** — Calculates `estimate - logged` and returns either `"Tempo esgotado"` (if over budget) or `"1h 30m restantes"`.

---

## 4. `lib/constants.ts` — UI Configuration

**What it does:** Centralizes display config for enums so components don't hardcode labels or colors.

**Exports:**

- **`PRIORITY_CONFIG`** — Maps each priority to `{ label, color, bg }`:
  - `low` → "Baixa", green
  - `medium` → "Média", blue
  - `high` → "Alta", orange
  - `urgent` → "Urgente", red

- **`STATUS_CONFIG`** — Maps each task status to `{ label, color, bg }`:
  - `todo` → "A fazer", gray
  - `in_progress` → "Em progresso", yellow
  - `done` → "Concluída", green
  - `archived` → "Arquivada", slate

- **`FREQUENCY_CONFIG`** — Maps recurrence frequency to pt-BR labels: "Diário", "Semanal", "Mensal", "Anual"

- **`PRIORITY_ORDER`** — Numeric ordering for sorting: urgent=0, high=1, medium=2, low=3

This way, when a component renders a task card, it just does:
```ts
const config = PRIORITY_CONFIG[task.priority];
<span className={`${config.color} ${config.bg}`}>{config.label}</span>
```

---

## 5. `store/tasks-store.ts` — Zustand State Management

**What it does:** Holds the task list, filters, and provides CRUD operations with optimistic updates + WebSocket reconciliation.

**State shape:**
- `tasks: ITask[]` — the current task list
- `filters: TaskFilters` — active filters (status, priority, assignee, tag, milestone, search)
- `loading: boolean` — loading state for fetch
- `error: string | null` — last error message
- `activeGroupId: string | null` — which org is currently selected (null = personal tasks)

**Actions:**

- **`setGroupId(groupId)`** — Switches the active org and triggers a fresh `fetchTasks()`.

- **`setFilters(filters)`** — Updates filters and re-fetches.

- **`fetchTasks()`** — Calls either `taskApi.listOrg(groupId, filters)` or `taskApi.listPersonal(filters)` depending on `activeGroupId`. Sets loading/error state.

- **`addTask(data)`** — Optimistic flow:
  1. Creates a temp task with `id: "temp-${Date.now()}"`
  2. Immediately adds it to the store (UI shows it instantly)
  3. Calls the API in the background
  4. On success: replaces the temp task with the real server-returned task
  5. On error: removes the temp task and shows the error

- **`updateTask(id, data)`** — Optimistic flow:
  1. Immediately merges the changes into the store
  2. Calls the API
  3. On success: replaces with server-confirmed version
  4. On error: sets error (UI still shows optimistic change — could be improved with rollback)

- **`removeTask(id)`** — Optimistic flow:
  1. Immediately removes from the store
  2. Calls the API
  3. On error: sets error (task stays removed — same rollback limitation)

- **`reconcileWs(message)`** — Handles incoming WebSocket events:
  - Checks if the event's `orgId` matches `activeGroupId` (ignores events from other orgs)
  - `task:created` → adds to store (skips if already exists to avoid duplicates from optimistic + WS race)
  - `task:updated` → replaces the matching task in the store
  - `task:deleted` → removes from the store

**`initWsSync()` helper:**
- Called once at app startup
- Gets the current store state and subscribes `wsClient.onMessage()` to `store.reconcileWs()`
- This wires up the WebSocket to automatically update the store whenever the server broadcasts an event

---

## Information Flow

```
User action (click "Create Task")
  → task-dialog.tsx calls store.addTask(data)
    → Store adds temp task to tasks[] (UI updates instantly)
    → Store calls taskApi.createOrg(groupId, data)
      → api.ts does fetch(`${API_URL}/api/groups/${groupId}/tasks`, { credentials: 'include' })
        → Backend creates task, broadcasts "task:created" via WebSocket
      → api.ts returns { data: realTask, error: null }
    → Store replaces temp task with realTask
    → wsClient also receives "task:created" event
      → store.reconcileWs() sees task already exists (by id), skips duplicate
```

This is the infrastructure that Step 8+ will build the actual UI components on top of.
