import { z } from 'zod';

// ============================================================================
// Enums as Zod string unions
// ============================================================================

export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);
export type Priority = z.infer<typeof prioritySchema>;

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done', 'archived']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const recurrenceFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const milestoneStatusSchema = z.enum(['active', 'completed', 'overdue']);
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;

export const notificationTypeSchema = z.enum([
  'mention',
  'task_assigned',
  'task_completed',
  'comment',
  'milestone_due',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

// ============================================================================
// Task schemas
// ============================================================================

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(3, 'O título precisa ter pelo menos 3 letras'),
  description: z.string().nullable().default(null),
  status: taskStatusSchema.default('todo'),
  priority: prioritySchema.default('medium'),
  dueDate: z.coerce.date().nullable().default(null),
  timeEstimateMinutes: z.number().int().nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  milestoneId: z.string().nullable().default(null),
  parentId: z.string().nullable().default(null),
  orgId: z.string().nullable().default(null),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type ITask = z.infer<typeof taskSchema>;

export const createTaskSchema = taskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  id: z.string(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ============================================================================
// Recurrence schemas
// ============================================================================

export const recurrenceSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().min(1).default(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).nullable().default(null),
  dayOfMonth: z.number().int().min(1).max(31).nullable().default(null),
  completionWindowHours: z.number().int().min(1).nullable().default(null),
  endDate: z.coerce.date().nullable().default(null),
  createdAt: z.coerce.date(),
});

export type IRecurrence = z.infer<typeof recurrenceSchema>;

export const createRecurrenceSchema = recurrenceSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateRecurrenceInput = z.infer<typeof createRecurrenceSchema>;

export const updateRecurrenceSchema = createRecurrenceSchema.partial();

export type UpdateRecurrenceInput = z.infer<typeof updateRecurrenceSchema>;

// ============================================================================
// Tag schemas
// ============================================================================

export const tagSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().default('#3b82f6'),
  orgId: z.string(),
  createdAt: z.coerce.date(),
});

export type ITag = z.infer<typeof tagSchema>;

export const createTagSchema = tagSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// ============================================================================
// Milestone schemas
// ============================================================================

export const milestoneSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable().default(null),
  status: milestoneStatusSchema.default('active'),
  dueDate: z.coerce.date().nullable().default(null),
  orgId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type IMilestone = z.infer<typeof milestoneSchema>;

export const createMilestoneSchema = milestoneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = createMilestoneSchema.partial().extend({
  id: z.string(),
});

export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

// ============================================================================
// Time entry schemas
// ============================================================================

export const timeEntrySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable().default(null),
  durationMinutes: z.number().int().min(0).nullable().default(null),
  note: z.string().nullable().default(null),
  createdAt: z.coerce.date(),
});

export type ITimeEntry = z.infer<typeof timeEntrySchema>;

export const createTimeEntrySchema = timeEntrySchema.omit({
  id: true,
  createdAt: true,
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

// ============================================================================
// Comment + Mention schemas
// ============================================================================

export const commentSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  userId: z.string(),
  content: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type IComment = z.infer<typeof commentSchema>;

export const createCommentSchema = commentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const mentionSchema = z.object({
  id: z.string(),
  commentId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date(),
});

export type IMention = z.infer<typeof mentionSchema>;

// ============================================================================
// Notification schemas
// ============================================================================

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  relatedTaskId: z.string().nullable().default(null),
  relatedCommentId: z.string().nullable().default(null),
  read: z.boolean().default(false),
  createdAt: z.coerce.date(),
});

export type INotification = z.infer<typeof notificationSchema>;

export const createNotificationSchema = notificationSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

export const markNotificationReadSchema = z.object({
  id: z.string(),
});

// ============================================================================
// WebSocket message schema (discriminated union)
// ============================================================================

export const wsMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('task:created'),
    payload: taskSchema,
    orgId: z.string(),
  }),
  z.object({
    type: z.literal('task:updated'),
    payload: taskSchema,
    orgId: z.string(),
  }),
  z.object({
    type: z.literal('task:deleted'),
    payload: z.object({ id: z.string() }),
    orgId: z.string(),
  }),
  z.object({
    type: z.literal('comment:created'),
    payload: z.object({ comment: commentSchema, mentions: z.array(mentionSchema).default([]) }),
    orgId: z.string(),
  }),
  z.object({
    type: z.literal('notification:new'),
    payload: notificationSchema,
    userId: z.string(),
  }),
]);

export type WsMessage = z.infer<typeof wsMessageSchema>;

// ============================================================================
// Auth schemas
// ============================================================================

export const signInSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  name: z.string().min(2, 'O nome precisa ter pelo menos 2 letras'),
  email: z.email('E-mail inválido'),
  password: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

// ============================================================================
// Query / filter helpers
// ============================================================================

export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: prioritySchema.optional(),
  assigneeId: z.string().optional(),
  tagId: z.string().optional(),
  milestoneId: z.string().optional(),
  search: z.string().optional(),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;

export const taskReorderSchema = z.object({
  taskId: z.string(),
  afterTaskId: z.string().nullable(),
});

export type TaskReorderInput = z.infer<typeof taskReorderSchema>;
