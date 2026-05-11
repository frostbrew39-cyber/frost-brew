# Frost & Brew POS System

Monorepo starter for a Fast Food Restaurant POS with online + offline PWA workflow.

## Apps

- `apps/api`: Node.js + Express + Socket.IO backend
- `apps/pos-web`: React POS dashboard (orders, billing, staff, delivery, analytics)
- `apps/kds-web`: Kitchen Display System frontend
- `packages/db`: PostgreSQL migration scripts
- `packages/shared-types`: shared TypeScript contracts

## Quick Start

```bash
npm install
npm run dev:api
npm run dev:pos
npm run dev:kds
```

## Core Endpoints

- Auth: `/api/v1/auth/login`, `/api/v1/auth/me`
- Orders: `/api/v1/orders`, `/api/v1/orders/:id/status`
- Billing: `/api/v1/bills/from-order/:orderId`, `/api/v1/bills/:id/payments`
- Staff: `/api/v1/staff`, `/api/v1/staff/:id/block`, `/api/v1/staff/:id/unblock`
- Customers: `/api/v1/customers`
- Delivery: `/api/v1/riders`, `/api/v1/delivery/assign`
- Analytics: `/api/v1/analytics/overview`
- Receipts: `/api/v1/receipts/:orderId/print`, `/api/v1/receipts/reprint-log`

## Notes

- API currently uses in-memory stores for fast bootstrap and demo flow.
- API now supports PostgreSQL when `DATABASE_URL` is set, with in-memory fallback for quick demo mode.
- SQL schema foundation is in `packages/db/migrations/001_init.sql`.
- Phase 1 extension migration is in `packages/db/migrations/002_phase1_extensions.sql`.
- Full architecture blueprint is in `FAST_FOOD_POS_BLUEPRINT.md`.

## Deployment (Vercel + Firebase)

Recommended production split:

- `apps/pos-web` on Vercel (static Vite frontend)
- `apps/api` on Firebase Cloud Run/Functions Gen2 (Express + Socket.IO)

### 1) Frontend on Vercel (`apps/pos-web`)

In Vercel project settings:

- Root Directory: `apps/pos-web`
- Build Command: `npm run build`
- Output Directory: `dist`

Set environment variables in Vercel:

- `VITE_API_BASE_URL=https://<your-api-domain>`
- `VITE_API_URL=https://<your-api-domain>/api/v1`
- `VITE_SOCKET_URL=https://<your-api-domain>`

### 2) Backend on Firebase

Deploy API to a runtime that supports WebSockets (Cloud Run or Functions Gen2).
Configure backend env vars:

- `JWT_SECRET=<strong-random-secret>`
- `DATABASE_URL=<postgres-connection-string>`
- `PORT=8080` (or runtime-provided port)

### 3) Post-deploy check

- Login from POS frontend
- Create order and verify it appears live (Socket.IO)
- Update order status and verify real-time updates
- Test analytics and staff endpoints with auth token
