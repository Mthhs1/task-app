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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API Error: ${status}`);
  }
}

type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return { data: null, error: new ApiError(res.status, body) };
    }

    if (res.status === 204) {
      return { data: null as T, error: null };
    }

    const data = await res.json();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: new ApiError(0, err instanceof Error ? err.message : "Unknown error"),
    };
  }
}

export async function apiGet<T>(path: string, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : "";
  return request<T>(`${path}${qs}`, { method: "GET" });
}

export async function apiPost<T, TBody = unknown>(path: string, body: TBody) {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T, TBody = unknown>(path: string, body: TBody) {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

// ============================================================================
// Tasks
// ============================================================================

export const taskApi = {
  listOrg: (groupId: string, query?: TaskListQuery) =>
    apiGet<ITask[]>(`/api/groups/${groupId}/tasks`, query as Record<string, string>),

  getOrg: (groupId: string, taskId: string) =>
    apiGet<ITask>(`/api/groups/${groupId}/tasks/${taskId}`),

  createOrg: (groupId: string, body: CreateTaskInput) =>
    apiPost<ITask, CreateTaskInput>(`/api/groups/${groupId}/tasks`, body),

  updateOrg: (groupId: string, taskId: string, body: UpdateTaskInput) =>
    apiPatch<ITask, UpdateTaskInput>(`/api/groups/${groupId}/tasks/${taskId}`, body),

  deleteOrg: (groupId: string, taskId: string) =>
    apiDelete<ITask>(`/api/groups/${groupId}/tasks/${taskId}`),

  reorderOrg: (groupId: string, taskId: string, body: TaskReorderInput) =>
    apiPatch<ITask, TaskReorderInput>(`/api/groups/${groupId}/tasks/${taskId}/reorder`, body),

  listPersonal: (query?: TaskListQuery) =>
    apiGet<ITask[]>("/api/tasks", query as Record<string, string>),

  getPersonal: (taskId: string) =>
    apiGet<ITask>(`/api/tasks/${taskId}`),

  createPersonal: (body: CreateTaskInput) =>
    apiPost<ITask, CreateTaskInput>("/api/tasks", body),

  updatePersonal: (taskId: string, body: UpdateTaskInput) =>
    apiPatch<ITask, UpdateTaskInput>(`/api/tasks/${taskId}`, body),

  deletePersonal: (taskId: string) =>
    apiDelete<ITask>(`/api/tasks/${taskId}`),

  reorderPersonal: (taskId: string, body: TaskReorderInput) =>
    apiPatch<ITask, TaskReorderInput>(`/api/tasks/${taskId}/reorder`, body),
};

// ============================================================================
// Tags
// ============================================================================

export const tagApi = {
  list: (groupId: string) =>
    apiGet<ITag[]>(`/api/groups/${groupId}/tags`),

  create: (groupId: string, body: CreateTagInput) =>
    apiPost<ITag, CreateTagInput>(`/api/groups/${groupId}/tags`, body),

  delete: (groupId: string, tagId: string) =>
    apiDelete<ITag>(`/api/groups/${groupId}/tags/${tagId}`),
};

// ============================================================================
// Milestones
// ============================================================================

export const milestoneApi = {
  list: (groupId: string) =>
    apiGet<IMilestone[]>(`/api/groups/${groupId}/milestones`),

  create: (groupId: string, body: CreateMilestoneInput) =>
    apiPost<IMilestone, CreateMilestoneInput>(`/api/groups/${groupId}/milestones`, body),

  update: (groupId: string, id: string, body: UpdateMilestoneInput) =>
    apiPatch<IMilestone, UpdateMilestoneInput>(`/api/groups/${groupId}/milestones/${id}`, body),

  delete: (groupId: string, id: string) =>
    apiDelete<IMilestone>(`/api/groups/${groupId}/milestones/${id}`),
};

// ============================================================================
// Time entries
// ============================================================================

export const timeApi = {
  list: (groupId: string, taskId: string) =>
    apiGet<ITimeEntry[]>(`/api/groups/${groupId}/tasks/${taskId}/time`),

  create: (groupId: string, taskId: string, body: CreateTimeEntryInput) =>
    apiPost<ITimeEntry, CreateTimeEntryInput>(`/api/groups/${groupId}/tasks/${taskId}/time`, body),

  delete: (groupId: string, entryId: string) =>
    apiDelete<ITimeEntry>(`/api/groups/${groupId}/time/${entryId}`),

  stats: (groupId: string) =>
    apiGet<Record<string, unknown>>(`/api/groups/${groupId}/time-stats`),
};

// ============================================================================
// Comments
// ============================================================================

export const commentApi = {
  list: (groupId: string, taskId: string) =>
    apiGet<IComment[]>(`/api/groups/${groupId}/tasks/${taskId}/comments`),

  create: (groupId: string, taskId: string, body: CreateCommentInput) =>
    apiPost<IComment, CreateCommentInput>(`/api/groups/${groupId}/tasks/${taskId}/comments`, body),

  delete: (commentId: string) =>
    apiDelete<IComment>(`/api/comments/${commentId}`),
};

// ============================================================================
// Notifications
// ============================================================================

export const notificationApi = {
  list: () =>
    apiGet<INotification[]>("/api/notifications"),

  markRead: (id: string) =>
    apiPatch<INotification, { read: true }>(`/api/notifications/${id}/read`, { read: true }),

  markAllRead: () =>
    apiPatch<INotification[], Record<string, never>>("/api/notifications/read-all", {}),
};
