import { Router } from "express";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";

export const inventoryRouter = Router();

async function ensureInventoryTable() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id BIGSERIAL PRIMARY KEY,
      branch_id BIGINT,
      name VARCHAR(160) NOT NULL,
      category VARCHAR(120),
      unit VARCHAR(30),
      current_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
      alert_at NUMERIC(12,2) NOT NULL DEFAULT 0,
      purchase_price NUMERIC(12,2),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

inventoryRouter.get("/", requireAuth, async (req, res) => {
  try {
    await ensureInventoryTable();
    const user = (req as any).user as { branchId?: number };
    const result = await pool!.query(
      `
      SELECT
        id,
        name,
        category,
        unit,
        current_stock as "currentStock",
        alert_at as "alertAt",
        purchase_price as "purchasePrice"
      FROM inventory_items
      WHERE is_active = TRUE
        AND ($1::bigint IS NULL OR branch_id = $1)
      ORDER BY id DESC
      `,
      [user?.branchId ?? null]
    );
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to fetch inventory" });
  }
});

inventoryRouter.get("/low-stock", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    await ensureInventoryTable();
    const user = (req as any).user as { branchId?: number };
    const result = await pool!.query(
      `
      SELECT
        id,
        name,
        category,
        unit,
        current_stock as "currentStock",
        alert_at as "alertAt",
        purchase_price as "purchasePrice"
      FROM inventory_items
      WHERE is_active = TRUE
        AND current_stock <= alert_at
        AND ($1::bigint IS NULL OR branch_id = $1)
      ORDER BY id DESC
      `,
      [user?.branchId ?? null]
    );
    res.json(result.rows);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to fetch low stock items" });
  }
});

inventoryRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  try {
    await ensureInventoryTable();
    const user = (req as any).user as { branchId?: number };
    const { name, category, unit, alertAt, purchasePrice, currentStock } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const created = await pool!.query(
      `
      INSERT INTO inventory_items (branch_id, name, category, unit, current_stock, alert_at, purchase_price, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
      RETURNING
        id,
        name,
        category,
        unit,
        current_stock as "currentStock",
        alert_at as "alertAt",
        purchase_price as "purchasePrice"
      `,
      [
        user?.branchId ?? null,
        name,
        category ?? null,
        unit ?? null,
        Number(currentStock ?? 0),
        Number(alertAt ?? 0),
        purchasePrice == null || purchasePrice === "" ? null : Number(purchasePrice)
      ]
    );
    res.status(201).json(created.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to create inventory item" });
  }
});

inventoryRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  try {
    await ensureInventoryTable();
    const id = Number(req.params.id);
    const { name, category, unit, alertAt, purchasePrice, currentStock } = req.body;

    const updated = await pool!.query(
      `
      UPDATE inventory_items
      SET
        name = COALESCE($1, name),
        category = COALESCE($2, category),
        unit = COALESCE($3, unit),
        alert_at = COALESCE($4, alert_at),
        purchase_price = COALESCE($5, purchase_price),
        current_stock = COALESCE($6, current_stock)
      WHERE id = $7
      RETURNING
        id,
        name,
        category,
        unit,
        current_stock as "currentStock",
        alert_at as "alertAt",
        purchase_price as "purchasePrice"
      `,
      [
        name ?? null,
        category ?? null,
        unit ?? null,
        alertAt == null ? null : Number(alertAt),
        purchasePrice == null || purchasePrice === "" ? null : Number(purchasePrice),
        currentStock == null ? null : Number(currentStock),
        id
      ]
    );
    if (!updated.rows.length) return res.status(404).json({ message: "Item not found" });
    res.json(updated.rows[0]);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to update inventory item" });
  }
});

inventoryRouter.delete("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    await ensureInventoryTable();
    const id = Number(req.params.id);
    const deleted = await pool!.query(`UPDATE inventory_items SET is_active = FALSE WHERE id = $1 RETURNING id`, [id]);
    if (!deleted.rows.length) return res.status(404).json({ message: "Item not found" });
    res.status(204).end();
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to delete inventory item" });
  }
});

