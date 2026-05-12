import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";

const receiptTypeSchema = z.enum(["KITCHEN", "CASH_COUNTER", "CUSTOMER", "DELIVERY"]);

export const receiptsRouter = Router();

async function ensureReceiptsSchema() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS receipt_print_logs (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      receipt_type VARCHAR(30) NOT NULL,
      printed_by BIGINT,
      printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

receiptsRouter.post("/:orderId/print", requireAuth, async (req, res) => {
  const parsed = z.object({ type: receiptTypeSchema }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  const orderId = Number(req.params.orderId);
  const staffId = (req as any).user?.sub as number | undefined;

  let order: any;
  let bill: any = null;

  try {
    await ensureReceiptsSchema();
    const orderResult = await pool.query("SELECT id, order_no, channel, status FROM orders WHERE id=$1", [orderId]);
    if (!orderResult.rows.length) return res.status(404).json({ message: "Order not found" });
    order = orderResult.rows[0];
    const billResult = await pool.query("SELECT * FROM bills WHERE order_id=$1", [orderId]);
    bill = billResult.rows[0] ?? null;
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to load receipt data" });
  }

  const payload = {
    receiptType: parsed.data.type,
    orderId,
    generatedAt: new Date().toISOString(),
    kitchenReceipt:
      parsed.data.type === "KITCHEN"
        ? {
            token: order.order_no ?? order.orderNo,
            qrValue: `FB:${orderId}`,
            items: "ITEMS_FROM_ORDER",
            showPrices: false
          }
        : undefined,
    cashCounterReceipt:
      parsed.data.type === "CASH_COUNTER"
        ? {
            subtotal: bill?.subtotal ?? 0,
            tax: bill?.tax_total ?? bill?.taxTotal ?? 0,
            total: bill?.grand_total ?? bill?.grandTotal ?? 0,
            paymentMethods: "SPLIT_SUPPORTED"
          }
        : undefined,
    customerReceipt:
      parsed.data.type === "CUSTOMER"
        ? {
            orderSummary: true,
            paymentDetails: true,
            loyaltyPoints: "INCLUDE",
            khataBalance: "INCLUDE_IF_APPLICABLE"
          }
        : undefined,
    deliveryReceipt:
      parsed.data.type === "DELIVERY"
        ? {
            customerAddress: "INCLUDE",
            contact: "INCLUDE",
            items: "INCLUDE",
            deliveryCharges: bill?.delivery_charges ?? bill?.deliveryCharges ?? 0
          }
        : undefined
  };

  try {
    await ensureReceiptsSchema();
    await pool.query(
      `INSERT INTO receipt_print_logs (order_id, receipt_type, printed_by)
       VALUES ($1,$2,$3)`,
      [orderId, parsed.data.type, staffId ?? null]
    );
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to log receipt print" });
  }

  return res.json(payload);
});

receiptsRouter.get("/reprint-log", requireAuth, async (_req, res) => {
  try {
    await ensureReceiptsSchema();
    const result = await pool.query(
      `SELECT order_id as "orderId", receipt_type as "receiptType", printed_at as "printedAt", printed_by as "printedBy"
       FROM receipt_print_logs
       ORDER BY printed_at DESC
       LIMIT 200`
    );
    return res.json(result.rows);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch reprint log" });
  }
});

