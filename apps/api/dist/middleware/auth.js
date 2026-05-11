import jwt from "jsonwebtoken";
import { env } from "../config/env";
export function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer "))
        return res.status(401).json({ message: "Unauthorized" });
    try {
        const token = auth.slice(7);
        const payload = jwt.verify(token, env.jwtSecret);
        if (payload.isBlocked)
            return res.status(403).json({ message: "Account blocked by master admin" });
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}
export function allowRoles(...roles) {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role))
            return res.status(403).json({ message: "Forbidden" });
        next();
    };
}
