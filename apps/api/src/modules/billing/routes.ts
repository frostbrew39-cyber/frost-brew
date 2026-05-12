import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { getIo } from "../../realtime/socket";

export const billingRouter = Router();

async function ensureBillingSchema() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bills (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      subtotal NUMERIC(12,2) NOT NULL,
      discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
      tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
      tip_total NUMERIC(12,2) NOT NULL DEFAULT 0,
      delivery_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
      grand_total NUMERIC(12,2) NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bill_payments (
      id BIGSERIAL PRIMARY KEY,
      bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
      method VARCHAR(30) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

billingRouter.post("/from-order/:orderId", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "CASHIER"), async (req, res) => {
  const orderId = Number(req.params.orderId);
  try {
    await ensureBillingSchema();
    const exists = await pool.query("SELECT id FROM bills WHERE order_id=$1", [orderId]);
    if (exists.rows.length) return res.status(400).json({ message: "Bill already exists" });
    const orderResult = await pool.query("SELECT channel FROM orders WHERE id=$1", [orderId]);
    if (!orderResult.rows.length) return res.status(404).json({ message: "Order not found" });
    const subtotalResult = await pool.query("SELECT COALESCE(SUM(line_total),0) AS subtotal FROM order_items WHERE order_id=$1", [orderId]);
    const subtotal = Number(subtotalResult.rows[0].subtotal);
    const taxTotal = Number((subtotal * 0.16).toFixed(2));
    const deliveryCharges = orderResult.rows[0].channel === "DELIVERY" ? 5 : 0;
    const grandTotal = subtotal + taxTotal + deliveryCharges;
    const bill = await pool.query(
      `INSERT INTO bills (order_id, subtotal, discount_total, tax_total, tip_total, delivery_charges, grand_total)
       VALUES ($1,$2,0,$3,0,$4,$5)
       RETURNING id, order_id as "orderId", subtotal, discount_total as "discountTotal", tax_total as "taxTotal",
                 tip_total as "tipTotal", delivery_charges as "deliveryCharges", grand_total as "grandTotal"`,
      [orderId, subtotal, taxTotal, deliveryCharges, grandTotal]
    );
    return res.status(201).json({ ...bill.rows[0], payments: [] });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to create bill" });
  }
});

billingRouter.post("/:id/payments", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "CASHIER"), async (req, res) => {
  const schema = z.object({
    method: z.enum(["CASH", "CARD", "MOBILE_WALLET", "KHATA"]),
    amount: z.number().positive(),
    customerId: z.number().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const billId = Number(req.params.id);
  try {
    await ensureBillingSchema();
    const billResult = await pool.query("SELECT id, order_id FROM bills WHERE id=$1", [billId]);
    if (!billResult.rows.length) return res.status(404).json({ message: "Bill not found" });
    await pool.query("INSERT INTO bill_payments (bill_id, method, amount) VALUES ($1,$2,$3)", [billId, parsed.data.method, parsed.data.amount]);
    if (parsed.data.method === "KHATA" && parsed.data.customerId) {
      await pool.query("UPDATE customers SET khata_balance = khata_balance + $1 WHERE id=$2", [parsed.data.amount, parsed.data.customerId]);
    }
    const rows = await pool.query(
      `SELECT b.id, b.order_id as "orderId", b.subtotal, b.discount_total as "discountTotal", b.tax_total as "taxTotal",
              b.tip_total as "tipTotal", b.delivery_charges as "deliveryCharges", b.grand_total as "grandTotal",
              COALESCE(json_agg(json_build_object('method', bp.method, 'amount', bp.amount)) FILTER (WHERE bp.id IS NOT NULL), '[]') as payments
       FROM bills b
       LEFT JOIN bill_payments bp ON bp.bill_id=b.id
       WHERE b.id=$1
       GROUP BY b.id`,
      [billId]
    );
    getIo().emit("bill.paid", rows.rows[0]);
    return res.json(rows.rows[0]);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to add payment" });
  }
});

