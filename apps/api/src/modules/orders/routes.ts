import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { getIo } from "../../realtime/socket";

export const ordersRouter = Router();

type ColumnInfo = { column_name: string };

type PgQueryable = { query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }> };

export async function getOrdersColumns(client?: PgQueryable) {
  const q = client ?? pool;
  if (!q) throw new Error("Database not configured");
  const result = await q.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders'
    `
  );
  return new Set((result.rows as ColumnInfo[]).map((r) => r.column_name));
}

export async function ensureOrdersSchema() {
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
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(12,8) DEFAULT 0`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_json JSONB`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(40)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_given NUMERIC(14,2)`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS change_returned NUMERIC(14,2)`);
}

function parseTableFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = String(notes).match(/TABLE:(T\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

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

type OrderLineItemInput = z.infer<typeof orderItemsSchema>[number];

async function insertOrderItemRow(client: PgQueryable, orderId: number, item: OrderLineItemInput): Promise<boolean> {
  try {
    const unitPrice = item.unitPrice || 0;
    await client.query(
      `INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, unit_price_snapshot, quantity, line_total)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [orderId, item.menuItemId, item.itemName || `ITEM-${item.menuItemId}`, unitPrice, item.quantity, unitPrice * item.quantity]
    );
    return true;
  } catch (err) {
    console.error("[order_items] insert skipped:", err);
    return false;
  }
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
    tableNumber: z.string().max(40).optional(),
    items: orderItemsSchema
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const user = (req as any).user as { sub: number; branchId: number };
  let order: any;
  let finalCustomerId = parsed.data.customerId;
  let finalCustomerName = parsed.data.customerName;
  const tableNumberNormalized =
    (parsed.data.tableNumber && parsed.data.tableNumber.trim()) || parseTableFromNotes(parsed.data.notes) || null;

  try {
    await ensureOrdersSchema();
    const client = await pool!.connect();
    try {
      await client.query("BEGIN");

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

      const seq = await client.query("SELECT COALESCE(MAX(id), 1000) + 1 AS next_id FROM orders");
      const nextId = Number(seq.rows[0].next_id);
      const orderNo = `FB-${nextId}`;
      const orderCols = await getOrdersColumns(client);
      const insertCols = ["branch_id", "order_no", "customer_id", "channel", "status", "placed_by_staff_id", "notes"];
      const insertVals: any[] = [
        user.branchId,
        orderNo,
        finalCustomerId ?? null,
        parsed.data.channel,
        "PENDING",
        user.sub,
        parsed.data.notes ?? null
      ];

      const addCol = (name: string, val: unknown) => {
        if (orderCols.has(name)) {
          insertCols.push(name);
          insertVals.push(val);
        }
      };

      addCol("customer_name", finalCustomerName ?? null);
      addCol("customer_phone", parsed.data.customerPhone ?? null);
      addCol("customer_address", parsed.data.customerAddress ?? null);
      addCol("tax_rate", parsed.data.taxRate ?? 0);
      addCol("payment_method", parsed.data.paymentMethod ?? null);
      addCol("items_json", JSON.stringify(parsed.data.items));
      addCol("table_number", tableNumberNormalized);

      const placeholders = insertVals.map((_, i) => `$${i + 1}`).join(",");
      const returningParts = ["id", "order_no", "branch_id", "customer_id", "channel", "status", "placed_by_staff_id", "placed_at", "notes"];
      if (orderCols.has("tax_rate")) returningParts.push("tax_rate");
      if (orderCols.has("table_number")) returningParts.push("table_number");

      const created = await client.query(
        `INSERT INTO orders (${insertCols.join(",")})
         VALUES (${placeholders})
         RETURNING ${returningParts.join(", ")}`,
        insertVals
      );

      const orderIdCreated = created.rows[0].id;
      for (const item of parsed.data.items) {
        await insertOrderItemRow(client, orderIdCreated, item);
      }

      const items = await client.query(
        `SELECT menu_item_id as "menuItemId", item_name_snapshot as "itemName", unit_price_snapshot as "unitPrice", quantity, NULL::text as note
         FROM order_items WHERE order_id=$1`,
        [orderIdCreated]
      );
      await client.query("COMMIT");
      order = {
        id: orderIdCreated,
        orderId: orderIdCreated,
        orderNo: created.rows[0].order_no,
        branchId: created.rows[0].branch_id,
        customerId: created.rows[0].customer_id ?? undefined,
        channel: created.rows[0].channel,
        status: created.rows[0].status,
        placedByStaffId: created.rows[0].placed_by_staff_id,
        placedAt: created.rows[0].placed_at,
        notes: created.rows[0].notes ?? undefined,
        taxRate: created.rows[0].tax_rate != null ? Number(created.rows[0].tax_rate) : Number(parsed.data.taxRate || 0),
        tableNumber: created.rows[0].table_number ?? tableNumberNormalized ?? undefined,
        items: items.rows
      };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(e);
      throw e;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to create order"
    });
  }
  const io = getIo();
  io.emit("order.created", order);
  io.emit("order.timer.started", { orderId: order.id, placedAt: order.placedAt });
  res.status(201).json(order);
});

