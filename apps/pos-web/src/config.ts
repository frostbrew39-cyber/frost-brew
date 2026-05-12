import { io, type Socket } from "socket.io-client";

const LOCAL_API_PORT = 10000;

function devApiHost(): string {
  if (typeof window === "undefined") return `http://127.0.0.1:${LOCAL_API_PORT}`;
  return `http://${window.location.hostname}:${LOCAL_API_PORT}`;
}

const rawApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "");
const rawSocket = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim().replace(/\/+$/, "");

// URL Audit Log
console.log("[POS Config] VITE_API_URL:", rawApi || "MISSING");
console.log("[POS Config] VITE_SOCKET_URL:", rawSocket || "MISSING (will derive from API)");

function inferSocketFromApiUrl(apiUrl: string): string {
  return apiUrl.replace(/\/api\/v1\/?$/i, "");
}

/**
 * Full REST base including `/api/v1` (from `VITE_API_URL`).
 * In dev, falls back to same host as the Vite app on port {@link LOCAL_API_PORT} if unset.
 */
export const API_V1_URL =
  rawApi && rawApi.length > 0
    ? rawApi
    : import.meta.env.DEV
      ? `${devApiHost()}/api/v1`
      : "";

/**
 * Socket.IO origin (no `/api/v1`). Prefer `VITE_SOCKET_URL`; else derive from `VITE_API_URL`.
 */
export const SOCKET_URL =
  rawSocket && rawSocket.length > 0
    ? rawSocket
    : rawApi && rawApi.length > 0
      ? inferSocketFromApiUrl(rawApi)
      : import.meta.env.DEV
        ? devApiHost()
        : "";

if (import.meta.env.PROD && !rawApi) {
  // eslint-disable-next-line no-console
  console.error(
    "[POS] Production build is missing VITE_API_URL. Set it in Vercel to your Render API URL (e.g. https://your-api.onrender.com/api/v1)."
  );
}

if (import.meta.env.PROD && !SOCKET_URL) {
  // eslint-disable-next-line no-console
  console.error("[POS] Production build could not resolve VITE_SOCKET_URL or VITE_API_URL for Socket.IO.");
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_V1_URL}${normalizedPath}`;
}

/** WebSocket-only client (avoids long-polling issues on some hosts e.g. Render). */
export function createPosSocket(): Socket {
  const url = SOCKET_URL || devApiHost();
  return io(url, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 12,
    reconnectionDelay: 1000
  });
}
