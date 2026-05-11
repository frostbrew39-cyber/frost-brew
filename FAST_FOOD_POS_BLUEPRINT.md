# Fast Food Restaurant POS (Online + Offline PWA)

## 1) System Architecture

- **Frontend (PWA):** React + Vite (or Next.js App Router), IndexedDB (Dexie) for offline queue/cache, Service Worker for offline assets/API fallback.
- **Backend:** Node.js + Express + Socket.IO (KDS and order status events).
- **Database:** PostgreSQL with normalized schema + audit trails.
- **Auth:** JWT access + refresh tokens; RBAC with Master Admin override.
- **Sync:** Offline-first command queue (`pending_sync_events`) with conflict strategy: server wins for stock counts, latest timestamp wins for non-critical profile fields.
- **Integrations:** Delivery platforms via adapter layer (`delivery_partner_integrations` + background workers).

---

## 2) Database Schema (Tables + Relations)

```sql
-- ===============================
-- ENUMS
-- ===============================
CREATE TYPE order_channel AS ENUM ('COUNTER', 'DINE_IN', 'TAKEAWAY', 'DELIVERY');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'MOBILE_WALLET', 'KHATA');
CREATE TYPE payment_status AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'REFUNDED');
CREATE TYPE stock_txn_type AS ENUM ('PURCHASE', 'USAGE', 'WASTAGE', 'ADJUSTMENT', 'RETURN');
CREATE TYPE staff_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN');
CREATE TYPE attendance_status AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'LEAVE');

-- ===============================
-- MULTI-BRANCH
-- ===============================
CREATE TABLE branches (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  address TEXT,
  phone VARCHAR(30),
  timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Karachi',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- AUTH + STAFF + RBAC
-- ===============================
CREATE TABLE staff (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE,
  role staff_role NOT NULL,
  salary_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  join_date DATE NOT NULL,
  shift_start TIME,
  shift_end TIME,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users_auth (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT UNIQUE NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  refresh_token_hash TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(80) UNIQUE NOT NULL, -- e.g. BILLING_CREATE, INVENTORY_EDIT
  description TEXT
);

CREATE TABLE role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role staff_role NOT NULL,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role, permission_id)
);

CREATE TABLE activity_logs (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  staff_id BIGINT REFERENCES staff(id),
  entity_type VARCHAR(60) NOT NULL, -- ORDER, BILL, INVENTORY, STAFF
  entity_id BIGINT,
  action VARCHAR(80) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- CUSTOMER + LOYALTY + KHATA
-- ===============================
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  full_name VARCHAR(120),
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(120),
  loyalty_points INT NOT NULL DEFAULT 0,
  khata_balance NUMERIC(12,2) NOT NULL DEFAULT 0, -- outstanding
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, phone)
);

CREATE TABLE customer_addresses (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(50), -- Home/Office
  address_line TEXT NOT NULL,
  zone_id BIGINT,
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE khata_ledger (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  order_id BIGINT,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  note TEXT,
  created_by BIGINT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- MENU + COMBOS + MODIFIERS + RECIPES
-- ===============================
CREATE TABLE menu_categories (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  category_id BIGINT REFERENCES menu_categories(id),
  sku VARCHAR(40),
  name VARCHAR(120) NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_combo BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE combo_items (
  id BIGSERIAL PRIMARY KEY,
  combo_menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  child_menu_item_id BIGINT NOT NULL REFERENCES menu_items(id),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1
);

CREATE TABLE modifier_groups (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(80) NOT NULL,
  min_select INT NOT NULL DEFAULT 0,
  max_select INT NOT NULL DEFAULT 1
);

CREATE TABLE modifiers (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  name VARCHAR(80) NOT NULL,
  extra_price NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE menu_item_modifier_groups (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  modifier_group_id BIGINT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE,
  UNIQUE(menu_item_id, modifier_group_id)
);

CREATE TABLE ingredients (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(120) NOT NULL,
  unit VARCHAR(20) NOT NULL, -- g, ml, pcs, kg
  current_stock NUMERIC(14,3) NOT NULL DEFAULT 0,
  reorder_level NUMERIC(14,3) NOT NULL DEFAULT 0,
  avg_cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0
);

CREATE TABLE menu_item_recipes (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id),
  quantity_required NUMERIC(14,3) NOT NULL,
  UNIQUE(menu_item_id, ingredient_id)
);

CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(120) NOT NULL,
  contact_name VARCHAR(120),
  phone VARCHAR(30),
  email VARCHAR(120),
  address TEXT
);

CREATE TABLE stock_transactions (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  ingredient_id BIGINT NOT NULL REFERENCES ingredients(id),
  supplier_id BIGINT REFERENCES suppliers(id),
  type stock_txn_type NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  unit_cost NUMERIC(12,4) DEFAULT 0,
  note TEXT,
  ref_order_id BIGINT,
  created_by BIGINT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- ORDERS + BILLING + RECEIPTS + TIMER
-- ===============================
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  order_no VARCHAR(40) NOT NULL, -- human readable token
  customer_id BIGINT REFERENCES customers(id),
  channel order_channel NOT NULL,
  status order_status NOT NULL DEFAULT 'PENDING',
  table_no VARCHAR(20),
  rider_id BIGINT,
  delivery_address_id BIGINT REFERENCES customer_addresses(id),
  zone_id BIGINT,
  placed_by_staff_id BIGINT REFERENCES staff(id),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  prep_started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(branch_id, order_no)
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id BIGINT NOT NULL REFERENCES menu_items(id),
  item_name_snapshot VARCHAR(120) NOT NULL,
  unit_price_snapshot NUMERIC(12,2) NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  line_total NUMERIC(12,2) NOT NULL,
  special_instructions TEXT
);

CREATE TABLE order_item_modifiers (
  id BIGSERIAL PRIMARY KEY,
  order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  modifier_name_snapshot VARCHAR(80) NOT NULL,
  extra_price_snapshot NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE bills (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  subtotal NUMERIC(12,2) NOT NULL,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'UNPAID',
  generated_by BIGINT REFERENCES staff(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bill_payments (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  txn_ref VARCHAR(80),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by BIGINT REFERENCES staff(id)
);

CREATE TABLE discounts (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  code VARCHAR(40),
  title VARCHAR(120),
  type VARCHAR(20) NOT NULL, -- FIXED/PERCENT
  value NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE bill_discounts (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  discount_id BIGINT REFERENCES discounts(id),
  amount NUMERIC(12,2) NOT NULL
);

-- receipts metadata for reprint history
CREATE TABLE receipt_print_logs (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  receipt_type VARCHAR(30) NOT NULL, -- KITCHEN/CASH_COUNTER/CUSTOMER/DELIVERY
  printed_by BIGINT REFERENCES staff(id),
  printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- DELIVERY
-- ===============================
CREATE TABLE delivery_zones (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(80) NOT NULL,
  charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  eta_minutes INT NOT NULL DEFAULT 30
);

CREATE TABLE riders (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  vehicle_type VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE delivery_assignments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rider_id BIGINT NOT NULL REFERENCES riders(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  delivery_note TEXT
);

CREATE TABLE delivery_partner_integrations (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  partner_name VARCHAR(40) NOT NULL, -- FOODPANDA, CAREEM_NOW, UBER_EATS
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_key_encrypted TEXT,
  secret_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===============================
-- HR / ATTENDANCE / SALARY
-- ===============================
CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  staff_id BIGINT NOT NULL REFERENCES staff(id),
  attendance_date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status attendance_status NOT NULL DEFAULT 'PRESENT',
  overtime_minutes INT NOT NULL DEFAULT 0,
  deduction_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(staff_id, attendance_date)
);

CREATE TABLE salary_runs (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  month SMALLINT NOT NULL,
  year SMALLINT NOT NULL,
  generated_by BIGINT REFERENCES staff(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, month, year)
);

CREATE TABLE salary_run_items (
  id BIGSERIAL PRIMARY KEY,
  salary_run_id BIGINT NOT NULL REFERENCES salary_runs(id) ON DELETE CASCADE,
  staff_id BIGINT NOT NULL REFERENCES staff(id),
  base_salary NUMERIC(12,2) NOT NULL,
  overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE
);

-- ===============================
-- OFFLINE SYNC
-- ===============================
CREATE TABLE pending_sync_events (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(80) NOT NULL,
  operation VARCHAR(20) NOT NULL, -- CREATE/UPDATE/DELETE
  payload JSONB NOT NULL,
  device_id VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);
```

