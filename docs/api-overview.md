# API overview

## Authentication

### `POST /api/auth/register`
Create a customer account and return a JWT access token.

Request body:

```json
{
  "email": "owner@example.com",
  "name": "Example Owner",
  "password": "very-strong-password"
}
```

### `POST /api/auth/login`
Authenticate a user and return a JWT access token.

## Plans

### `GET /api/plans`
Return all active subscription plans.

## Subscriptions

All subscription endpoints require `Authorization: Bearer <token>`.

### `GET /api/subscriptions`
Return all subscriptions for the authenticated user.

### `GET /api/subscriptions/current`
Return the latest subscription for the authenticated user.

### `POST /api/subscriptions`
Create a pending subscription for a plan.

Request body:

```json
{
  "planId": "plan_xxx"
}
```

## Payments

All payment endpoints require authentication.

### `GET /api/payments`
Return payment history for the authenticated user.

### `GET /api/payments/:paymentId`
Return one payment owned by the authenticated user together with the linked invoice and subscription state.

### `POST /api/payments`
Create a checkout session for a plan.

Request body:

```json
{
  "planId": "plan_xxx"
}
```

## Invoices

All invoice endpoints require authentication.

### `GET /api/invoices`
Return invoice history for the authenticated user.

### `GET /api/invoices/:invoiceId`
Return one invoice owned by the authenticated user.

## Refunds

All refund endpoints require authentication.

### `GET /api/refunds/:paymentId`
Return refunds for a payment owned by the authenticated user.

### `POST /api/refunds`
Create a refund for a settled payment. Partial refunds keep the invoice in `paid`; a full refund changes the payment to `refunded` and the invoice to `void`.

Request body:

```json
{
  "paymentId": "pay_xxx",
  "amountCents": 2900,
  "reason": "Customer requested cancellation"
}
```

## Webhooks

### `POST /webhooks/payments/acmepay`
Accept payment events from the configured gateway. The request must include the `x-acmepay-signature` header.

## Admin

Admin endpoints require an authenticated token whose role is `admin`.

- `GET /api/admin/overview`
- `GET /api/admin/users`
- `GET /api/admin/reconciliation-report`
