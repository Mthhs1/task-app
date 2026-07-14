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

"use client"

import { createContext, useContext, useState } from "react"
import { createStore, useStore } from "zustand"
import type { ITask, TaskStatus, Priority, WsMessage } from "@meu-projeto/types"
import { taskApi } from "@/lib/api"
import { wsClient } from "@/lib/ws"

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
// createTasksStore — Factory function for creating a store instance
// ============================================================================
function createTasksStore() {
  return createStore<TasksState>((set, get) => ({
    // --- INITIAL STATE -------------------------------------------------------
    tasks: [],          // No tasks loaded yet
    filters: {},        // No filters applied
    loading: false,     // Not fetching (fetch is triggered explicitly)
    error: null,        // No error
    activeGroupId: null, // Personal task mode by default

    // --------------------------------------------------------------------------
    // setGroupId — Switches between org-scoped and personal task mode
    // --------------------------------------------------------------------------
    setGroupId: (groupId) => {
      set({ activeGroupId: groupId });
      get().fetchTasks();
    },

    // --------------------------------------------------------------------------
    // setFilters — Updates active filters and refetches
    // --------------------------------------------------------------------------
    setFilters: (filters) => {
      set({ filters });
      get().fetchTasks();
    },

    // --------------------------------------------------------------------------
    // fetchTasks — Fetches tasks from the server based on groupId + filters
    // --------------------------------------------------------------------------
    fetchTasks: async () => {
      const { activeGroupId, filters } = get();
      set({ loading: true, error: null });

      const result = activeGroupId
        ? await taskApi.listOrg(activeGroupId, filters)
        : await taskApi.listPersonal(filters);

      if (result.error) {
        set({ loading: false, error: result.error.message });
        return;
      }

      set({ tasks: result.data.tasks ?? [], loading: false, error: null });
    },

    // --------------------------------------------------------------------------
    // addTask — Creates a task with optimistic update
    // --------------------------------------------------------------------------
    addTask: async (data) => {
      const { activeGroupId } = get();

      const optimisticTask: ITask = {
        ...data,
        id: `temp-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as ITask;

      set((state) => ({ tasks: [optimisticTask, ...(state.tasks || [])] }));

      const result = activeGroupId
        ? await taskApi.createOrg(activeGroupId, data)
        : await taskApi.createPersonal(data);

      if (result.error) {
        set((state) => ({
          tasks: (state.tasks || []).filter((t) => t.id !== optimisticTask.id),
          error: result.error.message,
        }));
        return;
      }

      set((state) => ({
        tasks: (state.tasks || []).map((t) => (t.id === optimisticTask.id ? result.data : t)),
      }));
    },

    // --------------------------------------------------------------------------
    // updateTask — Updates a task with optimistic update
    // --------------------------------------------------------------------------
    updateTask: async (id, data) => {
      const { activeGroupId } = get();

      const previousTasks = [...(get().tasks || [])];

      set((state) => ({
        tasks: (state.tasks || []).map((t) =>
          t.id === id ? { ...t, ...data, updatedAt: new Date() } : t,
        ),
      }));

      const body = { ...data, id };

      const result = activeGroupId
        ? await taskApi.updateOrg(activeGroupId, id, body)
        : await taskApi.updatePersonal(id, body);

      if (result.error) {
        set({ tasks: previousTasks, error: result.error.message });
        return;
      }

      set((state) => ({
        tasks: (state.tasks || []).map((t) => (t.id === id ? result.data : t)),
      }));
    },

    // --------------------------------------------------------------------------
    // removeTask — Deletes a task with optimistic update
    // --------------------------------------------------------------------------
    removeTask: async (id) => {
      const { activeGroupId } = get();

      const previousTasks = [...(get().tasks || [])];

      set((state) => ({
        tasks: (state.tasks || []).filter((t) => t.id !== id),
      }));

      const result = activeGroupId
        ? await taskApi.deleteOrg(activeGroupId, id)
        : await taskApi.deletePersonal(id);

      if (result.error) {
        set({ tasks: previousTasks, error: result.error.message });
      }
    },

    // --------------------------------------------------------------------------
    // reconcileWs — Processes a WebSocket event and updates the store
    // --------------------------------------------------------------------------
    reconcileWs: (message) => {
      const { activeGroupId } = get();

      if ("orgId" in message && message.orgId !== activeGroupId) return;

      switch (message.type) {
        case "task:created": {
          set((state) => {
            const tasks = state.tasks || [];
            if (tasks.find((t) => t.id === message.payload.id)) return state;
            return { tasks: [message.payload, ...tasks] };
          });
          break;
        }
        case "task:updated": {
          set((state) => ({
            tasks: (state.tasks || []).map((t) => (t.id === message.payload.id ? message.payload : t)),
          }));
          break;
        }
        case "task:deleted": {
          set((state) => ({
            tasks: (state.tasks || []).filter((t) => t.id !== message.payload.id),
          }));
          break;
        }
      }
    },
  }))
}

// ============================================================================
// TasksProvider — Context provider that creates a store instance per tree
// ============================================================================
type TasksStore = ReturnType<typeof createTasksStore>

const TasksStoreContext = createContext<TasksStore | null>(null)

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(() => createTasksStore())

  return (
    <TasksStoreContext.Provider value={store}>
      {children}
    </TasksStoreContext.Provider>
  )
}

// ============================================================================
// useTasksStore — Selector hook that reads from the context-scoped store
// ============================================================================
export function useTasksStore<T>(selector: (state: TasksState) => T): T {
  const store = useContext(TasksStoreContext)
  if (!store) {
    throw new Error("useTasksStore must be used within TasksProvider")
  }
  return useStore(store, selector)
}

// ============================================================================
// initWsSync — Wires the WebSocket listener to the task store
// ============================================================================
// Should be called once at app startup (e.g., in a providers component or
// root layout) after the user is authenticated.
//
// Accepts the store instance directly (from the context) rather than
// calling getState(), so it works with context-scoped stores.
//
// Returns the unsubscribe function from wsClient.onMessage() so callers
// can clean up the subscription if needed:
//
//   const unsync = initWsSync(store);
//   // ... later, on logout:
//   unsync();
//   wsClient.disconnect();
export function initWsSync(store: TasksStore): () => void {
  const state = store.getState()

  return wsClient.onMessage((message) => {
    state.reconcileWs(message)
  })
}
