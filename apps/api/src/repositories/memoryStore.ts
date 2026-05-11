import type { CreateOrderInput, OrderStatus, PaymentMethod, StaffRole } from "../../../../packages/shared-types/src";

export type StaffUser = {
  id: number;
  fullName: string;
  role: StaffRole;
  branchId: number;
  blocked: boolean;
  salaryMonthly?: number;
};

export type SalaryLog = {
  id: number;
  staffId: number;
  date: string;
  type: 'PAYMENT' | 'RAISE' | 'DEDUCTION' | 'ADVANCE';
  amount: number;
  notes: string;
};

export type Order = {
  id: number;
  orderNo: string;
  branchId: number;
  customerId?: number;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  channel: CreateOrderInput["channel"];
  status: OrderStatus;
  placedByStaffId: number;
  placedByStaffName?: string;
  placedAt: string;
  prepStartedAt?: string;
  readyAt?: string;
  outForDeliveryAt?: string;
  completedAt?: string;
  notes?: string;
  cancellationReason?: string;
  taxRate?: number;
  paymentMethod?: string;
  items: CreateOrderInput["items"];
};

export type Bill = {
  id: number;
  orderId: number;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  tipTotal: number;
  deliveryCharges: number;
  grandTotal: number;
  payments: Array<{ method: PaymentMethod; amount: number }>;
};

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
    { id: 3, fullName: "Kitchen 1", username: "kitchen", password: "123", role: "KITCHEN", branchId: 1, blocked: false, salaryMonthly: 35000 },
    {
      id: 4,
      fullName: "Waiter 1",
      username: "waiter",
      password: "123",
      role: "WAITER",
      branchId: 1,
      blocked: false,
      salaryMonthly: 40000,
      permissions: ["tables", "pos", "orders"]
    }
  ] as any[],
  orders: new Map<number, Order>(),
  bills: new Map<number, Bill>(),
  customers: new Map<number, { id: number; fullName: string; phone: string; address: string; loyaltyPoints: number; khataBalance: number }>(),
  inventory: new Map<number, { id: number; name: string; category: string; unit: string; currentStock: number; alertAt: number; purchasePrice: number }>(),
  riders: new Map<number, { id: number; name: string; phone: string; payRate: number; type: string; deliveriesDone: number; isActive: boolean }>(),
  receiptLogs: [] as Array<{ orderId: number; receiptType: "KITCHEN" | "CASH_COUNTER" | "CUSTOMER" | "DELIVERY"; printedAt: string; printedBy?: number }>,
  attendance: new Map<string, { checkIn?: string, checkOut?: string, status: string }>(),
  salaryLogs: [] as Array<SalaryLog>,
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


