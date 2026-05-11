import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { store, saveStore } from "../../repositories/memoryStore";
import { getIo } from "../../realtime/socket";

export const deliveryRouter = Router();

deliveryRouter.get("/riders", requireAuth, async (_req, res) => {
  if (pool) {
    const result = await pool.query(`SELECT id, full_name as "name", phone, pay_rate as "payRate", rate_type as "type", deliveries_done as "deliveriesDone", is_active as "isActive" FROM riders`);
    return res.json(result.rows);
  }
  res.json(Array.from(store.riders.values()));
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
  
  if (pool) {
    const user = (req as any).user as { branchId: number };
    const created = await pool.query(
      `INSERT INTO riders (branch_id, full_name, phone, pay_rate, rate_type, is_active)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       RETURNING id, full_name as "name", phone, pay_rate as "payRate", rate_type as "type", is_active as "isActive"`,
      [user.branchId, parsed.data.name, parsed.data.phone, parsed.data.payRate || 0, parsed.data.type || "Per Delivery"]
    );
    return res.status(201).json(created.rows[0]);
  }
  const id = Date.now();
  const rider = { id, name: parsed.data.name, phone: parsed.data.phone, payRate: parsed.data.payRate || 0, type: parsed.data.type || "Per Delivery", deliveriesDone: 0, isActive: true };
  store.riders.set(id, rider);
  saveStore();
  return res.status(201).json(rider);
});

deliveryRouter.put("/riders/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  const { name, phone, payRate, type, deliveriesDone, isActive } = req.body;

  if (pool) {
     await pool.query(
       `UPDATE riders SET full_name=COALESCE($1, full_name), phone=COALESCE($2, phone), 
        pay_rate=COALESCE($3, pay_rate), rate_type=COALESCE($4, rate_type), 
        deliveries_done=COALESCE($5, deliveries_done), is_active=COALESCE($6, is_active)
        WHERE id=$7`,
       [name, phone, payRate, type, deliveriesDone, isActive, id]
     );
     return res.json({ success: true });
  }

  const rider = store.riders.get(id);
  if (!rider) return res.status(404).json({ message: "Rider not found" });
  if (name !== undefined) rider.name = name;
  if (phone !== undefined) rider.phone = phone;
  if (payRate !== undefined) rider.payRate = payRate;
  if (type !== undefined) rider.type = type;
  if (deliveriesDone !== undefined) rider.deliveriesDone = deliveriesDone;
  if (isActive !== undefined) rider.isActive = isActive;
  saveStore();
  return res.json(rider);
});

deliveryRouter.post("/assign", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const schema = z.object({ orderId: z.number(), riderId: z.number() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  if (pool) {
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
  }
  const order = store.orders.get(parsed.data.orderId);
  const rider = store.riders.get(parsed.data.riderId);
  if (!order || !rider) return res.status(404).json({ message: "Order or rider not found" });
  order.status = "OUT_FOR_DELIVERY";
  order.outForDeliveryAt = new Date().toISOString();
  getIo().emit("delivery.assigned", { orderId: order.id, riderId: rider.id });
  return res.json({ success: true, order, rider });
});

