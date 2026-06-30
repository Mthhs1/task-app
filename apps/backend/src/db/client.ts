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
  prepare: false, // Required for Supabase connection pooler (PgBouncer)
  socket: {
    family: 4, // Force IPv4 to avoid ENETUNREACH on IPv6
  },
});

export const db = drizzle(client, { schema });
