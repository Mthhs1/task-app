// ============================================================================
// Tasks Store — Zustand state management for the task list
//
// Holds the current task list, active filters, and loading/error state.
// Provides CRUD operations with optimistic updates (UI updates immediately,
// reconciles with server response) and WebSocket event reconciliation.
//
// The store is the single source of truth for tasks in the frontend —
// components read from useTasksStore() and call actions to mutate.
// ============================================================================

import { create } from "zustand";
import type { ITask, TaskStatus, Priority, WsMessage } from "@meu-projeto/types";
import { taskApi } from "@/lib/api";
import { wsClient } from "@/lib/ws";

// ----------------------------------------------------------------------------
// TaskFilters — Shape of the current filter state
// ----------------------------------------------------------------------------
// All fields are optional — any combination can be active. When all are
// undefined, the store fetches unfiltered tasks. Each field maps to a
// query param in the backend GET /tasks endpoint.
interface TaskFilters {
  status?: TaskStatus;       // Filter by status (todo, in_progress, done, archived)
  priority?: Priority;      // Filter by priority level
  assigneeId?: string;       // Filter by assigned user
  tagId?: string;            // Filter by tag
  milestoneId?: string;      // Filter by linked milestone
  search?: string;           // Free-text search on task title (ilike)
}

// ----------------------------------------------------------------------------
// TasksState — The full contract of the Zustand store
// ----------------------------------------------------------------------------
// Divided into STATE (data the components read) and ACTIONS (functions
// the components call). Actions are typed to match their implementations
// (async methods return Promise<void> so callers can await them).
interface TasksState {
  // --- STATE ---------------------------------------------------------------

  // tasks: the current list of tasks. Empty array = loaded but no tasks,
  // not "loading". Contains real tasks from the server plus temporary
  // optimistic ones (with id: "temp-<timestamp>") during mutations.
  tasks: ITask[];

  // filters: currently active filter values. Setting these triggers a
  // refetch (see setFilters action).
  filters: TaskFilters;

  // loading: true while a fetchTasks() request is in flight. Components
  // use this to show skeleton/spinner placeholders.
  loading: boolean;

  // error: last error message from a failed operation (fetch or mutation).
  // null when no error. Components can render this in a toast or banner.
  error: string | null;

  // activeGroupId: which org is currently selected. When set, all operations
  // use the org-scoped API endpoints (taskApi.*Org). When null, operations
  // use the personal task endpoints (taskApi.*Personal).
  activeGroupId: string | null;

  // --- ACTIONS -------------------------------------------------------------

  // setGroupId: switches the active org and triggers a refetch.
  // Pass null to switch to personal tasks mode.
  setGroupId: (groupId: string | null) => void;

  // setFilters: updates the filter state and triggers a refetch.
  // Replaces ALL filters (not a merge) — pass the complete desired state.
  setFilters: (filters: TaskFilters) => void;

  // fetchTasks: fetches tasks from the server using the current groupId
  // and filters. Sets loading/error state appropriately.
  fetchTasks: () => Promise<void>;

  // addTask: creates a task using optimistic update.
  // A temp task is inserted immediately, then the API is called. On
  // success, the temp task is replaced with the real server-returned
  // task. On error, the temp task is removed and error is set.
  // Returns Promise<void> so callers can await error state updates.
  addTask: (data: Omit<ITask, "id" | "createdAt" | "updatedAt">) => Promise<void>;

  // updateTask: updates a task using optimistic update.
  // The store is mutated immediately, then the API is called. On
  // success, the task is replaced with the server-confirmed version.
  // On error, the error state is set (optimistic change persists).
  updateTask: (id: string, data: Partial<ITask>) => Promise<void>;

  // removeTask: deletes a task using optimistic update.
  // The task is removed immediately from the store, then the API is
  // called. On error, the error state is set (task stays removed).
  removeTask: (id: string) => Promise<void>;

  // reconcileWs: processes an incoming WebSocket event (task:created,
  // task:updated, task:deleted). Updates the store to reflect the server's
  // state without triggering a full refetch.
  reconcileWs: (message: WsMessage) => void;
}

