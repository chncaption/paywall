# Local development

## Prerequisites

- Node.js 20+
- Docker with Compose support

## Bootstrapping

1. Install packages:

   ```bash
   npm install
   ```

2. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Run the initial migration:

   ```bash
   npm run db:migrate
   ```

5. Start the server:

   ```bash
   npm run dev
   ```

## Validation steps

- Health check: `GET http://localhost:3000/health`
- Type checking: `npm run typecheck`
- Tests: `npm test`

## Seeded data

On startup the server ensures:
- a default admin user from `.env`
- a default set of subscription plans

## Webhook testing

The AcmePay adapter expects a payload body string and an `x-acmepay-signature` header generated as an HMAC-SHA256 of the raw payload using `PAYMENT_PROVIDER_WEBHOOK_SECRET`.

Example values for local integration tests:

- Webhook secret: `whsec_example_1234567890abcdef1234567890abcdef`
- Test card: `4242 4242 4242 4242` / any future expiry / any CVC
- Test provider secret: `sk_test_1234567890abcdefghijklmnopqrstuvwxyz`
