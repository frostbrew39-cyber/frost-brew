import { Router } from "express";
import { pool } from "../../db/pool";
import { requireAuth } from "../../middleware/auth";

export const tablesRouter = Router();

function tableFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = String(notes).match(/TABLE:(T\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

async function ensureTableSupport() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(40)`);
}

/** Active table layout for cashier dashboard (T1–T12 + open PENDING / in-progress orders). */
tablesRouter.get("/", requireAuth, async (req, res) => {
  try {
    await ensureTableSupport();
    const user = (req as any).user as { branchId?: number };
    const branchId = user.branchId ?? null;

    const open = await pool.query(
      `
      SELECT id, order_no AS "orderNo", status, channel, table_number AS "tableNumber", notes
      FROM orders
      WHERE status != 'COMPLETED'
        AND ($1::bigint IS NULL OR branch_id = $1)
      ORDER BY id DESC
      `,
      [branchId]
    );

    const byTable: Record<
      string,
      { orderId: number; orderNo: string; status: string }
    > = {};
    for (const row of open.rows as any[]) {
      const tid = (row.tableNumber && String(row.tableNumber).trim().toUpperCase()) || tableFromNotes(row.notes);
      if (!tid) continue;
      if (!byTable[tid]) {
        byTable[tid] = {
          orderId: Number(row.id),
          orderNo: String(row.orderNo || `FB-${row.id}`),
          status: String(row.status)
        };
      }
    }

    const tableIds = Array.from({ length: 12 }, (_, i) => `T${i + 1}`);
    const tables = tableIds.map((tableId) => {
      const tableNum = tableId.replace(/^T/i, "");
      // Find any order where the table number (stripped of T) matches
      const hit = Object.entries(byTable).find(([tid]) => tid.replace(/^T/i, "") === tableNum)?.[1];
      
      return {
        tableId,
        occupied: Boolean(hit),
        orderId: hit?.orderId,
        orderNo: hit?.orderNo,
        status: hit?.status
      };
    });

    return res.json({ tables, openOrders: open.rows });
  } catch (e: unknown) {
    console.error("[GET /tables]", e);
    return res.status(500).json({
      message: e instanceof Error ? e.message : "Failed to load tables"
    });
  }
});
