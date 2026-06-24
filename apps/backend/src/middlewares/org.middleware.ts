import { type FastifyRequest, type FastifyReply } from "fastify";
import { db } from "../db/client";
import { member } from "../db/schema/organization";
import { eq, and } from "drizzle-orm";

export async function requireOrgMember(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!user) {
    return reply.status(401).send({ message: "Unauthorized" });
  }

  const { groupId } = request.params as { groupId: string };

  const orgMember = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, groupId),
      eq(member.userId, user.id)
    ),
  });

  if (!orgMember) {
    return reply.status(403).send({ message: "Forbidden - not a member of this organization" });
  }

  (request as any).member = orgMember;
}
