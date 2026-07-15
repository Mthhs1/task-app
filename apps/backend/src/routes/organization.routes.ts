import { type FastifyInstance } from "fastify";
import { eq, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { user, member, invitation } from "../db/schema/index.js";
import { auth } from "../auth/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import { getSession } from "../auth/session.js";

export async function organizationRoutes(app: FastifyInstance) {
  app.post(
    "/api/groups/:groupId/invite-by-username",
    {
      preHandler: [async (request, reply) => {
        const session = await getSession(request.headers);
        if (!session?.user) {
          return reply.status(401).send({ message: "Não autorizado" });
        }
        (request as any).user = session.user;
      }],
    },
    async (request, reply) => {
      const { username } = request.body as { username: string };
      const { groupId } = request.params as { groupId: string };

      const foundUser = await db
        .select()
        .from(user)
        .where(eq(user.username, username))
        .limit(1);

      if (foundUser.length === 0) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      const targetUser = foundUser[0];

      const existingMember = await db
        .select()
        .from(member)
        .where(
          and(
            eq(member.organizationId, groupId),
            eq(member.userId, targetUser.id)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        return reply.status(400).send({ message: "Usuário já é membro" });
      }

      const currentUser = (request as any).user;

      try {
        const result = await auth.api.createInvitation({
          body: {
            organizationId: groupId,
            email: targetUser.email,
            role: "member",
          },
          headers: fromNodeHeaders(request.headers),
        });

        return reply.status(201).send({ invitation: result });
      } catch (error) {
        return reply.status(500).send({ message: "Falha ao criar convite" });
      }
    }
  );
}
