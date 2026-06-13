# paywall

A subscription billing backend service for SaaS applications. The service provides plan management, checkout session creation, payment lifecycle handling, webhook processing, refunds, invoice retrieval, and admin reporting.

## Features

- Email/password authentication with JWT access tokens
- Subscription plans and customer subscriptions
- Checkout session creation through a payment gateway abstraction
- Payment webhook processing with signature verification and idempotency handling
- Refund workflow with balance checks and clear full-refund invoice state handling
- Invoice history and payment history APIs
- Admin overview and reconciliation report endpoints
- PostgreSQL persistence and Redis-backed rate limiting

## Tech stack

- Node.js 20+
- TypeScript
- Express
- PostgreSQL
- Redis
- Vitest

## Local development

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

Update values in `.env` as needed.

### 4. Run database migrations

```bash
npm run db:migrate
```

### 5. Start the API

```bash
npm run dev
```

The service listens on `http://localhost:3000` by default.

## Core endpoints

- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/plans`
- `GET /api/subscriptions`
- `GET /api/subscriptions/current`
- `POST /api/subscriptions`
- `GET /api/payments`
- `GET /api/payments/:paymentId` (returns the payment together with its linked invoice and subscription state)
- `POST /api/payments`
- `GET /api/invoices`
- `GET /api/invoices/:invoiceId`
- `GET /api/refunds/:paymentId`
- `POST /api/refunds`
- `POST /webhooks/payments/acmepay`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/reconciliation-report`

## Test and validation

```bash
npm run typecheck
npm test
```

## Notes

- `src/server.ts` seeds a default admin account and default plans during bootstrap.
- The payment gateway is implemented behind an interface so another provider can be added later without rewriting the API layer.
