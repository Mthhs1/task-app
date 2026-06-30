import { relations } from "drizzle-orm";
import { user, session, account } from "./schema/auth.js";
import { organization, member, invitation } from "./schema/organization.js";
import { tasks, recurrenceRules, tags, taskTags, milestones } from "./schema/tasks.js";
import { comments, mentions, timeEntries, notifications } from "./schema/collaboration.js";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(member),
  invitations: many(invitation),
  createdTasks: many(tasks),
  assignedTasks: many(tasks),
  comments: many(comments),
  mentions: many(mentions),
  timeEntries: many(timeEntries),
  notifications: many(notifications),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  invitations: many(invitation),
  tasks: many(tasks),
  tags: many(tags),
  milestones: many(milestones),
  notifications: many(notifications),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  organization: one(organization, {
    fields: [tasks.organizationId],
    references: [organization.id],
  }),
  parent: one(tasks, {
    fields: [tasks.parentId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, {
    relationName: "subtasks",
  }),
  assignee: one(user, {
    fields: [tasks.assigneeId],
    references: [user.id],
  }),
  createdBy: one(user, {
    fields: [tasks.createdById],
    references: [user.id],
  }),
  milestone: one(milestones, {
    fields: [tasks.milestoneId],
    references: [milestones.id],
  }),
  recurrenceRule: one(recurrenceRules),
  taskTags: many(taskTags),
  comments: many(comments),
  timeEntries: many(timeEntries),
  notifications: many(notifications),
}));

export const recurrenceRulesRelations = relations(recurrenceRules, ({ one }) => ({
  task: one(tasks, {
    fields: [recurrenceRules.taskId],
    references: [tasks.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  organization: one(organization, {
    fields: [tags.organizationId],
    references: [organization.id],
  }),
  taskTags: many(taskTags),
}));

export const taskTagsRelations = relations(taskTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskTags.taskId],
    references: [tasks.id],
  }),
  tag: one(tags, {
    fields: [taskTags.tagId],
    references: [tags.id],
  }),
}));

export const milestonesRelations = relations(milestones, ({ one, many }) => ({
  organization: one(organization, {
    fields: [milestones.organizationId],
    references: [organization.id],
  }),
  tasks: many(tasks),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  user: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
  mentions: many(mentions),
  notifications: many(notifications),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  comment: one(comments, {
    fields: [mentions.commentId],
    references: [comments.id],
  }),
  user: one(user, {
    fields: [mentions.userId],
    references: [user.id],
  }),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  task: one(tasks, {
    fields: [timeEntries.taskId],
    references: [tasks.id],
  }),
  user: one(user, {
    fields: [timeEntries.userId],
    references: [user.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [notifications.organizationId],
    references: [organization.id],
  }),
  task: one(tasks, {
    fields: [notifications.taskId],
    references: [tasks.id],
  }),
  comment: one(comments, {
    fields: [notifications.commentId],
    references: [comments.id],
  }),
}));
