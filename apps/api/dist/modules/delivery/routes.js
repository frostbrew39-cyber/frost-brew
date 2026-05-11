import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { store } from "../../repositories/memoryStore";
import { getIo } from "../../realtime/socket";
export const deliveryRouter = Router();
deliveryRouter.post("/riders", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
    const schema = z.object({ fullName: z.string(), phone: z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.flatten() });
    if (pool) {
        const user = req.user;
        const created = await pool.query(`INSERT INTO riders (branch_id, full_name, phone, is_active)
       VALUES ($1,$2,$3,TRUE)
       RETURNING id, full_name as "fullName", phone, is_active as "isActive"`, [user.branchId, parsed.data.fullName, parsed.data.phone]);
        return res.status(201).json(created.rows[0]);
    }
    const id = store.riders.size + 1;
    const rider = { id, fullName: parsed.data.fullName, phone: parsed.data.phone, isActive: true };
    store.riders.set(id, rider);
    return res.status(201).json(rider);
});
deliveryRouter.post("/assign", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
    const schema = z.object({ orderId: z.number(), riderId: z.number() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.flatten() });
    if (pool) {
        const orderResult = await pool.query("SELECT id FROM orders WHERE id=$1", [parsed.data.orderId]);
        const riderResult = await pool.query("SELECT id FROM riders WHERE id=$1", [parsed.data.riderId]);
        if (!orderResult.rows.length || !riderResult.rows.length)
            return res.status(404).json({ message: "Order or rider not found" });
        await pool.query(`INSERT INTO delivery_assignments (order_id, rider_id, assigned_at)
       VALUES ($1,$2,NOW())
       ON CONFLICT (order_id) DO UPDATE SET rider_id=EXCLUDED.rider_id, assigned_at=NOW()`, [parsed.data.orderId, parsed.data.riderId]);
        await pool.query("UPDATE orders SET status='OUT_FOR_DELIVERY', out_for_delivery_at=NOW() WHERE id=$1", [parsed.data.orderId]);
        getIo().emit("delivery.assigned", { orderId: parsed.data.orderId, riderId: parsed.data.riderId });
        return res.json({ success: true, orderId: parsed.data.orderId, riderId: parsed.data.riderId });
    }
    const order = store.orders.get(parsed.data.orderId);
    const rider = store.riders.get(parsed.data.riderId);
    if (!order || !rider)
        return res.status(404).json({ message: "Order or rider not found" });
    order.status = "OUT_FOR_DELIVERY";
    order.outForDeliveryAt = new Date().toISOString();
    getIo().emit("delivery.assigned", { orderId: order.id, riderId: rider.id });
    return res.json({ success: true, order, rider });
});
