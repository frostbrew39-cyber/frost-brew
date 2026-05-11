import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { store } from "../../repositories/memoryStore";
const receiptTypeSchema = z.enum(["KITCHEN", "CASH_COUNTER", "CUSTOMER", "DELIVERY"]);
export const receiptsRouter = Router();
receiptsRouter.post("/:orderId/print", requireAuth, async (req, res) => {
    const parsed = z.object({ type: receiptTypeSchema }).safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.flatten() });
    const orderId = Number(req.params.orderId);
    const staffId = req.user?.sub;
    let order;
    let bill = null;
    if (pool) {
        const orderResult = await pool.query("SELECT id, order_no, channel, status FROM orders WHERE id=$1", [orderId]);
        if (!orderResult.rows.length)
            return res.status(404).json({ message: "Order not found" });
        order = orderResult.rows[0];
        const billResult = await pool.query("SELECT * FROM bills WHERE order_id=$1", [orderId]);
        bill = billResult.rows[0] ?? null;
    }
    else {
        order = store.orders.get(orderId);
        if (!order)
            return res.status(404).json({ message: "Order not found" });
        bill = Array.from(store.bills.values()).find((b) => b.orderId === orderId) ?? null;
    }
    const payload = {
        receiptType: parsed.data.type,
        orderId,
        generatedAt: new Date().toISOString(),
        kitchenReceipt: parsed.data.type === "KITCHEN"
            ? {
                token: order.order_no ?? order.orderNo,
                qrValue: `FB:${orderId}`,
                items: "ITEMS_FROM_ORDER",
                showPrices: false
            }
            : undefined,
        cashCounterReceipt: parsed.data.type === "CASH_COUNTER"
            ? {
                subtotal: bill?.subtotal ?? 0,
                tax: bill?.tax_total ?? bill?.taxTotal ?? 0,
                total: bill?.grand_total ?? bill?.grandTotal ?? 0,
                paymentMethods: "SPLIT_SUPPORTED"
            }
            : undefined,
        customerReceipt: parsed.data.type === "CUSTOMER"
            ? {
                orderSummary: true,
                paymentDetails: true,
                loyaltyPoints: "INCLUDE",
                khataBalance: "INCLUDE_IF_APPLICABLE"
            }
            : undefined,
        deliveryReceipt: parsed.data.type === "DELIVERY"
            ? {
                customerAddress: "INCLUDE",
                contact: "INCLUDE",
                items: "INCLUDE",
                deliveryCharges: bill?.delivery_charges ?? bill?.deliveryCharges ?? 0
            }
            : undefined
    };
    if (pool) {
        await pool.query(`INSERT INTO receipt_print_logs (order_id, receipt_type, printed_by)
       VALUES ($1,$2,$3)`, [orderId, parsed.data.type, staffId ?? null]);
    }
    else {
        store.receiptLogs.push({
            orderId,
            receiptType: parsed.data.type,
            printedAt: new Date().toISOString(),
            printedBy: staffId
        });
    }
    return res.json(payload);
});
receiptsRouter.get("/reprint-log", requireAuth, async (_req, res) => {
    if (pool) {
        const result = await pool.query(`SELECT order_id as "orderId", receipt_type as "receiptType", printed_at as "printedAt", printed_by as "printedBy"
       FROM receipt_print_logs
       ORDER BY printed_at DESC
       LIMIT 200`);
        return res.json(result.rows);
    }
    return res.json(store.receiptLogs);
});
