import { Router } from "express";
import { z } from "zod";
import { pool } from "../../db/pool";
import { allowRoles, requireAuth } from "../../middleware/auth";

/** Categories + menu_items (“products”) backed by Postgres. */
export const categoriesRouter = Router();
export const productsRouter = Router();

async function ensureCategoriesTable() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id BIGSERIAL PRIMARY KEY,
      branch_id BIGINT,
      name VARCHAR(120) NOT NULL,
      description TEXT,
      sort_order INT DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureMenuItemsExtras() {
  await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(120)`);
  await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category_id BIGINT`);
  await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description TEXT`);
  await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_url TEXT`);
  await pool.query(`ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
}

categoriesRouter.get("/", requireAuth, async (req, res) => {
  try {
    await ensureCategoriesTable();
    const user = (req as any).user as { branchId?: number };
    const rows = await pool!.query(
      `SELECT id, name, description, sort_order AS "sortOrder", is_active AS "isActive"
       FROM categories
       WHERE ($1::bigint IS NULL OR branch_id IS NULL OR branch_id = $1)
       ORDER BY sort_order ASC, id ASC`,
      [user.branchId ?? null]
    );
    return res.json(rows.rows);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to list categories" });
  }
});

categoriesRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.number().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  try {
    await ensureCategoriesTable();
    const user = (req as any).user as { branchId?: number };
    const r = await pool!.query(
      `INSERT INTO categories (branch_id, name, description, sort_order)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, description, sort_order AS "sortOrder", is_active AS "isActive"`,
      [user.branchId ?? null, parsed.data.name, parsed.data.description ?? null, parsed.data.sortOrder ?? 0]
    );
    return res.status(201).json(r.rows[0]);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to create category" });
  }
});

categoriesRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  try {
    await ensureCategoriesTable();
    const r = await pool!.query(
      `UPDATE categories SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         sort_order = COALESCE($3, sort_order),
         is_active = COALESCE($4, is_active)
       WHERE id=$5
       RETURNING id, name, description, sort_order AS "sortOrder", is_active AS "isActive"`,
      [parsed.data.name ?? null, parsed.data.description ?? null, parsed.data.sortOrder ?? null, parsed.data.isActive ?? null, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    return res.json(r.rows[0]);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to update category" });
  }
});

categoriesRouter.delete("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await ensureCategoriesTable();
    await pool!.query(`DELETE FROM categories WHERE id=$1`, [id]);
    return res.status(204).end();
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to delete category" });
  }
});

productsRouter.get("/", requireAuth, async (req, res) => {
  try {
    await ensureMenuItemsExtras();
    const user = (req as any).user as { branchId?: number };
    const r = await pool!.query(
      `SELECT id,
              name,
              price,
              tax_percent AS "taxPercent",
              category,
              COALESCE(description,'') AS description,
              COALESCE(image_url,'') AS image_url,
              is_active AS "isActive"
       FROM menu_items
       WHERE ($1::bigint IS NULL OR branch_id IS NULL OR branch_id = $1)
       ORDER BY id DESC`,
      [user.branchId ?? null]
    );
    const rows = r.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      taxPercent: row.taxPercent != null ? Number(row.taxPercent) : 0,
      category: row.category || "Other",
      description: row.description || "",
      img: row.image_url || "",
      isActive: row.isActive
    }));
    return res.json(rows);
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to list products" });
  }
});

productsRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    price: z.number(),
    category: z.string().optional(),
    taxPercent: z.number().optional(),
    description: z.string().optional(),
    img: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  try {
    await ensureMenuItemsExtras();
    const user = (req as any).user as { branchId?: number };
    const r = await pool!.query(
      `INSERT INTO menu_items (branch_id, name, price, tax_percent, category, description, image_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)
       RETURNING id, name, price, tax_percent, category, description, image_url, is_active`,
      [
        user.branchId ?? null,
        parsed.data.name,
        parsed.data.price,
        parsed.data.taxPercent ?? 0,
        parsed.data.category ?? "Other",
        parsed.data.description ?? null,
        parsed.data.img ?? null
      ]
    );
    const row = r.rows[0];
    return res.status(201).json({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      category: row.category,
      description: row.description || "",
      img: row.image_url || "",
      isActive: row.is_active
    });
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to create product" });
  }
});

productsRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "MANAGER"), async (req, res) => {
  const id = Number(req.params.id);
  const schema = z.object({
    name: z.string().optional(),
    price: z.number().optional(),
    category: z.string().nullable().optional(),
    taxPercent: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    img: z.string().nullable().optional(),
    isActive: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });
  try {
    await ensureMenuItemsExtras();
    const r = await pool!.query(
      `UPDATE menu_items SET
        name = COALESCE($1, name),
        price = COALESCE($2, price),
        category = COALESCE($3, category),
        tax_percent = COALESCE($4, tax_percent),
        description = COALESCE($5, description),
        image_url = COALESCE($6, image_url),
        is_active = COALESCE($7, is_active)
       WHERE id=$8
       RETURNING id, name, price, tax_percent, category, description, image_url, is_active`,
      [
        parsed.data.name ?? null,
        parsed.data.price ?? null,
        parsed.data.category ?? null,
        parsed.data.taxPercent ?? null,
        parsed.data.description ?? null,
        parsed.data.img ?? null,
        parsed.data.isActive ?? null,
        id
      ]
    );
    if (!r.rows.length) return res.status(404).json({ message: "Not found" });
    const row = r.rows[0];
    return res.json({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      taxPercent: Number(row.tax_percent),
      category: row.category,
      description: row.description || "",
      img: row.image_url || "",
      isActive: row.is_active
    });
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to update product" });
  }
});

productsRouter.delete("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const id = Number(req.params.id);
  try {
    await ensureMenuItemsExtras();
    await pool!.query(`UPDATE menu_items SET is_active=FALSE WHERE id=$1`, [id]);
    return res.status(204).end();
  } catch (e: unknown) {
    console.error(e);
    return res.status(500).json({ message: e instanceof Error ? e.message : "Failed to delete product" });
  }
});
