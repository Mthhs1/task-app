import { type FastifyRequest, type FastifyReply } from "fastify";
import * as taskService from "../services/task.service.js";
import { type CreateTaskInput, type UpdateTaskInput, type TaskListQuery, type TaskReorderInput } from "@meu-projeto/types";

export async function createOrgTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const { groupId } = request.params as { groupId: string };
  const body = request.body as CreateTaskInput;

  const task = await taskService.createTask(user.id, { ...body, orgId: groupId });
  return reply.code(201).send(task);
}

export async function createPersonalTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const body = request.body as CreateTaskInput;

  const task = await taskService.createTask(user.id, body);
  return reply.code(201).send(task);
}

export async function listOrgTasks(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { groupId } = request.params as { groupId: string };
  const query = request.query as TaskListQuery;

  const result = await taskService.listTasks(groupId, null, query);
  return result;
}

export async function listPersonalTasks(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const query = request.query as TaskListQuery;

  const result = await taskService.listTasks(null, user.id, query);
  return result;
}

export async function getTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { taskId } = request.params as { taskId: string };

  const task = await taskService.getTaskById(taskId);
  if (!task) {
    return reply.code(404).send({ message: "Task not found" });
  }
  return task;
}

export async function updateOrgTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const { groupId, taskId } = request.params as { groupId: string; taskId: string };
  const body = request.body as UpdateTaskInput;

  try {
    const task = await taskService.updateTask(taskId, groupId, null, body);
    return task;
  } catch (err) {
    if (err instanceof Error && err.message === "Task not found") {
      return reply.code(404).send({ message: "Task not found" });
    }
    throw err;
  }
}

export async function updatePersonalTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const { taskId } = request.params as { taskId: string };
  const body = request.body as UpdateTaskInput;

  try {
    const task = await taskService.updateTask(taskId, null, user.id, body);
    return task;
  } catch (err) {
    if (err instanceof Error && err.message === "Task not found") {
      return reply.code(404).send({ message: "Task not found" });
    }
    throw err;
  }
}

export async function deleteOrgTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { groupId, taskId } = request.params as { groupId: string; taskId: string };

  const deleted = await taskService.deleteTask(taskId, groupId, null);
  if (!deleted) {
    return reply.code(404).send({ message: "Task not found" });
  }
  return reply.code(204).send();
}

export async function deletePersonalTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const { taskId } = request.params as { taskId: string };

  const deleted = await taskService.deleteTask(taskId, null, user.id);
  if (!deleted) {
    return reply.code(404).send({ message: "Task not found" });
  }
  return reply.code(204).send();
}

export async function reorderOrgTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { groupId, taskId } = request.params as { groupId: string; taskId: string };
  const body = request.body as TaskReorderInput;

  try {
    const task = await taskService.reorderTask(taskId, groupId, null, body);
    return task;
  } catch (err) {
    if (err instanceof Error && err.message === "Task not found") {
      return reply.code(404).send({ message: "Task not found" });
    }
    throw err;
  }
}

export async function reorderPersonalTask(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const user = (request as any).user;
  const { taskId } = request.params as { taskId: string };
  const body = request.body as TaskReorderInput;

  try {
    const task = await taskService.reorderTask(taskId, null, user.id, body);
    return task;
  } catch (err) {
    if (err instanceof Error && err.message === "Task not found") {
      return reply.code(404).send({ message: "Task not found" });
    }
    throw err;
  }
}
