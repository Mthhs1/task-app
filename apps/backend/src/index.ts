import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.routes.js";
import { taskRoutes } from "./routes/tasks.routes.js";

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });

  await app.register(authRoutes);
  await app.register(taskRoutes);

  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
    console.log(`Server running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
