import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { authDispatcher, getSession } from "../controllers/auth.controller";
import { auth } from "../auth/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth", authDispatcher);
  app.get("/api/auth/session", getSession);

  app.get("/api/auth/callback/*", async (request: FastifyRequest, reply: FastifyReply) => {
    const url = new URL(request.url, `${request.protocol}://${request.hostname}`);
    const betterReq = new Request(url.toString(), {
      method: "GET",
      headers: fromNodeHeaders(request.headers),
    });
    const betterRes = await auth.handler(betterReq);
    reply.code(betterRes.status);
    betterRes.headers.forEach((value, key) => reply.header(key, value));
    const text = await betterRes.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  });
}
