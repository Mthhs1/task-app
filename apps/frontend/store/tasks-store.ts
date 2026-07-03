import { create } from "zustand";
import type { ITask, TaskStatus, Priority, WsMessage } from "@meu-projeto/types";
import { taskApi } from "@/lib/api";
import { wsClient } from "@/lib/ws";

interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  tagId?: string;
  milestoneId?: string;
  search?: string;
}

interface TasksState {
  tasks: ITask[];
  filters: TaskFilters;
  loading: boolean;
  error: string | null;
  activeGroupId: string | null;

  setGroupId: (groupId: string | null) => void;
  setFilters: (filters: TaskFilters) => void;
  fetchTasks: () => Promise<void>;
  addTask: (data: Omit<ITask, "id" | "createdAt" | "updatedAt">) => void;
  updateTask: (id: string, data: Partial<ITask>) => void;
  removeTask: (id: string) => void;
  reconcileWs: (message: WsMessage) => void;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  filters: {},
  loading: false,
  error: null,
  activeGroupId: null,

  setGroupId: (groupId) => {
    set({ activeGroupId: groupId });
    get().fetchTasks();
  },

  setFilters: (filters) => {
    set({ filters });
    get().fetchTasks();
  },

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

    set({ tasks: result.data, loading: false, error: null });
  },

  addTask: async (data) => {
    const { activeGroupId } = get();
    const optimisticTask: ITask = {
      ...data,
      id: `temp-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ITask;

    set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

    const result = activeGroupId
      ? await taskApi.createOrg(activeGroupId, data)
      : await taskApi.createPersonal(data);

    if (result.error) {
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== optimisticTask.id),
        error: result.error.message,
      }));
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === optimisticTask.id ? result.data : t)),
    }));
  },

  updateTask: async (id, data) => {
    const { activeGroupId } = get();

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...data, updatedAt: new Date() } : t,
      ),
    }));

    const body = { ...data, id };

    const result = activeGroupId
      ? await taskApi.updateOrg(activeGroupId, id, body)
      : await taskApi.updatePersonal(id, body);

    if (result.error) {
      set({ error: result.error.message });
      return;
    }

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? result.data : t)),
    }));
  },

  removeTask: async (id) => {
    const { activeGroupId } = get();

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));

    const result = activeGroupId
      ? await taskApi.deleteOrg(activeGroupId, id)
      : await taskApi.deletePersonal(id);

    if (result.error) {
      set({ error: result.error.message });
    }
  },

  reconcileWs: (message) => {
    const { activeGroupId } = get();

    if ("orgId" in message && message.orgId !== activeGroupId) return;

    switch (message.type) {
      case "task:created": {
        set((state) => {
          if (state.tasks.find((t) => t.id === message.payload.id)) return state;
          return { tasks: [message.payload, ...state.tasks] };
        });
        break;
      }
      case "task:updated": {
        set((state) => ({
          tasks: state.tasks.map((t) => (t.id === message.payload.id ? message.payload : t)),
        }));
        break;
      }
      case "task:deleted": {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== message.payload.id),
        }));
        break;
      }
    }
  },
}));

export function initWsSync() {
  const store = useTasksStore.getState();
  wsClient.onMessage((message) => {
    store.reconcileWs(message);
  });
}