---

## 3) API Endpoints (CRUD + Core Flows)

Base path: `/api/v1`

### Auth & RBAC
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `PUT /staff/:id/block` (Master Admin)
- `PUT /staff/:id/unblock` (Master Admin)
- `PUT /roles/:role/permissions` (Master Admin/Admin)

### Orders
- `POST /orders` create counter/dine-in/takeaway/delivery order
- `GET /orders` filters: `status`, `channel`, `from`, `to`, `staffId`
- `GET /orders/:id`
- `PUT /orders/:id` update items/customer/notes
- `PUT /orders/:id/status` -> pending/preparing/ready/out-for-delivery/completed
- `DELETE /orders/:id` soft-cancel
- `POST /orders/:id/reprint-receipt`

### Billing
- `POST /bills/from-order/:orderId`
- `GET /bills/:id`
- `POST /bills/:id/payments` (split bill: multiple calls with different methods)
- `POST /bills/:id/tip`
- `POST /bills/:id/discount`
- `POST /bills/:id/refund`

### Inventory
- `POST /ingredients`
- `GET /ingredients`
- `PUT /ingredients/:id`
- `DELETE /ingredients/:id`
- `POST /inventory/stock-transactions`
- `GET /inventory/low-stock`
- `POST /recipes/menu-item/:menuItemId`

