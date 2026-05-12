import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { pool } from "../../db/pool";
import { store, saveStore } from "../../repositories/memoryStore";

export const staffRouter = Router();

type StaffColumnInfo = { column_name: string; data_type: string; udt_name: string };
let cachedStaffColumns: StaffColumnInfo[] | null = null;
async function getStaffColumns(): Promise<StaffColumnInfo[]> {
  if (cachedStaffColumns) return cachedStaffColumns;
  const result = await pool.query<StaffColumnInfo>(
    `
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff'
    `
  );
  cachedStaffColumns = result.rows || [];
  return cachedStaffColumns;
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

staffRouter.get("/attendance", requireAuth, (req, res) => {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: "date required" });
  
  const result: Record<number, any> = {};
  for (const [key, value] of store.attendance.entries()) {
    if (key.startsWith(date + "_")) {
      const staffId = Number(key.split("_")[1]);
      result[staffId] = value;
    }
  }
  return res.json(result);
});

staffRouter.post("/attendance/check-in", requireAuth, (req, res) => {
  const { staffId, date } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  
  const key = `${date}_${staffId}`;
  const existing = store.attendance.get(key) || { status: 'Present' };
  
  store.attendance.set(key, {
    ...existing,
    checkIn: new Date().toISOString(),
    status: 'Present'
  });
  
  saveStore();
  return res.json({ success: true, data: store.attendance.get(key) });
});

staffRouter.post("/attendance/check-out", requireAuth, (req, res) => {
  const { staffId, date } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  
  const key = `${date}_${staffId}`;
  const existing = store.attendance.get(key);
  
  if (!existing) return res.status(404).json({ message: "No check-in found for today" });
  
  store.attendance.set(key, {
    ...existing,
    checkOut: new Date().toISOString()
  });
  
  saveStore();
  return res.json({ success: true, data: store.attendance.get(key) });
});


staffRouter.post("/attendance", requireAuth, (req, res) => {
  const { staffId, date, status } = req.body;
  if (!staffId || !date) return res.status(400).json({ message: "staffId and date required" });
  
  const key = `${date}_${staffId}`;
  if (!status) {
    store.attendance.delete(key);
  } else {
    const existing = store.attendance.get(key) || {};
    store.attendance.set(key, { ...existing, status });
  }
  saveStore();
  return res.json({ success: true });
});


staffRouter.put("/:id/block", requireAuth, allowRoles("MASTER_ADMIN"), async (req, res) => {
  const staff = store.users.find((u) => u.id === Number(req.params.id));
  if (!staff) return res.status(404).json({ message: "Not found" });
  staff.blocked = true;
  saveStore();
  return res.json({ success: true, staff });
});

staffRouter.get("/:id/salary", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), (req, res) => {
  const staffId = Number(req.params.id);
  const logs = store.salaryLogs.filter(l => l.staffId === staffId);
  res.json(logs);
});

staffRouter.post("/:id/salary", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), (req, res) => {
  const staffId = Number(req.params.id);
  const { date, type, amount, notes } = req.body;
  
  if (!date || !type || !amount) return res.status(400).json({ message: "Missing fields" });

  const newLog = {
    id: Date.now(),
    staffId,
    date,
    type,
    amount: Number(amount),
    notes: notes || ""
  };
  
  store.salaryLogs.push(newLog);

  // If they got a raise, automatically bump their base monthly salary in the DB
  if (type === 'RAISE') {
    const user = store.users.find(u => u.id === staffId);
    if (user) {
      user.salaryMonthly = (user.salaryMonthly || 0) + Number(amount);
    }
  }

  store.salaryLogs.push(newLog);
  saveStore();
  res.json({ success: true, log: newLog });
});

staffRouter.put("/:id/unblock", requireAuth, allowRoles("MASTER_ADMIN"), async (req, res) => {
  const staff = store.users.find((u) => u.id === Number(req.params.id));
  if (!staff) return res.status(404).json({ message: "Not found" });
  staff.blocked = false;
  saveStore();
  return res.json({ success: true, staff });
});

staffRouter.put("/:id", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
  const schema = z.object({
    fullName: z.string().optional(),
    username: z.string().optional(),
    role: z.string().optional(),
    password: z.string().optional(),
    permissions: z.array(z.string()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.flatten() });

  const staff = store.users.find((u) => u.id === Number(req.params.id));
  if (!staff) return res.status(404).json({ message: "Not found" });
  
  if (parsed.data.fullName) staff.fullName = parsed.data.fullName;
  if (parsed.data.username) staff.username = parsed.data.username;
  if (parsed.data.role) staff.role = parsed.data.role as any;
  if (parsed.data.password) staff.password = parsed.data.password;
  if (parsed.data.permissions !== undefined) staff.permissions = parsed.data.permissions;

  saveStore();
  return res.json({ success: true, staff });
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

