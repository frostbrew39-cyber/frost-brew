import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../../config/env";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const schema = z.object({ username: z.string(), password: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Missing credentials" });

  if (!pool) return res.status(500).json({ message: "Database not configured" });

  pool
    .query(
      `
      SELECT
        id,
        full_name,
        role,
        branch_id,
        is_blocked,
        is_active,
        salary_monthly
      FROM staff
      WHERE username = $1 AND password = $2
      LIMIT 1
      `,
      [parsed.data.username, parsed.data.password]
    )
    .then((result: { rows: any[] }) => {
      const row = result.rows?.[0];
      if (!row) return res.status(401).json({ message: "Invalid username or password" });
      if (row.is_blocked) return res.status(403).json({ message: "Access revoked by Admin" });
      if (row.is_active === false) return res.status(403).json({ message: "Account inactive" });

      const user = {
        id: Number(row.id),
        fullName: row.full_name,
        role: row.role,
        branchId: Number(row.branch_id),
        blocked: Boolean(row.is_blocked),
        salaryMonthly: row.salary_monthly == null ? undefined : Number(row.salary_monthly)
      };

      const token = jwt.sign(
        { sub: user.id, role: user.role, branchId: user.branchId, isBlocked: user.blocked },
        env.jwtSecret,
        { expiresIn: "8h" }
      );

      return res.json({ token, user });
    })
    .catch(() => res.status(500).json({ message: "Login failed" }));
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json((req as any).user);
});

