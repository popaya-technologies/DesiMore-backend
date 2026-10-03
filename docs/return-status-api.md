# Return Statuses

Run `docs/return-status-schema.sql` manually in pgAdmin first; assign permissions through existing RBAC. No schema execution is automatic. Existing accessToken cookie authentication applies.

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/api/return-statuses` | return-status:read |
| GET | `/api/return-statuses/export?format=csv` | return-status:read |
| GET | `/api/return-statuses/:id` | return-status:read |
| POST | `/api/return-statuses` | return-status:create |
| PUT or PATCH | `/api/return-statuses/:id` | return-status:update |
| DELETE | `/api/return-statuses/:id` | return-status:delete |
| DELETE | `/api/return-statuses/bulk` | return-status:delete |

Create/update body: `{ "name": "Awaiting Products" }`. Name is required, nonblank, trimmed, max 100 characters, unique (case-sensitive). Unknown fields, null, control characters and empty bodies return 400. Create returns 201; detail/update return 200 with `{id,name,createdAt,updatedAt}`.

List supports `search` (partial case-insensitive name), `date` (YYYY-MM-DD created day), or `startDate`/`endDate` inclusive date range; `page` default 1/max 1000000, `limit` default 10/max 100, `sortBy` name/createdAt (default name), `sortOrder` ASC/DESC (default ASC). Response `{data:[{id,name,createdAt,updatedAt,no}],meta:{total,page,limit,totalPages}}`. `no` is a calculated row number, not a database field. Dates use stored database timestamps.

Export accepts the same filters, sorting and `format=csv` or `xlsx`; all matching rows up to 10,000 are exported, independent of page. Export has Return Status Name column. Spreadsheet formula prefixes are escaped. View/settings controls are frontend-only.

Bulk delete body: `{ "ids": ["valid-uuid-here"] }` (1–100 distinct UUIDs). Every record is locked and verified in a transaction before deletion. Missing IDs return 404 and delete nothing; malformed/duplicate IDs return 400. Response `{message:"Return statuses deleted successfully",deletedCount:1}`. Single delete returns `{message:"Return status deleted successfully"}`.

Errors: 400 validation, 401 authentication, 403 permission, 404 missing record, 409 duplicate name or reference constraint, 500 unexpected failure.

This is a status catalog. Existing product returns store `returnStatus` as text without a foreign key. Send the catalog's **name**, not its UUID, to that existing field. Renaming/deleting a catalog entry preserves historical return status text. No changes to refunds, return transitions, checkout or payments. Existing strings are not automatically imported.

Verification: `npm run typecheck`, `npm run test:return-statuses`, `npm run build`. Tests use mocks and TypeORM SQL generation without database connections. Live database integration requires manual SQL setup.