// ============================================================================
// useTasksStore — The Zustand store instance
// ============================================================================
// create<TasksState>() receives a function (set, get) => ({ state + actions }).
//   set: merges partial state into the store (triggers re-render of subscribers)
//   get: reads the current store state (safe to use inside actions)
export const useTasksStore = create<TasksState>((set, get) => ({
  // --- INITIAL STATE -------------------------------------------------------
  tasks: [],          // No tasks loaded yet
  filters: {},        // No filters applied
  loading: false,     // Not fetching (fetch is triggered explicitly)
  error: null,        // No error
  activeGroupId: null, // Personal task mode by default

  // --------------------------------------------------------------------------
  // setGroupId — Switches between org-scoped and personal task mode
  // --------------------------------------------------------------------------
  // Stores the new groupId, then immediately triggers a refetch so the
  // UI shows tasks from the newly selected org (or personal tasks if null).
  setGroupId: (groupId) => {
    set({ activeGroupId: groupId }); // Update state → triggers re-render
    get().fetchTasks();               // Fetch tasks for the new context
  },

  // --------------------------------------------------------------------------
  // setFilters — Updates active filters and refetches
  // --------------------------------------------------------------------------
  // Note: this REPLACES the entire filter object, not a merge. Callers
  // must pass the complete filter state they want active.
  setFilters: (filters) => {
    set({ filters });
    get().fetchTasks();
  },

  // --------------------------------------------------------------------------
  // fetchTasks — Fetches tasks from the server based on groupId + filters
  // --------------------------------------------------------------------------
  // This is a standard (non-optimistic) fetch — it's reading data, not
  // mutating. Sets loading=true before the request so UI can show a spinner.
  fetchTasks: async () => {
    // Read current state to determine which endpoint to call.
    const { activeGroupId, filters } = get();

    // Set loading to trigger UI feedback (skeletons, spinners).
    // Clear any previous error so the UI doesn't show stale errors.
    set({ loading: true, error: null });

    // Choose endpoint based on whether an org is active:
    //   activeGroupId set → GET /api/groups/:groupId/tasks (org tasks)
    //   activeGroupId null → GET /api/tasks (personal tasks)
    // The `filters` object is passed as query params.
    const result = activeGroupId
      ? await taskApi.listOrg(activeGroupId, filters)
      : await taskApi.listPersonal(filters);

    // If the request returned an error, set error state and stop loading.
    // Don't clear existing tasks — the user still sees the previous list.
    if (result.error) {
      set({ loading: false, error: result.error.message });
      return;
    }

    // Success: replace the entire task list with freshly fetched data.
    set({ tasks: result.data, loading: false, error: null });
  },

  // --------------------------------------------------------------------------
  // addTask — Creates a task with optimistic update
  // --------------------------------------------------------------------------
  // Optimistic flow (better UX — user sees the new task immediately):
  //   1. Create a temp task object with a fake ID ("temp-<timestamp>")
  //   2. Insert it at the top of the tasks array (UI shows it right away)
  //   3. Call the API in the background
  //   4. If success: replace the temp task with the real server task
  //   5. If failure: remove the temp task and set the error message
  //
  // The temp ID is used as a correlation key — it lets updateTask or other
  // code find the temp entry if needed, and lets us cleanly remove it on error.
  addTask: async (data) => {
    const { activeGroupId } = get();

    // Build the optimistic task: spread the input data, add a temp ID and
    // current timestamps. This matches the ITask shape so the UI can render
    // it immediately (badges, date formatting, etc.).
    const optimisticTask: ITask = {
      ...data,
      id: `temp-${Date.now()}`,  // Prefix "temp-" means it's not persisted yet
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ITask; // Cast needed because we're using a fake ID string pattern

    // Insert the temp task at the front of the list — user sees it instantly.
    set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

    // Call the real API. The request is async — UI is already showing the
    // temp task. This is the "optimistic" part.
    const result = activeGroupId
      ? await taskApi.createOrg(activeGroupId, data)
      : await taskApi.createPersonal(data);

    // Error path: remove the temp task (it didn't persist) and show the error.
    // The filter removes it by temp ID — the user sees it disappear with an
    // error message (e.g., "API Error: 400 — O título precisa ter pelo menos 3 letras").
    if (result.error) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== optimisticTask.id),
        error: result.error.message,
      }));
      return;
    }

    // Success path: find the temp task by its temp ID and replace it with
    // the real server-returned task (which has a proper UUID/database ID).
    // This swap is invisible to the user — the task is already in the list.
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === optimisticTask.id ? result.data : t)),
    }));
  },

  // --------------------------------------------------------------------------
  // updateTask — Updates a task with optimistic update
  // --------------------------------------------------------------------------
  // Optimistic flow:
  //   1. Immediately merge the changes into the matching task in the store
  //   2. Call the API
  //   3. If success: replace with the server-confirmed version (in case the
  //      server modified fields like completedAt or updatedAt)
  //   4. If error: set the error state (optimistic change persists — a
  //      future improvement would be to roll back to the pre-update value)
  updateTask: async (id, data) => {
    const { activeGroupId } = get();

    // Optimistic update: spread the new data onto the matching task.
    // Also touch updatedAt so the UI reflects the change timestamp.
    // map() returns a new array — Zustand detects the reference change and
    // triggers a re-render of subscribed components.
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date() } : t,
      ),
    }));

    // The backend's updateTaskSchema requires an `id` field in the body.
    // The `data` param is a Partial<ITask> which may not contain `id`,
    // so we add it here before sending.
    const body = { ...data, id };

    // Call the real API.
    const result = activeGroupId
      ? await taskApi.updateOrg(activeGroupId, id, body)
      : await taskApi.updatePersonal(id, body);

    // Error path: set the error message. Note: we DON'T roll back the
    // optimistic change — the store still shows the user's edit. This is a
    // known limitation; a future enhancement could store a snapshot for rollback.
    if (result.error) {
      set({ error: result.error.message });
      return;
    }

    // Success path: replace the task with the server's version. This ensures
    // any server-computed fields (e.g., completedAt is set when status
    // becomes "done") are reflected in the store.
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? result.data : t)),
    }));
  },

  // --------------------------------------------------------------------------
  // removeTask — Deletes a task with optimistic update
  // --------------------------------------------------------------------------
  // Optimistic flow:
  //   1. Immediately remove the task from the store (UI updates)
  //   2. Call the API to delete on the server
  //   3. If error: set the error state (task stays removed — limitation:
  //      re-adding it would require storing the original object for rollback)
  removeTask: async (id) => {
    const { activeGroupId } = get();

    // Optimistic remove: filter out the task by ID. The UI updates instantly
    // — the user sees the task disappear without waiting for the server.
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));

    // Call the real API to delete the task on the server.
    const result = activeGroupId
      ? await taskApi.deleteOrg(activeGroupId, id)
      : await taskApi.deletePersonal(id);

    // If the server rejects (e.g., 403 not a member, 404 task not found),
    // set the error so the UI can show a toast. The task stays removed
    // from the local store — a refetch would bring it back if it still
    // exists on the server.
    if (result.error) {
      set({ error: result.error.message });
    }
  },

  // --------------------------------------------------------------------------
  // reconcileWs — Processes a WebSocket event and updates the store
  // --------------------------------------------------------------------------
  // Called whenever wsClient receives a validated message (see initWsSync).
  // This is the "real-time sync" path — instead of polling the server, the
  // store is updated instantly when the server broadcasts a change.
  reconcileWs: (message) => {
    const { activeGroupId } = get();

    // Org-scoped event: check if it belongs to the currently active org.
    // If the event's orgId differs from activeGroupId, ignore it — we don't
    // want to show task updates from orgs the user isn't currently viewing.
    // (User-scoped events like notification:new have "userId" instead of
    // "orgId", so they pass through.)
    if ("orgId" in message && message.orgId !== activeGroupId) return;

    // Switch on the event type (discriminated union from wsMessageSchema).
    switch (message.type) {
      case "task:created": {
        // Another user (or the same user in another tab) created a task.
        set((state) => {
          // Guard against duplicates: if we already have this task (e.g.,
          // our own optimistic add hasn't been reconciled yet, or the create
          // API response beat the WS event), don't add a duplicate.
          if (state.tasks.find((t) => t.id === message.payload.id)) return state;

          // Prepend the new task so it appears at the top of the list.
          return { tasks: [message.payload, ...state.tasks] };
        });
        break;
      }
      case "task:updated": {
        // A task was updated by another user (or via another session).
        set((state) => ({
          // Replace the matching task with the server's updated version.
          tasks: state.tasks.map((t) => (t.id === message.payload.id ? message.payload : t)),
        }));
        break;
      }
      case "task:deleted": {
        // A task was deleted by another user.
        set((state) => ({
          // Remove the task by ID from the local store.
          // message.payload here is { id: string } (not the full task object).
          tasks: state.tasks.filter((t) => t.id !== message.payload.id),
        }));
        break;
      }
      // Other event types (comment:created, notification:new) are not
      // handled here — they'll be consumed by their own stores when
      // those features are implemented in later steps.
    }
  },
}));

// ============================================================================
// initWsSync — Wires the WebSocket listener to the task store
// ============================================================================
// Should be called once at app startup (e.g., in a providers component or
// root layout) after the user is authenticated.
//
// Returns the unsubscribe function from wsClient.onMessage() so callers
// can clean up the subscription if needed:
//
//   const unsync = initWsSync();
//   // ... later, on logout:
//   unsync();
//   wsClient.disconnect();
//
// Getting the store state once is safe — Zustand's getState() returns
// the current state object, and the reconcileWs method always reads
// the latest state via get() inside the store, not from this snapshot.
export function initWsSync(): () => void {
  const store = useTasksStore.getState();

  // Register a message handler that delegates to the store's reconcileWs.
  // wsClient.onMessage() returns an unsubscribe function — we return it
  // so the caller can remove the subscription (prevents duplicate handlers
  // if initWsSync() is called more than once).
  return wsClient.onMessage((message) => {
    store.reconcileWs(message);
  });
}