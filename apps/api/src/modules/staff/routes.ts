import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";

export const staffRouter = Router();

type StaffColumnInfo = { column_name: string; data_type: string; udt_name: string };
let cachedStaffColumns: StaffColumnInfo[] | null = null;
async function ensureStaffSchema() {
  if (!pool) throw new Error("Database not configured");
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS username VARCHAR(120)`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS password VARCHAR(255)`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS permissions JSONB`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary_monthly NUMERIC(12,2)`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS join_date DATE`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE`);
  await pool.query(`ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id BIGSERIAL PRIMARY KEY,
      staff_id BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'Present',
      check_in TIMESTAMPTZ,
      check_out TIMESTAMPTZ,
      UNIQUE(staff_id, date)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS staff_salary_logs (
      id BIGSERIAL PRIMARY KEY,
      staff_id BIGINT NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      type VARCHAR(30) NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      notes TEXT
    )
  `);
}

async function getStaffColumns(): Promise<StaffColumnInfo[]> {
  await ensureStaffSchema();
  if (cachedStaffColumns) return cachedStaffColumns;
  const result = await pool.query(
    `
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff'
    `
  );
  cachedStaffColumns = (result.rows || []) as StaffColumnInfo[];
  return cachedStaffColumns || [];
}

staffRouter.get("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (_req, res) => {
  try {
    const cols = await getStaffColumns();
    const hasPermissions = cols.some((c) => c.column_name === "permissions");
    const permissionsCol = cols.find((c) => c.column_name === "permissions");
    const hasJoinDate = cols.some((c) => c.column_name === "join_date");

    const selectPermissions =
      hasPermissions && permissionsCol?.udt_name === "jsonb"
        ? `, permissions`
        : hasPermissions
          ? `, permissions`
          : ``;

    const selectJoinDate = hasJoinDate ? `, join_date` : ``;

    const result = await pool.query(
      `
      SELECT
        id,
        full_name,
        username,
        role,
        branch_id,
        is_blocked,
        is_active,
        salary_monthly
        ${selectJoinDate}
        ${selectPermissions}
      FROM staff
      ORDER BY id ASC
      `
    );

    return res.json(
      (result.rows || []).map((r: any) => ({
        id: Number(r.id),
        fullName: r.full_name,
        username: r.username,
        role: r.role,
        branchId: r.branch_id == null ? undefined : Number(r.branch_id),
        blocked: Boolean(r.is_blocked),
        isActive: r.is_active == null ? undefined : Boolean(r.is_active),
        salaryMonthly: r.salary_monthly == null ? undefined : Number(r.salary_monthly),
        joinDate: r.join_date ? String(r.join_date).slice(0, 10) : undefined,
        permissions: r.permissions ?? undefined
      }))
    );
  } catch (e: any) {
    return res.status(500).json({ message: "Failed to fetch staff" });
  }
});

staffRouter.get("/attendance", requireAuth, async (req, res) => {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: "date required" });
  try {
    await ensureStaffSchema();
    const rows = await pool.query(
      `SELECT staff_id as "staffId", status, check_in as "checkIn", check_out as "checkOut"
       FROM staff_attendance
       WHERE date = $1`,
      [date]
    );
    const result: Record<number, any> = {};
    for (const row of rows.rows) {
      result[Number(row.staffId)] = { status: row.status, checkIn: row.checkIn, checkOut: row.checkOut };
    }
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to fetch attendance" });
  }
});

