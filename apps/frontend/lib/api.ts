// ============================================================================
// Typed HTTP API Client
//
// Centralizes all frontend-to-backend HTTP communication. Provides:
//   - A typed fetch wrapper with cookie auth, timeout, and error extraction
//   - Namespaced API modules (taskApi, tagApi, etc.) matching backend routes
//
// All methods return { data, error } tuples — no exceptions thrown to callers.
// This forces calling code to handle both success and error paths explicitly.
// ============================================================================

// Shared Zod-inferred types from @meu-projeto/types — ensures the frontend
// and backend agree on request/response shapes end-to-end.
import type {
  ITask,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListQuery,
  TaskReorderInput,
  ITag,
  CreateTagInput,
  IMilestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ITimeEntry,
  CreateTimeEntryInput,
  IComment,
  CreateCommentInput,
  INotification,
} from "@meu-projeto/types";

// API_URL: base URL for all backend requests. In dev, this is
// http://localhost:3001 (the Fastify server). In production, this is
// set via NEXT_PUBLIC_API_URL to point to the deployed backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ----------------------------------------------------------------------------
// ApiError — Custom error class that preserves server response details
// ----------------------------------------------------------------------------
// Instead of losing the server's error body (validation messages, etc.),
// ApiError extracts a human-readable detail from the body and includes it
// in the .message property. This way, store.error shows the actual backend
// error text (e.g., "O título precisa ter pelo menos 3 letras") instead of
// just "API Error: 400".
//
// .status: HTTP status code (e.g., 400, 401, 404, 500). 0 for network errors.
// .body: raw parsed response body (for advanced error handling if needed).
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    // Try to extract a readable message from the body (e.g., { message: "..." }
    // or { errors: { field: ["..."] } }). If nothing useful is found,
    // fall back to just "API Error: <status>".
    const detail = extractErrorMessage(body);
    super(detail ? `API Error: ${status} — ${detail}` : `API Error: ${status}`);
  }
}

// ----------------------------------------------------------------------------
// extractErrorMessage — Pulls a human-readable string from an error body
// ----------------------------------------------------------------------------
// Handles three common backend error body formats:
//   1. Plain string:    "Task not found"          → returns as-is
//   2. { message: "…" }: standard Fastify error    → returns body.message
//   3. { errors: … }:   Zod flattenError format   → JSON-stringifies errors
// Returns null if nothing recognizable is found (caller falls back to status).
function extractErrorMessage(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    if ("message" in body && typeof body.message === "string") return body.message;
    if ("errors" in body) return JSON.stringify(body.errors);
  }
  return null;
}

// ----------------------------------------------------------------------------
// ApiResult — Discriminated union for request results
// ----------------------------------------------------------------------------
// Every API call returns either { data: T, error: null } (success) or
// { data: null, error: ApiError } (failure). This pattern:
//   - Forces callers to handle both cases (no uncaught exceptions)
//   - Works well with TypeScript narrowing: if (result.error) { ... } else { result.data }
type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

// REQUEST_TIMEOUT_MS: 15 seconds — generous enough for slow mobile connections
// but short enough that a hung request doesn't leave users stuck in loading
// forever. When the timer fires, AbortController.abort() cancels the fetch.
const REQUEST_TIMEOUT_MS = 15000;

// ----------------------------------------------------------------------------
// request — Core fetch wrapper with timeout, auth, and error handling
// ----------------------------------------------------------------------------
// This is the only function that actually calls fetch(). All apiGet/apiPost/
// apiPatch/apiDelete helpers delegate here, ensuring consistent behavior:
//   - credentials: 'include' sends the session cookie with every request
//   - Content-Type: application/json for all requests (bodies are JSON-stringified)
//   - AbortController enforces a 15s timeout
//   - Errors are wrapped in ApiError, never thrown to the caller
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  // Create an AbortController to enforce the timeout. If the fetch hasn't
  // completed within REQUEST_TIMEOUT_MS, controller.abort() fires, which
  // causes the fetch promise to reject with a DOMException (AbortError).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    // Construct the full URL: API_URL + path (e.g., http://localhost:3001/api/tasks)
    const res = await fetch(`${API_URL}${path}`, {
      ...options, // method, body, etc. from the caller
      signal: controller.signal, // enables timeout cancellation
      credentials: "include", // send session cookie (critical for auth)
      headers: {
        "Content-Type": "application/json", // all bodies are JSON
        ...options.headers, // allow caller to override headers if needed
      },
    });

    // Clear the timeout — the request completed before the deadline.
    clearTimeout(timer);

    // Non-2xx response: extract the error body and return an ApiError.
    // res.json().catch(() => null) handles responses that aren't valid JSON
    // (e.g., 502 from a proxy with an HTML error page).
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { data: null, error: new ApiError(res.status, body) };
    }

    // 204 No Content: common for DELETE operations. No JSON body to parse,
    // so we return null cast as T (the caller's expected type).
    if (res.status === 204) {
      return { data: null as T, error: null };
    }

    // Success: parse the JSON body and return it as typed data.
    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    // Always clear the timer — even on error, don't leave it dangling.
    clearTimeout(timer);

    // Distinguish timeout (abort) from other network errors so the caller
    // gets a meaningful message: "Request timed out" vs the raw error.
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const message = isAbort
      ? "Request timed out"
      : err instanceof Error ? err.message : "Unknown error";

    return {
      data: null,
      // status: 0 indicates a network-level failure (not an HTTP error).
      // This lets callers distinguish "server returned 500" (status=500)
      // from "couldn't reach server at all" (status=0).
      error: new ApiError(0, message),
    };
  }
}

