import { type FastifyRequest, type FastifyReply } from "fastify";
import { auth } from "../auth/auth";

export async function authHandler(request: FastifyRequest, reply: FastifyReply) {
  const url = new URL(request.url, `${request.protocol}://${request.hostname}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) {
      if (typeof value === "string") {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(", "));
      }
    }
  }

  const body =
    request.method !== "GET" && request.method !== "HEAD" && request.body
      ? JSON.stringify(request.body)
      : undefined;

  const betterReq = new Request(url.toString(), {
    method: request.method,
    headers,
    body,
  });

  const betterRes = await auth.handler(betterReq);

  reply.code(betterRes.status);
  betterRes.headers.forEach((value, key) => {
    reply.header(key, value);
  });

  const text = await betterRes.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
