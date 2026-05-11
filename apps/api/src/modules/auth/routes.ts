import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth";
import { store } from "../../repositories/memoryStore";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const schema = z.object({ username: z.string(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Missing credentials" });
  
  const user = store.users.find((u) => u.username === parsed.data.username && u.password === parsed.data.password);
  if (!user) return res.status(401).json({ message: "Invalid username or password" });
  if (user.blocked) return res.status(403).json({ message: "Access revoked by Admin" });

  const token = jwt.sign(
    { sub: user.id, role: user.role, branchId: user.branchId, isBlocked: user.blocked },
    env.jwtSecret,
    { expiresIn: "8h" }
  );
  return res.json({ token, user });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json((req as any).user);
});