// ----------------------------------------------------------------------------
// HTTP verb helpers — thin wrappers over request() for each HTTP method
// ----------------------------------------------------------------------------

// apiGet: appends query params as ?key=value&key2=value2 (URLSearchParams
// handles encoding). If no query is provided, the path is used as-is.
// Filters out undefined/null values to prevent "undefined" appearing in URLs.
export async function apiGet<T>(path: string, query?: Record<string, string>) {
  let qs = "";
  if (query) {
    // Remove undefined and null values before building query string
    const filtered = Object.fromEntries(
      Object.entries(query).filter(([_, value]) => value != null)
    );
    qs = Object.keys(filtered).length > 0 ? `?${new URLSearchParams(filtered).toString()}` : "";
  }
  return request<T>(`${path}${qs}`, { method: "GET" });
}

// apiPost: serializes the body to JSON and sends as POST.
export async function apiPost<T, TBody = unknown>(path: string, body: TBody) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// apiPatch: same as POST but uses PATCH (partial updates).
export async function apiPatch<T, TBody = unknown>(path: string, body: TBody) {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// apiDelete: no body needed — DELETE is just the method and path.
export async function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ============================================================================
// taskApi — Task CRUD endpoints (matches backend routes/tasks.routes.ts)
// ============================================================================
// Split into "org" methods (requires groupId + org membership) and
// "personal" methods (requires only auth, no org context).

export const taskApi = {
  // List org tasks with filters (status, priority, assignee, tag, milestone, search)
  listOrg: (groupId: string, query?: TaskListQuery) =>
    apiGet<ITask[]>(`/api/groups/${groupId}/tasks`, query as Record<string, string>),

  // Get a single task with relations (subtasks, tags, time entries, comments count)
  getOrg: (groupId: string, taskId: string) =>
    apiGet<ITask>(`/api/groups/${groupId}/tasks/${taskId}`),

  // Create a task in an org (with optional parentId for subtasks)
  createOrg: (groupId: string, body: CreateTaskInput) =>
    apiPost<ITask, CreateTaskInput>(`/api/groups/${groupId}/tasks`, body),

  // Partial update (title, status, priority, dueDate, etc.)
  updateOrg: (groupId: string, taskId: string, body: UpdateTaskInput) =>
    apiPatch<ITask, UpdateTaskInput>(`/api/groups/${groupId}/tasks/${taskId}`, body),

  // Delete a task (cascades to subtasks)
  deleteOrg: (groupId: string, taskId: string) =>
    apiDelete<ITask>(`/api/groups/${groupId}/tasks/${taskId}`),

  // Reorder a task within its status column (Kanban drag-and-drop)
  reorderOrg: (groupId: string, taskId: string, body: TaskReorderInput) =>
    apiPatch<ITask, TaskReorderInput>(`/api/groups/${groupId}/tasks/${taskId}/reorder`, body),

  // List personal tasks (not tied to any org) with same filters
  listPersonal: (query?: TaskListQuery) =>
    apiGet<ITask[]>("/api/tasks", query as Record<string, string>),

  // Get a personal task by ID
  getPersonal: (taskId: string) =>
    apiGet<ITask>(`/api/tasks/${taskId}`),

  // Create a personal task
  createPersonal: (body: CreateTaskInput) =>
    apiPost<ITask, CreateTaskInput>("/api/tasks", body),

  // Update a personal task
  updatePersonal: (taskId: string, body: UpdateTaskInput) =>
    apiPatch<ITask, UpdateTaskInput>(`/api/tasks/${taskId}`, body),

  // Delete a personal task
  deletePersonal: (taskId: string) =>
    apiDelete<ITask>(`/api/tasks/${taskId}`),

  // Reorder a personal task
  reorderPersonal: (taskId: string, body: TaskReorderInput) =>
    apiPatch<ITask, TaskReorderInput>(`/api/tasks/${taskId}/reorder`, body),
};

// ============================================================================
// tagApi — Tag CRUD endpoints (scoped to an org)
// ============================================================================

export const tagApi = {
  // List all tags for an org
  list: (groupId: string) =>
    apiGet<ITag[]>(`/api/groups/${groupId}/tags`),

  // Create a new tag (name + color)
  create: (groupId: string, body: CreateTagInput) =>
    apiPost<ITag, CreateTagInput>(`/api/groups/${groupId}/tags`, body),

  // Delete a tag (also removes all task_tags associations)
  delete: (groupId: string, tagId: string) =>
    apiDelete<ITag>(`/api/groups/${groupId}/tags/${tagId}`),
};

// ============================================================================
// milestoneApi — Milestone CRUD endpoints (scoped to an org)
// ============================================================================

export const milestoneApi = {
  // List all milestones for an org
  list: (groupId: string) =>
    apiGet<IMilestone[]>(`/api/groups/${groupId}/milestones`),

  // Create a milestone (title, description, dueDate)
  create: (groupId: string, body: CreateMilestoneInput) =>
    apiPost<IMilestone, CreateMilestoneInput>(`/api/groups/${groupId}/milestones`, body),

  // Update a milestone (status: active → completed, etc.)
  update: (groupId: string, id: string, body: UpdateMilestoneInput) =>
    apiPatch<IMilestone, UpdateMilestoneInput>(`/api/groups/${groupId}/milestones/${id}`, body),

  // Delete a milestone (unlinks from tasks, doesn't delete tasks)
  delete: (groupId: string, id: string) =>
    apiDelete<IMilestone>(`/api/groups/${groupId}/milestones/${id}`),
};

// ============================================================================
// timeApi — Time tracking endpoints (scoped to an org + task)
// ============================================================================

export const timeApi = {
  // List time entries for a specific task
  list: (groupId: string, taskId: string) =>
    apiGet<ITimeEntry[]>(`/api/groups/${groupId}/tasks/${taskId}/time`),

  // Log a new time entry (startTime, endTime, duration, note)
  create: (groupId: string, taskId: string, body: CreateTimeEntryInput) =>
    apiPost<ITimeEntry, CreateTimeEntryInput>(`/api/groups/${groupId}/tasks/${taskId}/time`, body),

  // Delete a specific time entry by its ID
  delete: (groupId: string, entryId: string) =>
    apiDelete<ITimeEntry>(`/api/groups/${groupId}/time/${entryId}`),

  // Aggregated time stats per user, per task (for dashboards)
  stats: (groupId: string) =>
    apiGet<Record<string, unknown>>(`/api/groups/${groupId}/time-stats`),
};

// ============================================================================
// commentApi — Comment endpoints (scoped to an org + task)
// ============================================================================

export const commentApi = {
  // List all comments on a task (threaded view)
  list: (groupId: string, taskId: string) =>
    apiGet<IComment[]>(`/api/groups/${groupId}/tasks/${taskId}/comments`),

  // Create a comment (content supports @mentions; backend auto-creates
  // mention records and notifications)
  create: (groupId: string, taskId: string, body: CreateCommentInput) =>
    apiPost<IComment, CreateCommentInput>(`/api/groups/${groupId}/tasks/${taskId}/comments`, body),

  // Delete a comment by its ID (not scoped to org — commentId is globally unique)
  delete: (commentId: string) =>
    apiDelete<IComment>(`/api/comments/${commentId}`),
};

// ============================================================================
// notificationApi — Notification endpoints (scoped to the authenticated user)
// ============================================================================

export const notificationApi = {
  // List all notifications for the current user (sorted by createdAt desc)
  list: () =>
    apiGet<INotification[]>("/api/notifications"),

  // Mark a specific notification as read
  markRead: (id: string) =>
    apiPatch<INotification, { read: true }>(`/api/notifications/${id}/read`, { read: true }),

  // Mark ALL notifications as read (bulk operation)
  markAllRead: () =>
    apiPatch<INotification[], Record<string, never>>("/api/notifications/read-all", {}),
};