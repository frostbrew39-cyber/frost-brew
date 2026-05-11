import cors from "cors";
import express from "express";
import { parseFrontendOrigins } from "./config/env";
import { authRouter } from "./modules/auth/routes";
import { staffRouter } from "./modules/staff/routes";
import { ordersRouter } from "./modules/orders/routes";
import { billingRouter } from "./modules/billing/routes";
import { customersRouter } from "./modules/customers/routes";
import { deliveryRouter } from "./modules/delivery/routes";
import { analyticsRouter } from "./modules/analytics/routes";
import { inventoryRouter } from "./modules/inventory/routes";
import { receiptsRouter } from "./modules/receipts/routes";
import { pingDb } from "./db/pool";
export function createApp() {
    const app = express();
    const allowedOrigins = parseFrontendOrigins();
    if (allowedOrigins?.length) {
        app.use(cors({ origin: allowedOrigins }));
    }
    else {
        app.use(cors());
    }
    app.use(express.json());
    app.use("/api/v1/auth", authRouter);
    app.use("/api/v1/staff", staffRouter);
    app.use("/api/v1/orders", ordersRouter);
    app.use("/api/v1/bills", billingRouter);
    app.use("/api/v1/customers", customersRouter);
    app.use("/api/v1/delivery", deliveryRouter);
    app.use("/api/v1/analytics", analyticsRouter);
    app.use("/api/v1/inventory", inventoryRouter);
    app.use("/api/v1/receipts", receiptsRouter);
    app.get("/health", async (_req, res) => {
        const db = await pingDb().catch(() => ({ connected: false, mode: "error" }));
        res.json({ ok: true, db });
    });
    return app;
}