### Customers
- `POST /customers`
- `GET /customers?phone=...`
- `GET /customers/:id`
- `PUT /customers/:id`
- `POST /customers/:id/loyalty/add`
- `POST /customers/:id/khata/entry`
- `POST /customers/:id/addresses`

### Staff & HR
- `POST /staff`
- `GET /staff`
- `PUT /staff/:id`
- `DELETE /staff/:id`
- `POST /attendance/check-in`
- `POST /attendance/check-out`
- `GET /attendance`
- `POST /salary-runs/generate`
- `GET /salary-runs/:id`

### Delivery
- `POST /riders`
- `GET /riders`
- `PUT /riders/:id`
- `POST /delivery/assign` (orderId + riderId)
- `GET /delivery/orders`
- `POST /delivery/zones`
- `GET /delivery/platform-orders` (Foodpanda/Careem/Uber adapter output)

### Analytics & Reports
- `GET /analytics/overview?from=...&to=...`
- `GET /analytics/top-dishes`
- `GET /analytics/staff-performance`
- `GET /analytics/wastage`
- `GET /reports/sales?groupBy=daily|weekly|monthly|yearly`
- `GET /reports/receipts/reprint-log`

### WebSocket Events
- `order.created` -> KDS + Billing consoles
- `order.status.changed` -> all modules
- `bill.paid` -> analytics stream
- `inventory.low_stock` -> admin alerts
- `delivery.assigned` -> rider dashboard

---

## 4) Frontend Component Map

### POS Order Screen
- `OrderTypeTabs` (Counter/Dine-in/Takeaway/Delivery)
- `MenuGrid` (categories, combo tags, modifier badge)
- `CartPanel` (qty, modifiers, notes)
- `CustomerQuickAttach`
- `OrderTimerBadge` (live timer only in dashboard/list)
- `PlaceOrderButton`

### Billing Screen
- `BillSummaryCard`
- `DiscountAndTipPanel`
- `SplitPaymentPanel` (cash/card/wallet/khata line items)
- `PaymentStatusPill`
- `PrintReceiptActions` (kitchen/cash/customer/delivery)

### Staff Management Screen
- `StaffTable`
- `RolePermissionMatrix`
- `AttendanceCalendar`
- `SalaryRunGenerator`
- `BlockUnblockSwitch` (master admin only)

### Delivery Screen
- `DeliveryOrderQueue`
- `RiderList`
- `AssignRiderModal`
- `AddressBookPanel`
- `ZoneChargeConfigurator`
- `PartnerOrdersStream`

### Analytics Dashboard
- `SalesKpiCards`
- `ProfitTaxTrendChart`
- `TopDishesChart`
- `PrepVsDeliveryTimeChart`
- `WastageReportGrid`
- `CustomDateFilter`

---

## 5) Example Backend Snippets (Node + Express + Socket.IO)

### A) JWT + RBAC Middleware

```ts
// src/middleware/auth.ts
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

type JwtPayload = { sub: number; role: string; branchId: number; isBlocked?: boolean };

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    if (decoded.isBlocked) return res.status(403).json({ message: "Account blocked by Master Admin" });
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function allowRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) return res.status(403).json({ message: "Forbidden" });
    next();
  };
}
```

### B) Create Order + Auto Timer + KDS Push

