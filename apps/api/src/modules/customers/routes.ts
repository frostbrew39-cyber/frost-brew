import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";

export const customersRouter = Router();

async function ensureCustomersTable() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id BIGSERIAL PRIMARY KEY,
      branch_id BIGINT,
      full_name VARCHAR(255),
      phone VARCHAR(50),
      address TEXT,
      loyalty_points INTEGER DEFAULT 0,
      khata_balance NUMERIC(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT`);
}

customersRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({ fullName: z.string(), phone: z.string(), address: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  const user = (req as any).user as { branchId: number };
  try {
    await ensureCustomersTable();
    const result = await pool.query(
      `INSERT INTO customers (branch_id, full_name, phone, address, loyalty_points, khata_balance)
       VALUES ($1,$2,$3,$4,0,0)
       RETURNING id, full_name as "fullName", phone, address, loyalty_points as "loyaltyPoints", khata_balance as "khataBalance"`,
      [user.branchId, parsed.data.fullName, parsed.data.phone, parsed.data.address || null]
    );
    return res.status(201).json(result.rows[0]);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to create customer" });
  }
});

customersRouter.get("/", requireAuth, async (req, res) => {
  const query = req.query.query?.toString() || req.query.phone?.toString() || req.query.name?.toString();
  try {
    await ensureCustomersTable();
    const user = (req as any).user as { branchId: number };
    const result = await pool.query(
      `SELECT id, full_name as "fullName", phone, address, loyalty_points as "loyaltyPoints", khata_balance as "khataBalance"
       FROM customers
       WHERE branch_id=$1 
         AND ($2::text IS NULL OR phone ILIKE '%' || $2 || '%' OR full_name ILIKE '%' || $2 || '%')
       ORDER BY id DESC`,
      [user.branchId, query ?? null]
    );
    return res.json(result.rows);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch customers" });
  }
});

