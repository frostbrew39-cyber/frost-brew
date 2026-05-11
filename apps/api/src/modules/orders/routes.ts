import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { store, saveStore } from "../../repositories/memoryStore";
import { getIo } from "../../realtime/socket";

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "CASHIER", "WAITER"), async (req, res) => {
  const bodySchema = z.object({
    channel: z.enum(["COUNTER", "DINE_IN", "TAKEAWAY", "DELIVERY"]),
    customerId: z.number().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    paymentMethod: z.enum(["CASH", "CARD", "MOBILE_WALLET", "KHATA"]).optional(),
    taxRate: z.number().optional(),
    notes: z.string().optional(),
    items: z.array(
      z.object({
        menuItemId: z.number(),
        itemName: z.string().optional(),
        unitPrice: z.number().optional(),
        quantity: z.number().positive(),
          note: z.string().optional(),
          modifiers: z.array(z.object({ name: z.string(), extraPrice: z.number() })).optional()
        })
      )
      .min(1)
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const user = (req as any).user as { sub: number; branchId: number };
  let order: any;
  let finalCustomerId = parsed.data.customerId;
  let finalCustomerName = parsed.data.customerName;

  if (pool) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Auto-save new customer if phone is provided but no ID
      if (!finalCustomerId && parsed.data.customerPhone && parsed.data.customerName) {
         const custRes = await client.query(
           `INSERT INTO customers (branch_id, full_name, phone) VALUES ($1, $2, $3) RETURNING id`,
           [user.branchId, parsed.data.customerName, parsed.data.customerPhone]
         );
         finalCustomerId = custRes.rows[0].id;
         if (parsed.data.customerAddress) {
           await client.query(
             `INSERT INTO customer_addresses (customer_id, full_address, is_default) VALUES ($1, $2, true)`,
             [finalCustomerId, parsed.data.customerAddress]
           );
         }
      }

      try { await client.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,4) DEFAULT 0"); } catch(e) {}
      const seq = await client.query("SELECT COALESCE(MAX(id), 1000) + 1 AS next_id FROM orders");
      const nextId = Number(seq.rows[0].next_id);
      const orderNo = `FB-${nextId}`;
      const created = await client.query(
        `INSERT INTO orders (branch_id, order_no, customer_id, channel, status, placed_by_staff_id, notes, customer_name, customer_phone, customer_address, tax_rate)
         VALUES ($1,$2,$3,$4,'PENDING',$5,$6,$7,$8,$9,$10)
         RETURNING id, order_no, branch_id, customer_id, channel, status, placed_by_staff_id, placed_at, notes, tax_rate`,
        [user.branchId, orderNo, finalCustomerId ?? null, parsed.data.channel, user.sub, parsed.data.notes ?? null, finalCustomerName ?? null, parsed.data.customerPhone ?? null, parsed.data.customerAddress ?? null, parsed.data.taxRate || 0]
      );
      for (const item of parsed.data.items) {
        const unitPrice = item.unitPrice || 0;
        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, unit_price_snapshot, quantity, line_total)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [created.rows[0].id, item.menuItemId, item.itemName || `ITEM-${item.menuItemId}`, unitPrice, item.quantity, unitPrice * item.quantity]
        );
      }
      const items = await client.query(
        `SELECT menu_item_id as "menuItemId", item_name_snapshot as "itemName", unit_price_snapshot as "unitPrice", quantity, NULL::text as note
         FROM order_items WHERE order_id=$1`,
        [created.rows[0].id]
      );
      await client.query("COMMIT");
      order = {
        id: created.rows[0].id,
        orderNo: created.rows[0].order_no,
        branchId: created.rows[0].branch_id,
        customerId: created.rows[0].customer_id ?? undefined,
        channel: created.rows[0].channel,
        status: created.rows[0].status,
        placedByStaffId: created.rows[0].placed_by_staff_id,
        placedAt: created.rows[0].placed_at,
        notes: created.rows[0].notes ?? undefined,
        taxRate: Number(created.rows[0].tax_rate || 0),
        items: items.rows
      };
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } else {
    // Memory store fallback
    if (!finalCustomerId && parsed.data.customerPhone && parsed.data.customerName) {
      const existing = Array.from(store.customers.values()).find(c => c.phone === parsed.data.customerPhone);
      if (existing) {
        finalCustomerId = existing.id;
        finalCustomerName = existing.fullName;
      } else {
        finalCustomerId = store.customers.size + 1;
        finalCustomerName = parsed.data.customerName;
        store.customers.set(finalCustomerId, {
          id: finalCustomerId,
          fullName: finalCustomerName,
          phone: parsed.data.customerPhone,
          address: parsed.data.customerAddress || "",
          loyaltyPoints: 0,
          khataBalance: 0
        });
      }
    }

    store.seq.order += 1;
    order = {
      id: store.seq.order,
      orderNo: `FB-${store.seq.order}`,
      branchId: user.branchId,
      customerId: finalCustomerId,
      customerName: finalCustomerName,
      customerPhone: parsed.data.customerPhone,
      customerAddress: parsed.data.customerAddress,
      channel: parsed.data.channel,
      status: "PENDING" as const,
      placedByStaffId: user.sub,
      placedByStaffName: store.users.find(u => u.id === user.sub)?.fullName || "Staff",
      placedAt: new Date().toISOString(),
      notes: parsed.data.notes,
      taxRate: parsed.data.taxRate || 0,
      items: parsed.data.items,
      paymentMethod: parsed.data.paymentMethod
    };

    // Inventory Deduction (Memory fallback)
    for (const item of parsed.data.items) {
      // Very basic deduction: assuming 1 menu item = 1 unit of some primary inventory item for simplicity
      const invItem = store.inventory.get(item.menuItemId);
      if (invItem) {
        invItem.currentStock -= item.quantity;
      }
    }

    // Khata Update (Memory fallback)
    if (parsed.data.paymentMethod === "KHATA" && parsed.data.customerId) {
      const customer = store.customers.get(parsed.data.customerId);
      if (customer) {
        const totalAmount = parsed.data.items.reduce((sum, i) => sum + ((i.unitPrice || 0) * i.quantity), 0);
        customer.khataBalance += totalAmount;
      }
    }

    store.orders.set(order.id, order);
    saveStore();
  }
  const io = getIo();
  io.emit("order.created", order);
  io.emit("order.timer.started", { orderId: order.id, placedAt: order.placedAt });
  res.status(201).json(order);
});