```ts
// src/routes/orders.ts
router.post("/", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "CASHIER", "WAITER"), async (req, res) => {
  const { channel, customerId, items, notes } = req.body;
  const user = (req as any).user;

  const order = await db.tx(async (trx) => {
    const orderNo = await nextOrderNo(trx, user.branchId);
    const created = await trx.one(
      `INSERT INTO orders (branch_id, order_no, customer_id, channel, status, placed_by_staff_id, notes)
       VALUES ($1,$2,$3,$4,'PENDING',$5,$6) RETURNING *`,
      [user.branchId, orderNo, customerId ?? null, channel, user.sub, notes ?? null]
    );

    for (const i of items) {
      const menu = await trx.one("SELECT id,name,price FROM menu_items WHERE id=$1", [i.menuItemId]);
      const lineTotal = Number(menu.price) * Number(i.qty);
      const row = await trx.one(
        `INSERT INTO order_items (order_id, menu_item_id, item_name_snapshot, unit_price_snapshot, quantity, line_total, special_instructions)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [created.id, menu.id, menu.name, menu.price, i.qty, lineTotal, i.note ?? null]
      );

      if (Array.isArray(i.modifiers)) {
        for (const m of i.modifiers) {
          await trx.none(
            `INSERT INTO order_item_modifiers (order_item_id, modifier_name_snapshot, extra_price_snapshot)
             VALUES ($1,$2,$3)`,
            [row.id, m.name, m.extraPrice ?? 0]
          );
        }
      }
    }

    return created;
  });

  io.to(`branch:${user.branchId}:kds`).emit("order.created", order);
  io.to(`branch:${user.branchId}:pos`).emit("order.timer.started", { orderId: order.id, placedAt: order.placed_at });

  res.status(201).json(order);
});
```

### C) Status Update + Timer Metrics

```ts
router.put("/:id/status", requireAuth, async (req, res) => {
  const { status } = req.body;
  const nowField =
    status === "PREPARING" ? "prep_started_at" :
    status === "READY" ? "ready_at" :
    status === "OUT_FOR_DELIVERY" ? "out_for_delivery_at" :
    status === "COMPLETED" ? "completed_at" : null;

  const order = await db.one(
    `UPDATE orders
     SET status=$1,
         prep_started_at=CASE WHEN $2='prep_started_at' THEN NOW() ELSE prep_started_at END,
         ready_at=CASE WHEN $2='ready_at' THEN NOW() ELSE ready_at END,
         out_for_delivery_at=CASE WHEN $2='out_for_delivery_at' THEN NOW() ELSE out_for_delivery_at END,
         completed_at=CASE WHEN $2='completed_at' THEN NOW() ELSE completed_at END
     WHERE id=$3 RETURNING *`,
    [status, nowField, req.params.id]
  );

  io.to(`branch:${order.branch_id}:all`).emit("order.status.changed", order);
  res.json(order);
});
```

### D) Recipe-Based Inventory Deduction

```ts
// run when order transitions to PREPARING
export async function deductInventoryForOrder(orderId: number, staffId: number) {
  const items = await db.manyOrNone(
    `SELECT oi.menu_item_id, oi.quantity
     FROM order_items oi
     WHERE oi.order_id=$1`,
    [orderId]
  );

  await db.tx(async (trx) => {
    for (const item of items) {
      const recipe = await trx.manyOrNone(
        `SELECT ingredient_id, quantity_required
         FROM menu_item_recipes WHERE menu_item_id=$1`,
        [item.menu_item_id]
      );
      for (const r of recipe) {
        const usedQty = Number(r.quantity_required) * Number(item.quantity);
        await trx.none(
          `UPDATE ingredients SET current_stock = current_stock - $1 WHERE id=$2`,
          [usedQty, r.ingredient_id]
        );
        await trx.none(
          `INSERT INTO stock_transactions (ingredient_id, type, quantity, note, created_by, ref_order_id)
           VALUES ($1,'USAGE',$2,'Auto deduction from recipe',$3,$4)`,
          [r.ingredient_id, usedQty, staffId, orderId]
        );
      }
    }
  });
}
```

### E) Split Payments + Khata Ledger

```ts
router.post("/bills/:id/payments", requireAuth, allowRoles("MASTER_ADMIN", "ADMIN", "CASHIER"), async (req, res) => {
  const { method, amount, customerId } = req.body;
  const billId = Number(req.params.id);
  const user = (req as any).user;

  await db.tx(async (trx) => {
    await trx.none(
      `INSERT INTO bill_payments (bill_id, method, amount, received_by) VALUES ($1,$2,$3,$4)`,
      [billId, method, amount, user.sub]
    );

    if (method === "KHATA" && customerId) {
      await trx.none(
        `INSERT INTO khata_ledger (customer_id, order_id, debit, note, created_by)
         SELECT $1, b.order_id, $2, 'Bill charged to Khata', $3 FROM bills b WHERE b.id=$4`,
        [customerId, amount, user.sub, billId]
      );
      await trx.none(`UPDATE customers SET khata_balance = khata_balance + $1 WHERE id=$2`, [amount, customerId]);
    }

    await trx.none(
      `UPDATE bills
       SET payment_status = CASE
         WHEN (SELECT COALESCE(SUM(amount),0) FROM bill_payments WHERE bill_id=$1) >= grand_total THEN 'PAID'
         WHEN (SELECT COALESCE(SUM(amount),0) FROM bill_payments WHERE bill_id=$1) > 0 THEN 'PARTIAL'
         ELSE 'UNPAID' END
       WHERE id=$1`,
      [billId]
    );
  });

  res.json({ success: true });
});
```

### F) Analytics Query (Prep + Delivery + Completion Time)

```ts
router.get("/analytics/overview", requireAuth, async (req, res) => {
  const { from, to } = req.query as any;
  const branchId = (req as any).user.branchId;

  const data = await db.one(
    `SELECT
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(b.grand_total),0)::numeric AS gross_sales,
      COALESCE(AVG(EXTRACT(EPOCH FROM (o.ready_at - o.prep_started_at))/60),0)::numeric(10,2) AS avg_prep_minutes,
      COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.out_for_delivery_at))/60),0)::numeric(10,2) AS avg_delivery_minutes,
      COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.placed_at))/60),0)::numeric(10,2) AS avg_completion_minutes
     FROM orders o
     LEFT JOIN bills b ON b.order_id = o.id
     WHERE o.branch_id=$1
       AND o.placed_at BETWEEN $2 AND $3`,
    [branchId, from, to]
  );

  res.json(data);
});
```

---

## 6) Example Frontend Snippets (React)

### A) Live Order Timer (visible on dashboard/list only)

```tsx
// src/components/orders/OrderTimerBadge.tsx
import { useEffect, useState } from "react";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

