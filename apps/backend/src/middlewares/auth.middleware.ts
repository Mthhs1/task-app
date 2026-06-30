import { type FastifyRequest, type FastifyReply } from "fastify";
import { getSession } from "../auth/session.js";

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const session = await getSession(request.headers);
  if (!session) {
    return reply.status(401).send({ message: "Unauthorized" });
  }
  (request as any).user = session.user;
}
