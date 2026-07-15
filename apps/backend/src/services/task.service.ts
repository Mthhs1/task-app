import { eq, and, asc, desc, count, isNull, isNotNull, ilike } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  tasks,
  taskTags,
  tags,
  timeEntries,
  comments,
  milestones,
  user,
} from "../db/schema/index.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskListQuerySchema,
  taskReorderSchema,
  type CreateTaskInput,
  type UpdateTaskInput,
  type TaskListQuery,
  type TaskReorderInput,
  type ITask,
} from "@meu-projeto/types";

export interface TaskWithRelations extends ITask {
  subtasks: TaskWithRelations[];
  tags: { id: string; name: string; color: string }[];
  timeEntriesCount: number;
  commentsCount: number;
}

function mapDbTaskToSchema(row: typeof tasks.$inferSelect): ITask {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as ITask["status"],
    priority: row.priority as ITask["priority"],
    dueDate: row.dueDate,
    timeEstimateMinutes: row.timeEstimateMinutes,
    assigneeId: row.assigneeId,
    milestoneId: row.milestoneId,
    parentId: row.parentId,
    orgId: row.organizationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function fetchTaskWithRelations(taskId: string): Promise<TaskWithRelations | null> {
  const taskRow = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
    with: {
      subtasks: {
        with: {
          assignee: true,
          createdBy: true,
        },
      },
      taskTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (!taskRow) return null;

  const [{ value: commentsCount }] = await db
    .select({ value: count() })
    .from(comments)
    .where(eq(comments.taskId, taskId));

  const [{ value: timeEntriesCount }] = await db
    .select({ value: count() })
    .from(timeEntries)
    .where(eq(timeEntries.taskId, taskId));

  const subtasksMapped: TaskWithRelations[] = [];
  for (const sub of taskRow.subtasks) {
    const subComments = await db
      .select({ value: count() })
      .from(comments)
      .where(eq(comments.taskId, sub.id));
    const subTime = await db
      .select({ value: count() })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, sub.id));

    subtasksMapped.push({
      ...mapDbTaskToSchema(sub),
      subtasks: [],
      tags: [],
      commentsCount: subComments[0].value,
      timeEntriesCount: subTime[0].value,
    });
  }

  return {
    ...mapDbTaskToSchema(taskRow),
    subtasks: subtasksMapped,
    tags: taskRow.taskTags.map((tt) => ({
      id: tt.tag.id,
      name: tt.tag.name,
      color: tt.tag.color,
    })),
    commentsCount,
    timeEntriesCount,
  };
}

export async function createTask(
  userId: string,
  data: CreateTaskInput & { orgId?: string | null }
) {
  const { orgId, ...taskData } = data;
  const validated = createTaskSchema.parse({ ...taskData, orgId: orgId ?? null });

  const [inserted] = await db
    .insert(tasks)
    .values({
      organizationId: orgId ?? null,
      userId: orgId ? null : userId,
      createdById: userId,
      title: validated.title,
      description: validated.description,
      priority: validated.priority,
      status: validated.status,
      dueDate: validated.dueDate,
      timeEstimateMinutes: validated.timeEstimateMinutes,
      assigneeId: validated.assigneeId,
      milestoneId: validated.milestoneId,
      parentId: validated.parentId,
      position: 0,
    })
    .returning();

  return mapDbTaskToSchema(inserted);
}

export interface ListTasksResult {
  tasks: TaskWithRelations[];
  total: number;
}

export async function listTasks(
  orgId: string | null,
  userId: string | null,
  query: TaskListQuery
): Promise<ListTasksResult> {
  const validated = taskListQuerySchema.parse(query);

  const conditions: any[] = [isNull(tasks.parentId)];

  if (orgId) {
    conditions.push(eq(tasks.organizationId, orgId));
  } else if (userId) {
    conditions.push(eq(tasks.userId, userId));
  }

  if (validated.status) conditions.push(eq(tasks.status, validated.status));
  if (validated.priority) conditions.push(eq(tasks.priority, validated.priority));
  if (validated.assigneeId) conditions.push(eq(tasks.assigneeId, validated.assigneeId));
  if (validated.milestoneId) conditions.push(eq(tasks.milestoneId, validated.milestoneId));
  if (validated.search) {
    conditions.push(ilike(tasks.title, `%${validated.search}%`));
  }

  const dbTasks = await db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [asc(tasks.position), desc(tasks.createdAt)],
    with: {
      taskTags: {
        with: {
          tag: true,
        },
      },
      assignee: true,
      createdBy: true,
    },
  });

  const result: TaskWithRelations[] = [];
  for (const t of dbTasks) {
    const [{ value: commentsCount }] = await db
      .select({ value: count() })
      .from(comments)
      .where(eq(comments.taskId, t.id));
    const [{ value: timeEntriesCount }] = await db
      .select({ value: count() })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, t.id));

    result.push({
      ...mapDbTaskToSchema(t),
      subtasks: [],
      tags: t.taskTags.map((tt) => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color,
      })),
      commentsCount,
      timeEntriesCount,
    });
  }

  return { tasks: result, total: result.length };
}

