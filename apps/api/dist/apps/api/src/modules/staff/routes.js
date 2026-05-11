import { Router } from "express";
import { z } from "zod";
import { allowRoles, requireAuth } from "../../middleware/auth";
import { store, saveStore } from "../../repositories/memoryStore";
export const staffRouter = Router();
staffRouter.get("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (_req, res) => {
    return res.json(store.users);
});
staffRouter.get("/attendance", requireAuth, (req, res) => {
    const date = req.query.date;
    if (!date)
        return res.status(400).json({ message: "date required" });
    const result = {};
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
    if (!staffId || !date)
        return res.status(400).json({ message: "staffId and date required" });
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
    if (!staffId || !date)
        return res.status(400).json({ message: "staffId and date required" });
    const key = `${date}_${staffId}`;
    const existing = store.attendance.get(key);
    if (!existing)
        return res.status(404).json({ message: "No check-in found for today" });
    store.attendance.set(key, {
        ...existing,
        checkOut: new Date().toISOString()
    });
    saveStore();
    return res.json({ success: true, data: store.attendance.get(key) });
});
staffRouter.post("/attendance", requireAuth, (req, res) => {
    const { staffId, date, status } = req.body;
    if (!staffId || !date)
        return res.status(400).json({ message: "staffId and date required" });
    const key = `${date}_${staffId}`;
    if (!status) {
        store.attendance.delete(key);
    }
    else {
        const existing = store.attendance.get(key) || {};
        store.attendance.set(key, { ...existing, status });
    }
    saveStore();
    return res.json({ success: true });
});
staffRouter.put("/:id/block", requireAuth, allowRoles("MASTER_ADMIN"), async (req, res) => {
    const staff = store.users.find((u) => u.id === Number(req.params.id));
    if (!staff)
        return res.status(404).json({ message: "Not found" });
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
    if (!date || !type || !amount)
        return res.status(400).json({ message: "Missing fields" });
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
    if (!staff)
        return res.status(404).json({ message: "Not found" });
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
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.flatten() });
    const staff = store.users.find((u) => u.id === Number(req.params.id));
    if (!staff)
        return res.status(404).json({ message: "Not found" });
    if (parsed.data.fullName)
        staff.fullName = parsed.data.fullName;
    if (parsed.data.username)
        staff.username = parsed.data.username;
    if (parsed.data.role)
        staff.role = parsed.data.role;
    if (parsed.data.password)
        staff.password = parsed.data.password;
    if (parsed.data.permissions !== undefined)
        staff.permissions = parsed.data.permissions;
    saveStore();
    return res.json({ success: true, staff });
});
staffRouter.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN"), async (req, res) => {
    const schema = z.object({
        fullName: z.string(),
        username: z.string(),
        role: z.string(),
        password: z.string(),
        permissions: z.array(z.string()).optional()
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ message: parsed.error.flatten() });
    const nextId = store.users.reduce((m, u) => Math.max(m, u.id), 0) + 1;
    const newStaff = {
        id: nextId,
        fullName: parsed.data.fullName,
        username: parsed.data.username,
        role: parsed.data.role,
        branchId: 1,
        blocked: false,
        password: parsed.data.password,
        permissions: parsed.data.permissions,
        salaryMonthly: 45000
    };
    store.users.push(newStaff);
    saveStore();
    return res.json({ success: true, staff: newStaff });
});
