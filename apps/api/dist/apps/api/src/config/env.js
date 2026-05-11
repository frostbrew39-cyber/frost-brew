export const env = {
    port: Number(process.env.PORT ?? 10000),
    jwtSecret: process.env.JWT_SECRET ?? "dev-secret",
    databaseUrl: process.env.DATABASE_URL ?? "",
    /** Comma-separated list (e.g. https://app.vercel.app,https://www.domain.com) */
    frontendUrl: process.env.FRONTEND_URL ?? ""
};
/** Origins allowed for Express + Socket.IO. `null` = allow all (local dev only). */
export function parseFrontendOrigins() {
    const raw = env.frontendUrl.trim();
    if (!raw)
        return null;
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return list.length ? list : null;
}