ordersRouter.get("/", requireAuth, async (_req, res) => {
  if (pool) {
    try { await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,4) DEFAULT 0"); } catch(e) {}
    const result = await pool.query(
      `SELECT o.id, o.order_no as "orderNo", o.channel, o.status, o.placed_at as "placedAt", o.tax_rate as "taxRate", o.payment_method as "paymentMethod",
              COALESCE(
                json_agg(
                  json_build_object('menuItemId', oi.menu_item_id, 'quantity', oi.quantity, 'unitPrice', oi.unit_price_snapshot)
                ) FILTER (WHERE oi.id IS NOT NULL), '[]'
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
       ORDER BY o.id DESC
       LIMIT 100`
    );
    return res.json(result.rows);
  }
  return res.json(Array.from(store.orders.values()));
});

const orderItemsSchema = z.array(
  z.object({
    menuItemId: z.number(),
    itemName: z.string().optional(),
    unitPrice: z.number().optional(),
    quantity: z.number().positive(),
    note: z.string().optional(),
    modifiers: z.array(z.object({ name: z.string(), extraPrice: z.number() })).optional()
  })
).min(1);

ordersRouter.post(
  "/:id/settle",
  requireAuth,
  allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER"),
  async (req, res) => {
    const id = Number(req.params.id);
    const bodySchema = z.object({
      paymentMethod: z.enum(["CASH", "CARD", "MOBILE_WALLET", "KHATA"]),
      customerId: z.number().optional(),
      customerName: z.string().optional(),
      customerPhone: z.string().optional(),
      customerAddress: z.string().optional(),
      taxRate: z.number().optional(),
      items: orderItemsSchema.optional()
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

    if (pool) {
      return res.status(501).json({ message: "Settle on PostgreSQL is not implemented in this build; use in-memory demo mode." });
    }

    const order = store.orders.get(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "PENDING") return res.status(400).json({ message: "Only pending orders can be settled" });

    if (parsed.data.items) {
      order.items = parsed.data.items as any;
    }
    order.paymentMethod = parsed.data.paymentMethod;
    if (parsed.data.taxRate !== undefined) order.taxRate = parsed.data.taxRate;
    if (parsed.data.customerId !== undefined) order.customerId = parsed.data.customerId;
    if (parsed.data.customerName !== undefined) order.customerName = parsed.data.customerName;
    if (parsed.data.customerPhone !== undefined) order.customerPhone = parsed.data.customerPhone;
    if (parsed.data.customerAddress !== undefined) order.customerAddress = parsed.data.customerAddress;

    order.status = "COMPLETED";
    order.completedAt = new Date().toISOString();

    if (parsed.data.paymentMethod === "KHATA" && parsed.data.customerId) {
      const customer = store.customers.get(parsed.data.customerId);
      if (customer) {
        const totalAmount = order.items.reduce((sum: number, i: any) => sum + ((i.unitPrice || 0) * i.quantity), 0);
        customer.khataBalance += totalAmount;
      }
    }

    saveStore();
    getIo().emit("order.status.changed", order);
    return res.json(order);
  }
);

ordersRouter.put(
  "/:id",
  requireAuth,
  allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "WAITER"),
  async (req, res) => {
    const id = Number(req.params.id);
    const bodySchema = z.object({
      channel: z.enum(["COUNTER", "DINE_IN", "TAKEAWAY", "DELIVERY"]).optional(),
      taxRate: z.number().optional(),
      notes: z.string().optional(),
      items: orderItemsSchema
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

    if (pool) {
      return res.status(501).json({ message: "Order item updates on PostgreSQL are not implemented in this build; use in-memory demo mode." });
    }

    const order = store.orders.get(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "PENDING") return res.status(400).json({ message: "Only pending orders can be updated" });

    order.items = parsed.data.items as any;
    if (parsed.data.channel) order.channel = parsed.data.channel;
    if (parsed.data.taxRate !== undefined) order.taxRate = parsed.data.taxRate;
    if (parsed.data.notes !== undefined) order.notes = parsed.data.notes;

    saveStore();
    getIo().emit("order.updated", order);
    return res.json(order);
  }
);

ordersRouter.put("/:id/status", requireAuth, async (req, res) => {
  const schema = z.object({
    status: z.enum(["PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "FAILED_DELIVERY"]),
    reason: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  if (pool) {
    const field =
      parsed.data.status === "PREPARING"
        ? "prep_started_at"
        : parsed.data.status === "READY"
          ? "ready_at"
          : parsed.data.status === "OUT_FOR_DELIVERY"
            ? "out_for_delivery_at"
            : parsed.data.status === "COMPLETED"
              ? "completed_at"
              : null;
    const result = await pool.query(
      `UPDATE orders SET status=$1,
       cancellation_reason=$4,
       prep_started_at=CASE WHEN $2='prep_started_at' THEN NOW() ELSE prep_started_at END,
       ready_at=CASE WHEN $2='ready_at' THEN NOW() ELSE ready_at END,
       out_for_delivery_at=CASE WHEN $2='out_for_delivery_at' THEN NOW() ELSE out_for_delivery_at END,
       completed_at=CASE WHEN $2='completed_at' THEN NOW() ELSE completed_at END
       WHERE id=$3
       RETURNING id, order_no as "orderNo", status, placed_at as "placedAt",
                 prep_started_at as "prepStartedAt", ready_at as "readyAt",
                 out_for_delivery_at as "outForDeliveryAt", completed_at as "completedAt"`,
      [parsed.data.status, field, Number(req.params.id), parsed.data.reason || null]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Order not found" });
    getIo().emit("order.status.changed", result.rows[0]);
    return res.json(result.rows[0]);
  } else {
    const order = store.orders.get(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    order.status = parsed.data.status;
    if (parsed.data.reason) order.cancellationReason = parsed.data.reason;
    const now = new Date().toISOString();
    if (order.status === "PREPARING") order.prepStartedAt = now;
    if (order.status === "READY") order.readyAt = now;
    if (order.status === "OUT_FOR_DELIVERY") order.outForDeliveryAt = now;
    if (order.status === "COMPLETED") order.completedAt = now;
    saveStore();
    getIo().emit("order.status.changed", order);
    return res.json(order);
  }
});

