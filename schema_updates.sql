-- customers table schema definition
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    branch_id INTEGER NOT NULL REFERENCES branches(id),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    loyalty_points INTEGER DEFAULT 0,
    khata_balance NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- customer_addresses table to support multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    street VARCHAR(255),
    city VARCHAR(100),
    zone VARCHAR(100),
    full_address TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: The rest of the tables (orders, order_items, bills, staff, inventory) 
-- remain identical but should be synced.

-- New column for delivery hardening
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
