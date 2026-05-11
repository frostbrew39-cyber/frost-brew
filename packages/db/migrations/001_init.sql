CREATE TYPE order_channel AS ENUM ('COUNTER', 'DINE_IN', 'TAKEAWAY', 'DELIVERY');
CREATE TYPE order_status AS ENUM ('PENDING', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
CREATE TYPE payment_method AS ENUM ('CASH', 'CARD', 'MOBILE_WALLET', 'KHATA');
CREATE TYPE staff_role AS ENUM ('MASTER_ADMIN', 'ADMIN', 'CASHIER', 'WAITER', 'KITCHEN');

CREATE TABLE branches (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL
);

CREATE TABLE staff (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) UNIQUE NOT NULL,
  role staff_role NOT NULL,
  salary_monthly NUMERIC(12,2) NOT NULL DEFAULT 0,
  join_date DATE NOT NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  full_name VARCHAR(120),
  phone VARCHAR(30) NOT NULL,
  loyalty_points INT NOT NULL DEFAULT 0,
  khata_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(branch_id, phone)
);

CREATE TABLE menu_items (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT REFERENCES branches(id),
  name VARCHAR(120) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  branch_id BIGINT NOT NULL REFERENCES branches(id),
  order_no VARCHAR(40) NOT NULL,
  customer_id BIGINT REFERENCES customers(id),
  channel order_channel NOT NULL,
  status order_status NOT NULL DEFAULT 'PENDING',
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
  line_total NUMERIC(12,2) NOT NULL
);

CREATE TABLE bills (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  subtotal NUMERIC(12,2) NOT NULL,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tip_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_charges NUMERIC(12,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(12,2) NOT NULL
);

CREATE TABLE bill_payments (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
