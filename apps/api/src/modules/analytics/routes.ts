import { Router } from "express";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";

export const analyticsRouter = Router();

analyticsRouter.get("/overview", requireAuth, async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    if (!pool) throw new Error("Database not configured");
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,4) DEFAULT 0`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`);

    const params: any[] = [startDate ?? null, endDate ?? null];
    const baseFilter = `
      ($1::date IS NULL OR DATE(o.placed_at) >= $1::date)
      AND ($2::date IS NULL OR DATE(o.placed_at) <= $2::date)
    `;

    const overview = await pool.query(
      `
      WITH order_totals AS (
        SELECT
          o.id,
          o.status,
          o.channel,
          o.tax_rate,
          o.placed_at,
          o.prep_started_at,
          o.ready_at,
          o.out_for_delivery_at,
          o.completed_at,
          COALESCE(SUM(oi.line_total), 0) AS subtotal
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE ${baseFilter}
        GROUP BY o.id
      )
      SELECT
        COUNT(*) FILTER (WHERE status <> 'CANCELLED') AS total_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_orders,
        COUNT(*) FILTER (WHERE status = 'CANCELLED' AND channel = 'DELIVERY' AND cancellation_reason = 'FAILED_DELIVERY') AS failed_deliveries,
        COALESCE(SUM(subtotal) FILTER (WHERE status <> 'CANCELLED'), 0) AS gross_sales,
        COALESCE(SUM(subtotal * COALESCE(tax_rate, 0)) FILTER (WHERE status <> 'CANCELLED'), 0) AS tax_collected,
        AVG(EXTRACT(EPOCH FROM (ready_at - prep_started_at)) / 60.0) FILTER (WHERE prep_started_at IS NOT NULL AND ready_at IS NOT NULL) AS avg_prep,
        AVG(EXTRACT(EPOCH FROM (completed_at - out_for_delivery_at)) / 60.0) FILTER (WHERE out_for_delivery_at IS NOT NULL AND completed_at IS NOT NULL) AS avg_delivery,
        AVG(EXTRACT(EPOCH FROM (completed_at - placed_at)) / 60.0) FILTER (WHERE completed_at IS NOT NULL) AS avg_completion
      FROM order_totals
      `
    , params);

    const daily = await pool.query(
      `
      WITH order_totals AS (
        SELECT
          DATE(o.placed_at) AS date,
          o.status,
          o.channel,
          o.tax_rate,
          o.cancellation_reason,
          COALESCE(SUM(oi.line_total), 0) AS subtotal
        FROM orders o
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE ${baseFilter}
        GROUP BY o.id, DATE(o.placed_at)
      )
      SELECT
        date::text AS date,
        COUNT(*) FILTER (WHERE status <> 'CANCELLED') AS "successfulOrders",
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS "cancelledOrders",
        COALESCE(SUM(subtotal) FILTER (WHERE status <> 'CANCELLED'), 0) AS revenue,
        COALESCE(SUM(subtotal * COALESCE(tax_rate, 0)) FILTER (WHERE status <> 'CANCELLED'), 0) AS "taxCollected"
      FROM order_totals
      GROUP BY date
      ORDER BY date ASC
      `
    , params);

    const row: any = overview.rows[0] || {};
    res.json({
      totalOrders: Number(row.total_orders || 0),
      cancelledOrders: Number(row.cancelled_orders || 0),
      failedDeliveries: Number(row.failed_deliveries || 0),
      grossSales: Number(row.gross_sales || 0),
      taxCollected: Number(row.tax_collected || 0),
      avgPrepTimeMinutes: Number(Number(row.avg_prep || 0).toFixed(2)),
      avgDeliveryTimeMinutes: Number(Number(row.avg_delivery || 0).toFixed(2)),
      avgCompletionTimeMinutes: Number(Number(row.avg_completion || 0).toFixed(2)),
      daily: daily.rows
    });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to fetch analytics" });
  }
});

