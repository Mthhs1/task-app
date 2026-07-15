import { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { user } from "../db/schema/index.js";
import { getSession } from "../auth/session.js";

export async function userRoutes(app: FastifyInstance) {
  app.patch(
    "/api/user/username",
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
      const currentUser = (request as any).user;

      const existingUser = await db
        .select()
        .from(user)
        .where(eq(user.username, username))
        .limit(1);

      if (existingUser.length > 0 && existingUser[0].id !== currentUser.id) {
        return reply.status(400).send({ message: "Nome de usuário já está em uso" });
      }

      await db
        .update(user)
        .set({ username })
        .where(eq(user.id, currentUser.id));

      return reply.status(200).send({ message: "Nome de usuário atualizado", username });
    }
  );
}
