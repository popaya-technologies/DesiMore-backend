# Customer Groups API

Run `docs/customer-group-schema.sql` manually in pgAdmin against the application database before using these endpoints. No database initialization, migrations or automatic table creation are added. Existing `permissions` table is required. Assign the new permissions through existing RBAC management; superadmins retain their bypass.

All endpoints use the existing accessToken authentication cookie.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/customer-groups` | customer-group:read |
| GET | `/api/customer-groups/export?format=csv` | customer-group:read |
| GET | `/api/customer-groups/:id` | customer-group:read |
| POST | `/api/customer-groups` | customer-group:create |
| PUT or PATCH | `/api/customer-groups/:id` | customer-group:update |
| DELETE | `/api/customer-groups/:id` | customer-group:delete |

Create payload:

```json
{
  "name": "Retail Customers",
  "description": "Customers buying individual products.",
  "approveNewCustomers": false,
  "sortOrder": 0
}
```

`name` is required, trimmed, nonblank, max 255 characters and unique (case-sensitive). `description` is optional plain text, max 10,000 characters, default empty string. `approveNewCustomers` is a boolean (Yes=true, No=false), default false. `sortOrder` is an integer from 0 through 2147483647, default 0. Send JSON numbers/booleans rather than strings. Unknown fields, null values and empty update bodies return 400. PUT and PATCH both accept partial updates; omitted fields retain their values. Empty description clears it.

Create returns HTTP 201; detail/update return HTTP 200 with `{id,name,description,approveNewCustomers,sortOrder,createdAt,updatedAt}`. Delete returns `{message:"Customer group deleted successfully"}`.

List query: `search` (case-insensitive partial name, max 255 characters), `date` (YYYY-MM-DD created day), or `startDate`/`endDate` inclusive created-day range; `page` default 1, max 1000000; `limit` default 10, max 100; `sortBy` name/sortOrder/createdAt (default sortOrder); `sortOrder` ASC/DESC (default ASC). Dates follow the stored database timestamp. Search wildcard characters are treated literally. Response: `{data:[...],meta:{total,page,limit,totalPages}}`.

Export accepts the same filters and sorting, with `format=csv` (default) or `format=xlsx`. It exports matching rows, not just the current page, capped at 10,000 groups. Export columns match the list: Customer Group Name and Sort Order. Spreadsheet formula prefixes are escaped. View/column settings are frontend behavior.

Errors: 400 invalid payload/query/UUID, 401 authentication, 403 permission, 404 missing group, 409 duplicate name or referenced deletion, 500 unexpected failure.

This module stores customer-group definitions only. `approveNewCustomers` records whether the group should require approval, but no registration approval or group-assignment workflow exists yet. It is not an account approval action. Existing user roles, product discount groups (`default`/`wholesaler`), pricing, checkout and payments remain unchanged. No groups are automatically seeded or assigned.

Verification: `npm run typecheck`, `npm run test:customer-groups`, `npm run build`. Tests use repository doubles and TypeORM metadata/SQL generation without a database connection. Live database integration requires running the supplied SQL manually.
