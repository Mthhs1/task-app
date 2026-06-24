import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().default('http://localhost:3001'),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  PORT: z.string().transform(Number).default(3001),
});

export const env = envSchema.parse(process.env);