export function OrderTimerBadge({ placedAt, status }: { placedAt: string; status: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - new Date(placedAt).getTime();
  const danger = elapsed > 15 * 60 * 1000;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${danger ? "bg-red-500/20 text-red-300" : "bg-cyan-500/20 text-cyan-300"}`}>
      {status} • {fmt(elapsed)}
    </span>
  );
}
```

### B) POS Order Screen Skeleton

```tsx
// src/pages/PosOrderScreen.tsx
export default function PosOrderScreen() {
  return (
    <div className="grid grid-cols-12 gap-4 p-4 min-h-screen bg-slate-950 text-white">
      <aside className="col-span-8 rounded-2xl border border-fuchsia-400/30 p-4">
        {/* RGB luxury effect */}
        <h1 className="text-2xl font-bold bg-gradient-to-r from-fuchsia-500 via-cyan-400 to-lime-300 bg-clip-text text-transparent">
          Frost & Brew POS
        </h1>
        {/* OrderTypeTabs, MenuGrid, Modifiers */}
      </aside>
      <section className="col-span-4 rounded-2xl border border-cyan-400/30 p-4">
        {/* CustomerQuickAttach, CartPanel, PlaceOrderButton */}
      </section>
    </div>
  );
}
```

### C) Billing Split Payments UI

```tsx
// src/components/billing/SplitPaymentPanel.tsx
import { useState } from "react";

export function SplitPaymentPanel({ billId, dueAmount }: { billId: number; dueAmount: number }) {
  const [rows, setRows] = useState([{ method: "CASH", amount: dueAmount }]);

  const submit = async () => {
    for (const r of rows) {
      await fetch(`/api/v1/bills/${billId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(r),
      });
    }
  };

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2">
          <select value={r.method} onChange={(e) => {
            const next = [...rows];
            next[i].method = e.target.value;
            setRows(next);
          }}>
            <option>CASH</option><option>CARD</option><option>MOBILE_WALLET</option><option>KHATA</option>
          </select>
          <input type="number" value={r.amount} onChange={(e) => {
            const next = [...rows];
            next[i].amount = Number(e.target.value);
            setRows(next);
          }} />
        </div>
      ))}
      <button onClick={() => setRows([...rows, { method: "CASH", amount: 0 }])}>+ Add split</button>
      <button onClick={submit}>Confirm Payment</button>
    </div>
  );
}
```

### D) KDS Board with Color-Coded Status

```tsx
// src/pages/KdsScreen.tsx
const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-500/20 border-yellow-400",
  PREPARING: "bg-blue-500/20 border-blue-400",
  READY: "bg-emerald-500/20 border-emerald-400",
  OUT_FOR_DELIVERY: "bg-purple-500/20 border-purple-400",
  COMPLETED: "bg-slate-500/20 border-slate-400",
};