export async function getTaskById(taskId: string): Promise<TaskWithRelations | null> {
  return fetchTaskWithRelations(taskId);
}

export async function updateTask(
  taskId: string,
  orgId: string | null,
  userId: string | null,
  data: UpdateTaskInput
) {
  const validated = updateTaskSchema.parse({ ...data, id: taskId });

  const whereClause: any[] = [eq(tasks.id, taskId)];
  if (orgId) {
    whereClause.push(eq(tasks.organizationId, orgId));
  } else if (userId) {
    whereClause.push(eq(tasks.userId, userId));
  }

  const existing = await db.query.tasks.findFirst({
    where: and(...whereClause),
  });

  if (!existing) {
    throw new Error("Task not found");
  }

  const updateData: Partial<typeof tasks.$inferInsert> = {};
  if (validated.title !== undefined) updateData.title = validated.title;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.status !== undefined) updateData.status = validated.status;
  if (validated.priority !== undefined) updateData.priority = validated.priority;
  if (validated.dueDate !== undefined) updateData.dueDate = validated.dueDate;
  if (validated.timeEstimateMinutes !== undefined) updateData.timeEstimateMinutes = validated.timeEstimateMinutes;
  if (validated.assigneeId !== undefined) updateData.assigneeId = validated.assigneeId;
  if (validated.milestoneId !== undefined) updateData.milestoneId = validated.milestoneId;
  if (validated.parentId !== undefined) updateData.parentId = validated.parentId;

  if (validated.status === "done" && !existing.completedAt) {
    updateData.completedAt = new Date();
  } else if (validated.status !== "done") {
    updateData.completedAt = null;
  }

  const [updated] = await db
    .update(tasks)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(...whereClause))
    .returning();

  return mapDbTaskToSchema(updated);
}

export async function deleteTask(taskId: string, orgId: string | null, userId: string | null): Promise<boolean> {
  const whereClause: any[] = [eq(tasks.id, taskId)];
  if (orgId) {
    whereClause.push(eq(tasks.organizationId, orgId));
  } else if (userId) {
    whereClause.push(eq(tasks.userId, userId));
  }

  const existing = await db.query.tasks.findFirst({
    where: and(...whereClause),
  });

  if (!existing) {
    return false;
  }

  await db.delete(tasks).where(and(...whereClause));
  return true;
}

export async function reorderTask(
  taskId: string,
  orgId: string | null,
  userId: string | null,
  data: TaskReorderInput
) {
  const validated = taskReorderSchema.parse({ ...data, taskId });

  const whereClause: any[] = [eq(tasks.id, validated.taskId)];
  if (orgId) {
    whereClause.push(eq(tasks.organizationId, orgId));
  } else if (userId) {
    whereClause.push(eq(tasks.userId, userId));
  }

  const task = await db.query.tasks.findFirst({
    where: and(...whereClause),
  });

  if (!task) {
    throw new Error("Task not found");
  }

  const scopeClause: any[] = [isNull(tasks.parentId), eq(tasks.status, task.status)];
  if (orgId) {
    scopeClause.push(eq(tasks.organizationId, orgId));
  } else if (userId) {
    scopeClause.push(eq(tasks.userId, userId));
  }

  const allTasksInScope = await db.query.tasks.findMany({
    where: and(...scopeClause),
    orderBy: [asc(tasks.position)],
  });

  const taskIds = allTasksInScope.map((t) => t.id);
  const currentIndex = taskIds.indexOf(validated.taskId);
  if (currentIndex === -1) return mapDbTaskToSchema(task);

  taskIds.splice(currentIndex, 1);

  let insertIndex = 0;
  if (validated.afterTaskId === null) {
    insertIndex = 0;
  } else {
    const afterIndex = taskIds.indexOf(validated.afterTaskId);
    insertIndex = afterIndex !== -1 ? afterIndex + 1 : taskIds.length;
  }

  taskIds.splice(insertIndex, 0, validated.taskId);

  await Promise.all(
    taskIds.map((id, index) =>
      db.update(tasks).set({ position: index }).where(eq(tasks.id, id))
    )
  );

  const [refreshed] = await db.query.tasks.findMany({
    where: eq(tasks.id, validated.taskId),
    limit: 1,
  });

  return mapDbTaskToSchema(refreshed);
}
