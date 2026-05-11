import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { StaffRole } from "../../../../packages/shared-types/src";
import { env } from "../config/env";

export type AuthUser = {
  sub: number;
  role: StaffRole;
  branchId: number;
  isBlocked?: boolean;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, env.jwtSecret) as unknown as AuthUser;
    if (payload.isBlocked) return res.status(403).json({ message: "Account blocked by master admin" });
    (req as Request & { user?: AuthUser }).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function allowRoles(...roles: StaffRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: AuthUser }).user;
    if (!user || !roles.includes(user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}

