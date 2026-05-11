import fs from "fs";
import path from "path";
const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
export const store = {
    users: [
        { id: 1, fullName: "Master Admin", username: "admin", password: "123", role: "MASTER_ADMIN", branchId: 1, blocked: false, salaryMonthly: 80000 },
        { id: 2, fullName: "Cashier 1", username: "cashier", password: "123", role: "CASHIER", branchId: 1, blocked: false, salaryMonthly: 45000 },
        { id: 3, fullName: "Kitchen 1", username: "kitchen", password: "123", role: "KITCHEN", branchId: 1, blocked: false, salaryMonthly: 35000 }
    ],
    orders: new Map(),
    bills: new Map(),
    customers: new Map(),
    inventory: new Map(),
    riders: new Map(),
    receiptLogs: [],
    attendance: new Map(),
    salaryLogs: [],
    seq: {
        order: 1000,
        bill: 5000
    }
};
export function saveStore() {
    const data = {
        ...store,
        orders: Array.from(store.orders.entries()),
        bills: Array.from(store.bills.entries()),
        customers: Array.from(store.customers.entries()),
        inventory: Array.from(store.inventory.entries()),
        riders: Array.from(store.riders.entries()),
        attendance: Array.from(store.attendance.entries())
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}
export function loadStore() {
    if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, "utf-8");
        const data = JSON.parse(raw);
        store.users = data.users || store.users;
        store.orders = new Map(data.orders);
        store.bills = new Map(data.bills);
        store.customers = new Map(data.customers);
        store.inventory = new Map(data.inventory);
        store.riders = new Map(data.riders);
        store.receiptLogs = data.receiptLogs || [];
        store.attendance = new Map(data.attendance);
        store.salaryLogs = data.salaryLogs || [];
        store.seq = data.seq || store.seq;
    }
}
// Initial load
loadStore();