staffRouter.post("/attendance/check-in", requireAuth, async (req, res) => {
  const { staffId, date } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  try {
    await ensureStaffSchema();
    const updated = await pool.query(
      `INSERT INTO staff_attendance (staff_id, date, status, check_in)
       VALUES ($1, $2, 'Present', NOW())
       ON CONFLICT (staff_id, date)
       DO UPDATE SET status='Present', check_in=NOW()
       RETURNING status, check_in as "checkIn", check_out as "checkOut"`,
      [staffId, date]
    );
    return res.json({ success: true, data: updated.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to check in" });
  }
});

staffRouter.post("/attendance/check-out", requireAuth, async (req, res) => {
  const { staffId, date } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  try {
    await ensureStaffSchema();
    const updated = await pool.query(
      `UPDATE staff_attendance
       SET check_out = NOW()
       WHERE staff_id = $1 AND date = $2
       RETURNING status, check_in as "checkIn", check_out as "checkOut"`,
      [staffId, date]
    );
    if (!updated.rows.length) return res.status(404).json({ message: "No check-in found for today" });
    return res.json({ success: true, data: updated.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to check out" });
  }
});


staffRouter.post("/attendance", requireAuth, async (req, res) => {
  const { staffId, date, status } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  try {
    await ensureStaffSchema();
    if (!status) {
      await pool.query(`DELETE FROM staff_attendance WHERE staff_id=$1 AND date=$2`, [staffId, date]);
    } else {
      await pool.query(
        `INSERT INTO staff_attendance (staff_id, date, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (staff_id, date)
         DO UPDATE SET status = EXCLUDED.status`,
        [staffId, date, status]
      );
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to update attendance" });
  }
});


staffRouter.put("/:id/block", requireAuth, allowRoles("MASTER_ADMIN"), async (req, res) => {
  try {
    await ensureStaffSchema();
    const result = await pool.query(`UPDATE staff SET is_blocked = TRUE WHERE id=$1 RETURNING id`, [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to block staff" });
  }
});

staffRouter.get("/:id/salary", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const staffId = Number(req.params.id);
  try {
    await ensureStaffSchema();
    const logs = await pool.query(
      `SELECT id, staff_id as "staffId", date, type, amount, COALESCE(notes,'') as notes
       FROM staff_salary_logs
       WHERE staff_id=$1
       ORDER BY date ASC, id ASC`,
      [staffId]
    );
    res.json(logs.rows);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to fetch salary logs" });
  }
});

staffRouter.post("/:id/salary", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const staffId = Number(req.params.id);
  const { date, type, amount, notes } = req.body;
  
  if (!date || !type || !amount) return res.status(400).json({ message: "Missing fields" });
  try {
    await ensureStaffSchema();
    const newLogResult = await pool.query(
      `INSERT INTO staff_salary_logs (staff_id, date, type, amount, notes)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, staff_id as "staffId", date, type, amount, COALESCE(notes,'') as notes`,
      [staffId, date, type, Number(amount), notes || null]
    );

    if (type === "RAISE") {
      await pool.query(
        `UPDATE staff
         SET salary_monthly = COALESCE(salary_monthly, 0) + $1
         WHERE id = $2`,
        [Number(amount), staffId]
      );
    }

    res.json({ success: true, log: newLogResult.rows[0] });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || "Failed to log salary" });
  }
});

staffRouter.put("/:id/unblock", requireAuth, allowRoles("MASTER_ADMIN"), async (req, res) => {
  try {
    await ensureStaffSchema();
    const result = await pool.query(`UPDATE staff SET is_blocked = FALSE WHERE id=$1 RETURNING id`, [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || "Failed to unblock staff" });
  }
});

staffRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const schema = z.object({
    fullName: z.string().optional(),
    username: z.string().optional(),
    role: z.string().optional(),
    password: z.string().optional(),
    permissions: z.array(z.string()).optional(),
    salaryMonthly: z.union([z.string(), z.number()]).optional(),
    joinDate: z.string().optional(),
    blocked: z.boolean().optional(),
    isActive: z.boolean().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const cols = await getStaffColumns();
    const colSet = new Set(cols.map((c) => c.column_name));
    const permissionsCol = cols.find((c) => c.column_name === "permissions");

    const setSql: string[] = [];
    const values: any[] = [];
    const push = (fragment: string, value: any) => {
      values.push(value);
      setSql.push(fragment.replace(/\$X/g, `$${values.length}`));
    };

    if (parsed.data.fullName !== undefined && colSet.has("full_name")) push(`full_name = $X`, parsed.data.fullName);
    if (parsed.data.username !== undefined && colSet.has("username")) push(`username = $X`, parsed.data.username);
    if (parsed.data.role !== undefined && colSet.has("role")) push(`role = $X`, parsed.data.role);
    if (parsed.data.password !== undefined && colSet.has("password")) push(`password = $X`, parsed.data.password);

    if (parsed.data.salaryMonthly !== undefined && colSet.has("salary_monthly")) {
      const v = parsed.data.salaryMonthly === "" ? null : Number(parsed.data.salaryMonthly);
      push(`salary_monthly = $X`, v);
    }

    if (parsed.data.joinDate !== undefined && colSet.has("join_date")) push(`join_date = $X`, parsed.data.joinDate);

    if (parsed.data.blocked !== undefined && colSet.has("is_blocked")) push(`is_blocked = $X`, parsed.data.blocked);
    if (parsed.data.isActive !== undefined && colSet.has("is_active")) push(`is_active = $X`, parsed.data.isActive);

    if (parsed.data.permissions !== undefined && colSet.has("permissions")) {
      const perms = parsed.data.permissions ?? null;
      if (permissionsCol?.udt_name === "jsonb") {
        values.push(perms == null ? null : JSON.stringify(perms));
        setSql.push(`permissions = $${values.length}::jsonb`);
      } else if (permissionsCol?.udt_name === "_text" || permissionsCol?.data_type === "ARRAY") {
        values.push(perms);
        setSql.push(`permissions = $${values.length}::text[]`);
      } else {
        values.push(perms == null ? null : JSON.stringify(perms));
        setSql.push(`permissions = $${values.length}`);
      }
    }

    if (setSql.length === 0) return res.status(400).json({ message: "No valid fields to update" });

    values.push(id);
    const hasJoinDate = colSet.has("join_date");
    const hasPermissions = colSet.has("permissions");

    const result = await pool.query(
      `
      UPDATE staff
      SET ${setSql.join(", ")}
      WHERE id = $${values.length}
      RETURNING
        id,
        full_name,
        username,
        role,
        branch_id,
        is_blocked,
        is_active,
        salary_monthly
        ${hasJoinDate ? ", join_date" : ""}
        ${hasPermissions ? ", permissions" : ""}
      `,
      values
    );

    const row: any = result.rows?.[0];
    if (!row) return res.status(404).json({ message: "Not found" });

    return res.json({
      success: true,
      staff: {
        id: Number(row.id),
        fullName: row.full_name,
        username: row.username,
        role: row.role,
        branchId: row.branch_id == null ? undefined : Number(row.branch_id),
        blocked: Boolean(row.is_blocked),
        isActive: row.is_active == null ? undefined : Boolean(row.is_active),
        salaryMonthly: row.salary_monthly == null ? undefined : Number(row.salary_monthly),
        joinDate: row.join_date ? String(row.join_date).slice(0, 10) : undefined,
        permissions: row.permissions ?? undefined
      }
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Failed to update staff";
    return res.status(500).json({ message: msg });
  }
});

staffRouter.delete("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const cols = await getStaffColumns();
    const colSet = new Set(cols.map((c) => c.column_name));

    // Prefer soft-delete if the schema supports it
    if (colSet.has("is_active")) {
      const result = await pool.query(
        `
        UPDATE staff
        SET is_active = FALSE
        WHERE id = $1
        RETURNING id
        `,
        [id]
      );
      if (!result.rows?.[0]) return res.status(404).json({ message: "Not found" });
      return res.json({ success: true });
    }

    const result = await pool.query(
      `
      DELETE FROM staff
      WHERE id = $1
      RETURNING id
      `,
      [id]
    );

    if (!result.rows?.[0]) return res.status(404).json({ message: "Not found" });
    return res.json({ success: true });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Failed to delete staff";
    return res.status(500).json({ message: msg });
  }
});

staffRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const schema = z.object({
    fullName: z.string(),
    username: z.string(),
    role: z.string(),
    password: z.string(),
    permissions: z.array(z.string()).optional(),
    salaryMonthly: z.union([z.string(), z.number()]).optional(),
    joinDate: z.string().optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  try {
    const user = (req as any).user;
    const branchId = user?.branchId ?? 1;

    const cols = await getStaffColumns();
    const hasPermissions = cols.some((c) => c.column_name === "permissions");
    const permissionsCol = cols.find((c) => c.column_name === "permissions");
    const hasJoinDate = cols.some((c) => c.column_name === "join_date");
    const hasSalaryMonthly = cols.some((c) => c.column_name === "salary_monthly");
    const hasIsActive = cols.some((c) => c.column_name === "is_active");
    const hasIsBlocked = cols.some((c) => c.column_name === "is_blocked");

    const joinDateValue = parsed.data.joinDate || new Date().toISOString().slice(0, 10);
    const salaryValue =
      parsed.data.salaryMonthly == null || parsed.data.salaryMonthly === ""
        ? null
        : Number(parsed.data.salaryMonthly);

    const insertCols: string[] = ["full_name", "username", "password", "role", "branch_id"];
    const values: any[] = [parsed.data.fullName, parsed.data.username, parsed.data.password, parsed.data.role, branchId];
    const placeholders: string[] = values.map((_, i) => `$${i + 1}`);

    if (hasIsBlocked) {
      insertCols.push("is_blocked");
      values.push(false);
      placeholders.push(`$${values.length}`);
    }
    if (hasIsActive) {
      insertCols.push("is_active");
      values.push(true);
      placeholders.push(`$${values.length}`);
    }
    if (hasSalaryMonthly) {
      insertCols.push("salary_monthly");
      values.push(salaryValue);
      placeholders.push(`$${values.length}`);
    }
    if (hasJoinDate) {
      insertCols.push("join_date");
      values.push(joinDateValue);
      placeholders.push(`$${values.length}`);
    }

    if (hasPermissions) {
      insertCols.push("permissions");
      const perms = parsed.data.permissions ?? null;

      if (permissionsCol?.udt_name === "jsonb") {
        values.push(perms == null ? null : JSON.stringify(perms));
        placeholders.push(`$${values.length}::jsonb`);
      } else if (permissionsCol?.udt_name === "_text" || permissionsCol?.data_type === "ARRAY") {
        values.push(perms);
        placeholders.push(`$${values.length}::text[]`);
      } else {
        // Fallback: store as JSON string in a text/varchar column if that's what the DB uses
        values.push(perms == null ? null : JSON.stringify(perms));
        placeholders.push(`$${values.length}`);
      }
    }

    const result = await pool.query(
      `
      INSERT INTO staff (${insertCols.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING
        id,
        full_name,
        username,
        role,
        branch_id,
        is_blocked,
        is_active,
        salary_monthly
        ${hasJoinDate ? ", join_date" : ""}
        ${hasPermissions ? ", permissions" : ""}
      `,
      values
    );

    const row: any = result.rows?.[0];
    if (!row) return res.status(500).json({ success: false, message: "Failed to create staff" });

    return res.json({
      success: true,
      staff: {
        id: Number(row.id),
        fullName: row.full_name,
        username: row.username,
        role: row.role,
        branchId: row.branch_id == null ? undefined : Number(row.branch_id),
        blocked: Boolean(row.is_blocked),
        isActive: row.is_active == null ? undefined : Boolean(row.is_active),
        salaryMonthly: row.salary_monthly == null ? undefined : Number(row.salary_monthly),
        joinDate: row.join_date ? String(row.join_date).slice(0, 10) : undefined,
        permissions: row.permissions ?? undefined
      }
    });
  } catch (e: any) {
    const msg = typeof e?.message === "string" ? e.message : "Failed to add staff";
    return res.status(500).json({ success: false, message: msg });
  }
});