ordersRouter.get("/", requireAuth, async (req, res) => {
  try {
    await ensureOrdersSchema();
    const user = (req as any).user as { branchId?: number };
    const branchId = user.branchId ?? null;
    const statusOnly = typeof req.query.status === "string" ? req.query.status : null;
    const activeOnly =
      req.query.active === "1" ||
      req.query.active === "true" ||
      String(req.query.pendingTables || "").toLowerCase() === "true";

    const params: unknown[] = [branchId];
    let extraWhere = "";
    if (activeOnly) {
      extraWhere = ` AND o.status IN ('PENDING','PREPARING','READY','OUT_FOR_DELIVERY')`;
    } else if (statusOnly) {
      params.push(statusOnly);
      extraWhere = ` AND o.status = $${params.length}`;
    }

    const result = await pool!.query(
      `
      SELECT
        o.id,
        o.order_no AS "orderNo",
        o.channel,
        o.status,
        o.placed_at AS "placedAt",
        o.tax_rate AS "taxRate",
        o.payment_method AS "paymentMethod",
        COALESCE(NULLIF(trim(o.table_number::text), ''), '') AS "_table_number_raw",
        o.notes,
        o.amount_given AS "amountGiven",
        o.change_returned AS "changeReturned",
        COALESCE(agg.items, '[]'::json) AS items
      FROM orders o
      LEFT JOIN (
        SELECT order_id,
          COALESCE(
            json_agg(
              json_build_object(
                'menuItemId', menu_item_id,
                'quantity', quantity,
                'unitPrice', unit_price_snapshot,
                'itemName', item_name_snapshot
              )
            ) FILTER (WHERE id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM order_items
        GROUP BY order_id
      ) agg ON agg.order_id = o.id
      WHERE ($1::bigint IS NULL OR o.branch_id = $1)
      ${extraWhere}
      ORDER BY o.id DESC
      LIMIT 200
      `,
      params
    );

    const rows = result.rows.map((row: Record<string, unknown>) => {
      const notes = row.notes as string | undefined;
      const tn = ((row["_table_number_raw"] as string) || "").trim() || parseTableFromNotes(notes) || undefined;
      const { _table_number_raw, ...rest } = row;
      return { ...rest, tableNumber: tn };
    });

    return res.json(rows);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to fetch orders"
    });
  }
});

