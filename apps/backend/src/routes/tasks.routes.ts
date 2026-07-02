import { type FastifyInstance } from "fastify";
import {
  createOrgTask,
  createPersonalTask,
  listOrgTasks,
  listPersonalTasks,
  getTask,
  updateOrgTask,
  updatePersonalTask,
  deleteOrgTask,
  deletePersonalTask,
  reorderOrgTask,
  reorderPersonalTask,
} from "../controllers/tasks.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { requireOrgMember } from "../middlewares/org.middleware.js";
import { createTaskSchema, updateTaskSchema, taskListQuerySchema, taskReorderSchema } from "@meu-projeto/types";
import * as z from "zod";

export async function taskRoutes(app: FastifyInstance) {
  const orgPreHandler = [requireAuth, requireOrgMember];
  const personalPreHandler = [requireAuth];

  // --- Organization tasks ---
  app.post(
    "/api/groups/:groupId/tasks",
    { preHandler: orgPreHandler },
    async (request, reply) => {
      const parsed = createTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return createOrgTask(request, reply);
    },
  );

  app.get(
    "/api/groups/:groupId/tasks",
    { preHandler: orgPreHandler },
    async (request, reply) => {
      const parsed = taskListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).query = parsed.data;
      return listOrgTasks(request, reply);
    },
  );

  app.patch(
    "/api/groups/:groupId/tasks/:taskId",
    { preHandler: orgPreHandler },
    async (request, reply) => {
      const parsed = updateTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return updateOrgTask(request, reply);
    },
  );

  app.delete(
    "/api/groups/:groupId/tasks/:taskId",
    { preHandler: orgPreHandler },
    async (request, reply) => {
      return deleteOrgTask(request, reply);
    },
  );

  app.patch(
    "/api/groups/:groupId/tasks/:taskId/reorder",
    { preHandler: orgPreHandler },
    async (request, reply) => {
      const parsed = taskReorderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return reorderOrgTask(request, reply);
    },
  );

  // --- Personal tasks ---
  app.post(
    "/api/tasks",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      const parsed = createTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return createPersonalTask(request, reply);
    },
  );

  app.get(
    "/api/tasks",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      const parsed = taskListQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).query = parsed.data;
      return listPersonalTasks(request, reply);
    },
  );

  app.get(
    "/api/tasks/:taskId",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      return getTask(request, reply);
    },
  );

  app.patch(
    "/api/tasks/:taskId",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      const parsed = updateTaskSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return updatePersonalTask(request, reply);
    },
  );

  app.delete(
    "/api/tasks/:taskId",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      return deletePersonalTask(request, reply);
    },
  );

  app.patch(
    "/api/tasks/:taskId/reorder",
    { preHandler: personalPreHandler },
    async (request, reply) => {
      const parsed = taskReorderSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ message: "Validation error", errors: z.flattenError(parsed.error) });
      }
      (request as any).body = parsed.data;
      return reorderPersonalTask(request, reply);
    },
  );
}
