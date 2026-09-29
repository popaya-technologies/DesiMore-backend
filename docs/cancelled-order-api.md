# Cancelled Orders admin API

Run `cancelled-order-schema.sql` manually in pgAdmin first. No schema synchronization or database execution is added. Existing tables with these names must already match the script; `IF NOT EXISTS` does not repair a different schema. Grant the new permissions to appropriate roles through existing RBAC management. Superadmins retain their existing bypass.

All endpoints use the existing `accessToken` cookie and require the indicated permission.

| Method | Path | Permission |
| --- | --- | --- |
| GET | `/api/cancelled-orders` | `cancelled-order:read` |
| GET | `/api/cancelled-orders/:id` | `cancelled-order:read` |
| POST | `/api/cancelled-orders/:id/history` | `cancelled-order:update` |
| DELETE | `/api/cancelled-orders/bulk` | `cancelled-order:delete` |

Only existing retail orders whose current status is `cancelled` and which are not archived appear. Noncancelled, missing, and archived IDs return 404. No checkout, cart, wholesale, guest-order, inventory, payment-provider, or refund behavior is changed.

## Listing

Optional query keys: `orderId` (partial orderNumber), `customer` (partial fullname, first/last name, or email), `total` (exact nonnegative decimal, up to two decimal places), `dateAdded` and `dateModified` (strict YYYY-MM-DD calendar days on database timestamps), `page` (default 1), `limit` (default 10, max 100), `sortBy` (`orderNumber`, `customer`, `total`, `createdAt`, `updatedAt`; default `createdAt`), `sortOrder` (`ASC`/`DESC`, default `DESC`). Searches are case insensitive and wildcard characters are treated literally. Unsupported parameters, arrays, invalid dates, and malformed values return 400. Map the screenshot's Search box to `customer` and date picker to `dateAdded`.

Response: `{ "data": [...], "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 } }`.
Each row contains `id`, `orderNumber`, `userId`, `status`, `paymentStatus`, `paymentMethod`, `subtotal`, `tax`, `shipping`, `total`, `createdAt`, `updatedAt`, `billingAddress`, `shippingAddress`, and `user` with `firstname`, `lastname`, `fullname`, `email`, `phone`, `userRole`. PostgreSQL decimals remain strings. User is null if unavailable. Passwords, tokens, provider responses, transaction IDs, and inventory reservations are excluded.

## Detail

GET by UUID returns the row fields plus `notes`, `tracking` (carrier/trackingNumber, null when absent), `items`, and `history` newest first. Items contain `id`, `productId`, `productName`, `productImages`, `model`, `price`, `discountedPrice`, `quantity`, `total`, `selectedOptions`. Model comes from the current product because the existing order item has no model snapshot; missing product/model returns null. History contains `id`, `orderId`, `status`, `comment`, `carrierName`, `trackingNumber`, `customerNotified`, `override`, `createdBy`, `createdAt`. This API records new history entries; it does not manufacture historical events for older cancellations.

## Add history

```json
{
  "status": "cancelled",
  "override": false,
  "notifyCustomer": true,
  "comment": "Customer requested cancellation."
}
```

Status, override, and notifyCustomer are required. Comment is optional, at most 10,000 characters; explicit empty string clears notes, omission preserves existing notes. Unknown fields and null values are rejected. The existing status enum is validated, but cancellation is terminal in the existing order flow: transitions to every other status return 409 even with override. Override is recorded for audit and cannot bypass inventory or payment safety. Paid/refunded orders cannot be reopened or refunded here. Adding a same-status note is allowed regardless of payment status and does not change that status.

The order is locked and the order/notes update and history insert occur in one transaction. Tracking is copied from the order. On commit, an optional individual email is sent to the order's shipping contact using the existing email service. Comments are escaped as text. Success response: `{ "message": "Order history added successfully", "history": {...}, "notification": "sent" }`. Notification is `not_requested` when disabled. `customerNotified: true` means the provider accepted the email, not guaranteed inbox delivery.

Email failure or absent recipient returns HTTP 200 with the saved history, `customerNotified: false`, `notification: "failed"`, and message `Order history added successfully, but customer notification failed`. Do not repeat history submission automatically. If email succeeds but recording its result fails, HTTP 500 explicitly reports that history was saved and email accepted; do not automatically resend. A process interruption between delivery and audit persistence can leave the flag false; this is not an exactly-once email queue.

## Bulk removal

```json
{ "ids": ["01234567-89ab-4cde-8fab-0123456789ab"] }
```

Accepts 1–100 distinct UUIDs (case-insensitive uniqueness). Every order must exist, be cancelled, and not already archived. Locks are acquired in stable order and all validation completes before any archival rows are saved. A missing/noncancelled/archived order returns 404 and nothing is archived. Success: `{ "message": "Cancelled orders deleted successfully", "deletedCount": 1, "deletionMode": "archive" }`.

Removal is archival **only from this admin module**: orders, items, payment records and history remain intact and other existing order screens retain them. No permanent deletion, refunds, or payment calls occur. The archive table also prevents subsequent physical deletion of its referenced orders.

Errors use `{ "message": "...", "errors": [...] }` (errors optional): 400 validation, 401 unauthenticated, 403 permission, 404 missing cancelled order, 409 prohibited transition, 500 unexpected failure. Export and column visibility are frontend concerns; this change adds only the four specified endpoints.

## Verification

`npm run typecheck`, `npm run test:cancelled-orders`, `npm run build`.
Tests use repository doubles, actual TypeORM SQL generation and HTTP routes; no database connection or real email. Live integration requires applying the manual SQL and configuring existing email/RBAC services.
