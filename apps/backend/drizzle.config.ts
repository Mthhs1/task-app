import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // NOTE: drizzle-kit uses its own postgres driver internally for migrations.
  // If SSL fails, prepend:  NODE_TLS_REJECT_UNAUTHORIZED=0  to your command
});
