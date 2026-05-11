import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";
import { store, saveStore } from "../../repositories/memoryStore";

export const customersRouter = Router();

customersRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({ fullName: z.string(), phone: z.string(), address: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  const user = (req as any).user as { branchId: number };
  if (pool) {
    const result = await pool.query(
      `INSERT INTO customers (branch_id, full_name, phone, address, loyalty_points, khata_balance)
       VALUES ($1,$2,$3,$4,0,0)
       RETURNING id, full_name as "fullName", phone, address, loyalty_points as "loyaltyPoints", khata_balance as "khataBalance"`,
      [user.branchId, parsed.data.fullName, parsed.data.phone, parsed.data.address || null]
    );
    return res.status(201).json(result.rows[0]);
  }
  const id = store.customers.size + 1;
  const customer = { id, fullName: parsed.data.fullName, phone: parsed.data.phone, address: parsed.data.address || '', loyaltyPoints: 0, khataBalance: 0 };
  store.customers.set(id, customer);
  saveStore();
  return res.status(201).json(customer);
});

customersRouter.get("/", requireAuth, async (req, res) => {
  const query = req.query.query?.toString() || req.query.phone?.toString() || req.query.name?.toString();
  if (pool) {
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
  }
  const list = Array.from(store.customers.values());
  if (!query) return res.json(list);
  const q = query.toLowerCase();
  return res.json(list.filter((c) => c.phone.includes(q) || c.fullName.toLowerCase().includes(q)));
});

