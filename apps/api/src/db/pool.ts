import { Pool } from "pg";
import { env } from "../config/env";

function buildConnectionString(raw: string): string {
  const url = raw.trim();
  if (!url) return url;
  if (/([?&])sslmode=/i.test(url) || /\?sslmode=/i.test(url)) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}sslmode=verify-full`;
}

function looksLikeLocalPostgres(databaseUrl: string): boolean {
  return /(^|@)(localhost|127\.0\.0\.1)(\b|$)|socket:|unix:/i.test(databaseUrl);
}

const raw = env.databaseUrl.trim();

export const pool = raw
  ? new Pool(
      looksLikeLocalPostgres(raw)
        ? { connectionString: raw, connectionTimeoutMillis: 15_000 }
        : {
            connectionString: buildConnectionString(raw),
            ssl: { rejectUnauthorized: true },
            connectionTimeoutMillis: 15_000
          }
    )
  : null;

export function hasDb() {
  return Boolean(pool);
}

export async function pingDb() {
  if (!pool) return { connected: false, mode: "memory-fallback" as const };
  await pool.query("SELECT 1");
  return { connected: true, mode: "postgres" as const };
}
