import { Pool } from "pg";
import { env } from "../config/env";

export const pool = env.databaseUrl
  ? new Pool({ connectionString: env.databaseUrl })
  : null;

export function hasDb() {
  return Boolean(pool);
}

export async function pingDb() {
  if (!pool) return { connected: false, mode: "memory-fallback" as const };
  await pool.query("SELECT 1");
  return { connected: true, mode: "postgres" as const };
}