ordersRouter.post("/:id/settle", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER", "CASHIER"), async (req, res) => {
  const id = Number(req.params.id);
  const bodySchema = z.object({
    paymentMethod: z.enum(["CASH", "CARD", "MOBILE_WALLET", "KHATA"]),
    customerId: z.number().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    taxRate: z.number().optional(),
    amountGiven: z.number().optional(),
    changeReturned: z.number().optional(),
    items: orderItemsSchema.optional()
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    await ensureOrdersSchema();
    const client = await pool!.connect();
    try {
      await client.query("BEGIN");
      const cols = await getOrdersColumns(client);
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
          await insertOrderItemRow(client, id, item);
        }
      }

      const setParts: string[] = [`status='COMPLETED'`, `completed_at=NOW()`];
      const vals: unknown[] = [];
      const named: Array<[string, unknown]> = [
        ["payment_method", parsed.data.paymentMethod],
        ["tax_rate", parsed.data.taxRate ?? null],
        ["customer_id", parsed.data.customerId ?? null],
        ["customer_name", parsed.data.customerName ?? null],
        ["customer_phone", parsed.data.customerPhone ?? null],
        ["customer_address", parsed.data.customerAddress ?? null]
      ];

      if (parsed.data.items && cols.has("items_json")) {
        named.push(["items_json", JSON.stringify(parsed.data.items)]);
      }

      if (parsed.data.amountGiven !== undefined && cols.has("amount_given")) {
        named.push(["amount_given", parsed.data.amountGiven]);
      }
      if (parsed.data.changeReturned !== undefined && cols.has("change_returned")) {
        named.push(["change_returned", parsed.data.changeReturned]);
      }

      for (const [col, val] of named) {
        if (!cols.has(col)) continue;
        vals.push(val);
        setParts.push(`${col}=$${vals.length}`);
      }

      vals.push(id);
      await client.query(`UPDATE orders SET ${setParts.join(", ")} WHERE id=$${vals.length}`, vals);

      if (parsed.data.paymentMethod === "KHATA" && parsed.data.customerId) {
        const sum = await client.query(`SELECT COALESCE(SUM(line_total),0) as total FROM order_items WHERE order_id=$1`, [id]);
        await client.query(`UPDATE customers SET khata_balance = COALESCE(khata_balance,0) + $1 WHERE id=$2`, [
          Number(sum.rows[0].total),
          parsed.data.customerId
        ]);
      }

      const result = await client.query(
        `SELECT 
          o.id,
          o.order_no as "orderNo",
          o.branch_id as "branchId",
          o.customer_id as "customerId",
          o.customer_name as "customerName",
          o.customer_phone as "customerPhone",
          o.customer_address as "customerAddress",
          o.channel,
          o.status,
          o.placed_by_staff_id as "placedByStaffId",
          o.placed_at as "placedAt",
          o.completed_at as "completedAt",
          o.notes,
          o.tax_rate as "taxRate",
          o.payment_method as "paymentMethod",
          ${cols.has("amount_given") ? `o.amount_given as "amountGiven",` : ""}
          ${cols.has("change_returned") ? `o.change_returned as "changeReturned",` : ""}
          ${cols.has("table_number") ? `o.table_number as "tableNumber",` : ""}
          COALESCE(agg.items, '[]'::json) as items
        FROM orders o
        LEFT JOIN (
          SELECT order_id,
            COALESCE(
              json_agg(
                json_build_object(
                  'menuItemId', menu_item_id,
                  'itemName', item_name_snapshot,
                  'unitPrice', unit_price_snapshot,
                  'quantity', quantity
                )
              ) FILTER (WHERE id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM order_items
          GROUP BY order_id
        ) agg ON agg.order_id = o.id
        WHERE o.id=$1`,
        [id]
      );
      await client.query("COMMIT");
      let order = result.rows[0] as Record<string, unknown>;
      const tnFallback = parseTableFromNotes(order.notes as string | undefined);
      order = {
        ...order,
        orderId: order.id,
        tableNumber: (order.tableNumber as string | undefined) ?? tnFallback
      };
      getIo().emit("order.status.changed", order);
      return res.json(order);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      console.error(err);
      throw err;
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to settle order"
    });
  }
});

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
      tableNumber: z.string().max(40).optional(),
      items: orderItemsSchema
    });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

    try {
      await ensureOrdersSchema();
      const client = await pool!.connect();
      try {
        await client.query("BEGIN");
        const cols = await getOrdersColumns(client);
        const current = await client.query(`SELECT id, status FROM orders WHERE id=$1`, [id]);
        if (!current.rows.length) {
          await client.query("ROLLBACK");
          return res.status(404).json({ message: "Order not found" });
        }
        if (current.rows[0].status !== "PENDING") {
          await client.query("ROLLBACK");
          return res.status(400).json({ message: "Only pending orders can be updated" });
        }

        const setParts: string[] = [];
        const vals: unknown[] = [];

        const addOptional = (col: string, bodyVal: unknown) => {
          if (!cols.has(col) || bodyVal === undefined) return;
          vals.push(bodyVal);
          setParts.push(`${col}=$${vals.length}`);
        };

        addOptional("channel", parsed.data.channel ?? undefined);
        addOptional("tax_rate", parsed.data.taxRate ?? undefined);
        addOptional("notes", parsed.data.notes ?? undefined);
        addOptional("items_json", JSON.stringify(parsed.data.items));
        addOptional(
          "table_number",
          parsed.data.tableNumber != null ? String(parsed.data.tableNumber).trim() || null : undefined
        );

        if (setParts.length) {
          vals.push(id);
          await client.query(`UPDATE orders SET ${setParts.join(", ")} WHERE id=$${vals.length}`, vals);
        }

        await client.query(`DELETE FROM order_items WHERE order_id=$1`, [id]);
        for (const item of parsed.data.items) {
          await insertOrderItemRow(client, id, item);
        }

        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.error(err);
        throw err;
      } finally {
        client.release();
      }

      const listRes = await pool!.query(
        `
        SELECT
          o.id,
          o.order_no AS "orderNo",
          o.channel,
          o.status,
          o.placed_at AS "placedAt",
          o.tax_rate AS "taxRate",
          o.notes,
          COALESCE(agg.items, '[]'::json) AS items
        FROM orders o
        LEFT JOIN (
          SELECT order_id,
            COALESCE(
              json_agg(
                json_build_object(
                  'menuItemId', menu_item_id,
                  'quantity', quantity,
                  'unitPrice', unit_price_snapshot,
                  'itemName', item_name_snapshot
                )
              ) FILTER (WHERE id IS NOT NULL),
              '[]'::json
            ) AS items
          FROM order_items
          GROUP BY order_id
        ) agg ON agg.order_id = o.id
        WHERE o.id=$1`,
        [id]
      );

      const colsAfter = await getOrdersColumns();
      let tableNum: string | undefined;
      if (colsAfter.has("table_number")) {
        const tnRow = await pool!.query(`SELECT table_number FROM orders WHERE id=$1`, [id]);
        tableNum = tnRow.rows[0]?.table_number ?? undefined;
      }

      const orderRow = listRes.rows[0];
      const merged = {
        ...orderRow,
        orderId: orderRow.id,
        tableNumber: tableNum || parseTableFromNotes(orderRow.notes as string | undefined)
      };
      getIo().emit("order.updated", merged);
      return res.json(merged);
    } catch (e: unknown) {
      console.error(e);
      return res.status(500).json({
        message: e instanceof Error ? e.message : "Failed to update order"
      });
    }
});

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

    const result = await pool!.query(
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
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to update order status"
    });
  }
});