export function KdsCard({ order }: { order: any }) {
  return (
    <article className={`rounded-xl border p-3 ${statusColor[order.status]}`}>
      <header className="flex justify-between">
        <h3 className="font-bold">#{order.order_no}</h3>
        <span>{order.status}</span>
      </header>
      <ul>{order.items.map((x: any) => <li key={x.id}>{x.qty}x {x.item_name_snapshot}</li>)}</ul>
    </article>
  );
}
```

### E) Delivery Assignment UI

```tsx
// src/components/delivery/AssignRiderModal.tsx
export function AssignRiderModal({ orderId, riders }: { orderId: number; riders: any[] }) {
  const assign = async (riderId: number) => {
    await fetch("/api/v1/delivery/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, riderId }),
    });
  };

  return (
    <div>
      {riders.map((r) => (
        <button key={r.id} onClick={() => assign(r.id)} className="block w-full text-left p-2 hover:bg-white/10">
          {r.full_name} ({r.phone})
        </button>
      ))}
    </div>
  );
}
```

---

## 7) Receipts Format Requirements Mapping

- **Kitchen Receipt:** token/order no, QR/barcode, item lines + qty, no prices.
- **Cash Counter Receipt:** subtotal, tax, discounts, tip, payment methods, cashier name.
- **Customer Receipt:** order summary, loyalty earned/redeemed, khata balance, delivery address.
- **Delivery Receipt:** customer contact + address + landmark, delivery charge, rider note.

Implementation hint:
- Store HTML templates in `receipt_templates` and render with a shared printer service (`/services/receiptRenderer.ts`).
- Log all prints in `receipt_print_logs` for reprint audit and fraud control.

---

## 8) PWA Offline-First Strategy

- Cache shell assets with Workbox precache.
- Use IndexedDB tables: `offline_orders`, `offline_payments`, `sync_queue`.
- If API unavailable, write operations to `sync_queue` with local UUID.
- Background sync worker replays queue in order and maps local IDs to server IDs.
- UI badges:
  - `Online` (green), `Offline` (orange), `Syncing` (blue), `Conflict` (red).

---

## 9) Implementation Roadmap (Aligned with Requested Phases)

1. **Phase 1 (Core POS):** auth, RBAC, order create/update, billing + split payments, basic reports.
2. **Phase 2 (KDS + Inventory):** Socket.IO KDS board, status pipeline, recipe auto deduction + low stock alerts.
3. **Phase 3 (Staff/HR):** staff profiles, attendance, salary runs, block/unblock and role matrix.
4. **Phase 4 (Customer engagement):** customer attach flow, reorder popup, loyalty, khata ledger.
5. **Phase 5 (Delivery):** riders, zones, assignments, partner adapters.
6. **Phase 6 (Analytics + Reports):** KPI dashboard, prep/delivery timings, wastage + tax/profit reports, reprint audit.
7. **Phase 7 (Multi-branch + CRM):** centralized HQ dashboard, branch-level permission boundaries, advanced lifecycle marketing.

---

## 10) Suggested Folder Layout

```txt
pos-system/
  apps/
    api/                  # Express + Socket.IO
    pos-web/              # React PWA (cashier/waiter/admin)
    kds-web/              # Kitchen display app
  packages/
    db/                   # SQL migrations + Prisma/Knex models
    shared-types/         # DTOs + enums
    ui/                   # shared component library
  infra/
    docker/
    nginx/
```

This blueprint is directly implementable and covers all requested modules, schema relations, APIs, UI components, and module-specific code examples.
