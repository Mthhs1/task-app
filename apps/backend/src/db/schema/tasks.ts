import { pgTable, uuid, text, timestamp, integer, varchar, pgEnum } from "drizzle-orm/pg-core";
import { primaryKey } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { organization } from "./organization.js";
import { user } from "./auth.js";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done", "archived"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", ["daily", "weekly", "monthly", "yearly"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["active", "completed", "overdue"]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").references(() => organization.id),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => tasks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  priority: priorityEnum("priority").notNull().default("medium"),
  status: taskStatusEnum("status").notNull().default("todo"),
  assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  timeEstimateMinutes: integer("time_estimate_minutes"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdById: text("created_by_id").notNull().references(() => user.id),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurrenceRules = pgTable("recurrence_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  frequency: recurrenceFrequencyEnum("frequency").notNull(),
  interval: integer("interval").notNull().default(1),
  daysOfWeek: integer("days_of_week").array(),
  dayOfMonth: integer("day_of_month"),
  completionWindowMinutes: integer("completion_window_minutes"),
  endDate: timestamp("end_date", { withTimezone: true }),
  lastGeneratedAt: timestamp("last_generated_at", { withTimezone: true }),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tags = pgTable("tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 7 }).notNull().default("#3b82f6"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskTags = pgTable("task_tags", {
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.tagId] }),
]);

export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: milestoneStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
