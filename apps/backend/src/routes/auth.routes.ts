import { type FastifyInstance } from "fastify";
import { authHandler } from "../controllers/auth.controller";

export async function authRoutes(app: FastifyInstance) {
  app.register(async (scopedApp) => {
    scopedApp.all("/*", authHandler);
  }, { prefix: "/api/auth" });
}
