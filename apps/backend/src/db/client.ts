import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../env.js';
import * as schema from './schema/index.js';

const connectionUrl = new URL(env.DATABASE_URL)
// Ensure sslmode=require for Supabase direct connections
if (!connectionUrl.searchParams.has('sslmode')) {
  connectionUrl.searchParams.set('sslmode', 'require')
}

const client = postgres(connectionUrl.toString(), {
  ssl: { rejectUnauthorized: false },
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
