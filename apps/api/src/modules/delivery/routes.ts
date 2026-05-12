import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { getIo } from "../../realtime/socket";

export const deliveryRouter = Router();

async function ensureDeliverySchema() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS riders (
      id BIGSERIAL PRIMARY KEY,
      branch_id BIGINT,
      full_name VARCHAR(120) NOT NULL,
      phone VARCHAR(30),
      pay_rate NUMERIC(12,2) DEFAULT 0,
      rate_type VARCHAR(60),
      deliveries_done INTEGER DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await pool.query(`ALTER TABLE riders ADD COLUMN IF NOT EXISTS pay_rate NUMERIC(12,2) DEFAULT 0`);
  await pool.query(`ALTER TABLE riders ADD COLUMN IF NOT EXISTS rate_type VARCHAR(60)`);
  await pool.query(`ALTER TABLE riders ADD COLUMN IF NOT EXISTS deliveries_done INTEGER DEFAULT 0`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS delivery_assignments (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      rider_id BIGINT NOT NULL REFERENCES riders(id),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

deliveryRouter.get("/riders", requireAuth, async (_req, res) => {
  try {
    await ensureDeliverySchema();
    const result = await pool.query(`SELECT id, full_name as "name", phone, pay_rate as "payRate", rate_type as "type", deliveries_done as "deliveriesDone", is_active as "isActive" FROM riders`);
    return res.json(result.rows);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch riders" });
  }
});

deliveryRouter.post("/riders", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const schema = z.object({ 
    name: z.string(), 
    phone: z.string(),
    payRate: z.number().optional(),
    type: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  
  try {
    await ensureDeliverySchema();
    const user = (req as any).user as { branchId: number };
    const created = await pool.query(
      `INSERT INTO riders (branch_id, full_name, phone, pay_rate, rate_type, is_active)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       RETURNING id, full_name as "name", phone, pay_rate as "payRate", rate_type as "type", is_active as "isActive"`,
      [user.branchId, parsed.data.name, parsed.data.phone, parsed.data.payRate || 0, parsed.data.type || "Per Delivery"]
    );
    return res.status(201).json(created.rows[0]);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to create rider" });
  }
});

deliveryRouter.put("/riders/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, payRate, type, deliveriesDone, isActive } = req.body;

  try {
     await ensureDeliverySchema();
     await pool.query(
       `UPDATE riders SET full_name=COALESCE($1, full_name), phone=COALESCE($2, phone), 
        pay_rate=COALESCE($3, pay_rate), rate_type=COALESCE($4, rate_type), 
        deliveries_done=COALESCE($5, deliveries_done), is_active=COALESCE($6, is_active)
        WHERE id=$7`,
       [name, phone, payRate, type, deliveriesDone, isActive, id]
     );
     return res.json({ success: true });
  } catch (e: any) {
     return res.status(500).json({ message: e?.message || "Failed to update rider" });
  }
});

deliveryRouter.post("/assign", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const schema = z.object({ orderId: z.number(), riderId: z.number() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    await ensureDeliverySchema();
    const orderResult = await pool.query("SELECT id FROM orders WHERE id=$1", [parsed.data.orderId]);
    const riderResult = await pool.query("SELECT id FROM riders WHERE id=$1", [parsed.data.riderId]);
    if (!orderResult.rows.length || !riderResult.rows.length) return res.status(404).json({ message: "Order or rider not found" });
    await pool.query(
      `INSERT INTO delivery_assignments (order_id, rider_id, assigned_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (order_id) DO UPDATE SET rider_id=EXCLUDED.rider_id, assigned_at=NOW()`,
      [parsed.data.orderId, parsed.data.riderId]
    );
    await pool.query("UPDATE orders SET status='OUT_FOR_DELIVERY', out_for_delivery_at=NOW() WHERE id=$1", [parsed.data.orderId]);
    getIo().emit("delivery.assigned", { orderId: parsed.data.orderId, riderId: parsed.data.riderId });
    return res.json({ success: true, orderId: parsed.data.orderId, riderId: parsed.data.riderId });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to assign delivery" });
  }
});

