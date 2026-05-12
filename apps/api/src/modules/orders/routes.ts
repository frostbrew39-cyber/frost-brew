import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { getIo } from "../../realtime/socket";

export const ordersRouter = Router();

async function ensureOrdersSchema() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`CREATE TABLE IF NOT EXISTS customer_addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    full_address TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);
  await pool.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(120)`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions JSONB`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(160)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(60)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,4) DEFAULT 0`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
}

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
  try {
    await ensureOrdersSchema();
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
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to create order" });
  }
  const io = getIo();
  io.emit("order.created", order);
  io.emit("order.timer.started", { orderId: order.id, placedAt: order.placedAt });
  res.status(201).json(order);
});

ordersRouter.get("/", requireAuth, async (_req, res) => {
  try {
    await ensureOrdersSchema();
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
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch orders" });
  }
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

    try {
      await ensureOrdersSchema();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(`SELECT id, status FROM orders WHERE id=$1`, [id]);
        if (!current.rows.length) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Order not found" });
        }
        if (current.rows[0].status !== "PENDING") {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Only pending orders can be settled" });
        }

        if (parsed.data.items) {
          await client.query(`DELETE FROM order_items WHERE order_id=$1`, [id]);
          for (const item of parsed.data.items) {
            const unitPrice = item.unitPrice || 0;
            await client.query(
              `INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, unit_price_snapshot, quantity, line_total)
               VALUES ($1,$2,$3,$4,$5,$6)`,
              [id, item.menuItemId, item.itemName || `ITEM-${item.menuItemId}`, unitPrice, item.quantity, unitPrice * item.quantity]
            );
          }
        }

        await client.query(
          `UPDATE orders
           SET status='COMPLETED',
               completed_at=NOW(),
               payment_method=COALESCE($1,payment_method),
               tax_rate=COALESCE($2,tax_rate),
               customer_id=COALESCE($3,customer_id),
               customer_name=COALESCE($4,customer_name),
               customer_phone=COALESCE($5,customer_phone),
               customer_address=COALESCE($6,customer_address)
           WHERE id=$7`,
          [
            parsed.data.paymentMethod,
            parsed.data.taxRate ?? null,
            parsed.data.customerId ?? null,
            parsed.data.customerName ?? null,
            parsed.data.customerPhone ?? null,
            parsed.data.customerAddress ?? null,
            id
          ]
        );

        if (parsed.data.paymentMethod === "KHATA" && parsed.data.customerId) {
          const sum = await client.query(`SELECT COALESCE(SUM(line_total),0) as total FROM order_items WHERE order_id=$1`, [id]);
          await client.query(`UPDATE customers SET khata_balance = COALESCE(khata_balance,0) + $1 WHERE id=$2`, [Number(sum.rows[0].total), parsed.data.customerId]);
        }

        const result = await client.query(
          `SELECT o.id, o.order_no as "orderNo", o.branch_id as "branchId", o.customer_id as "customerId",
                  o.customer_name as "customerName", o.customer_phone as "customerPhone", o.customer_address as "customerAddress",
                  o.channel, o.status, o.placed_by_staff_id as "placedByStaffId", o.placed_at as "placedAt", o.completed_at as "completedAt",
                  o.notes, o.tax_rate as "taxRate", o.payment_method as "paymentMethod",
                  COALESCE(
                    json_agg(json_build_object('menuItemId', oi.menu_item_id, 'itemName', oi.item_name_snapshot, 'unitPrice', oi.unit_price_snapshot, 'quantity', oi.quantity))
                    FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                  ) as items
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           WHERE o.id=$1
           GROUP BY o.id`,
          [id]
        );
        await client.query("COMMIT");
        const order = result.rows[0];
        getIo().emit("order.status.changed", order);
        return res.json(order);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Failed to settle order" });
    }
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

    try {
      await ensureOrdersSchema();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(`SELECT id, status FROM orders WHERE id=$1`, [id]);
        if (!current.rows.length) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Order not found" });
        }
        if (current.rows[0].status !== "PENDING") {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Only pending orders can be updated" });
        }

        await client.query(
          `UPDATE orders
           SET channel=COALESCE($1, channel), tax_rate=COALESCE($2, tax_rate), notes=COALESCE($3, notes)
           WHERE id=$4`,
          [parsed.data.channel ?? null, parsed.data.taxRate ?? null, parsed.data.notes ?? null, id]
        );

        await client.query(`DELETE FROM order_items WHERE order_id=$1`, [id]);
        for (const item of parsed.data.items) {
          const unitPrice = item.unitPrice || 0;
          await client.query(
            `INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, unit_price_snapshot, quantity, line_total)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, item.menuItemId, item.itemName || `ITEM-${item.menuItemId}`, unitPrice, item.quantity, unitPrice * item.quantity]
          );
        }

        const result = await client.query(
          `SELECT o.id, o.order_no as "orderNo", o.channel, o.status, o.placed_at as "placedAt", o.tax_rate as "taxRate", o.notes,
                  COALESCE(
                    json_agg(json_build_object('menuItemId', oi.menu_item_id, 'itemName', oi.item_name_snapshot, 'unitPrice', oi.unit_price_snapshot, 'quantity', oi.quantity))
                    FILTER (WHERE oi.id IS NOT NULL),
                    '[]'
                  ) as items
           FROM orders o
           LEFT JOIN order_items oi ON oi.order_id = o.id
           WHERE o.id=$1
           GROUP BY o.id`,
          [id]
        );
        await client.query("COMMIT");
        const order = result.rows[0];
        getIo().emit("order.updated", order);
        return res.json(order);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    } catch (e: any) {
      return res.status(500).json({ message: e?.message || "Failed to update order" });
    }
  }
);

ordersRouter.put("/:id/status", requireAuth, async (req, res) => {
  const schema = z.object({
    status: z.enum(["PENDING", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "FAILED_DELIVERY"]),
    reason: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    await ensureOrdersSchema();
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

    const dbStatus = parsed.data.status === "FAILED_DELIVERY" ? "CANCELLED" : parsed.data.status;
    const reason =
      parsed.data.status === "FAILED_DELIVERY"
        ? parsed.data.reason || "FAILED_DELIVERY"
        : parsed.data.reason || null;

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
                 out_for_delivery_at as "outForDeliveryAt", completed_at as "completedAt", cancellation_reason as "cancellationReason"`,
      [dbStatus, field, Number(req.params.id), reason]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Order not found" });
    getIo().emit("order.status.changed", result.rows[0]);
    return res.json(result.rows[0]);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to update order status" });
  }
});

