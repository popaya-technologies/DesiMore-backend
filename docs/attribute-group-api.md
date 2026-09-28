# Attribute Groups API

Run [attribute-group-schema.sql](attribute-group-schema.sql) in pgAdmin against the existing backend database.
No automatic migrations or database writes are performed during implementation/testing.
The SQL creates attribute_groups if absent, preserves the table if already installed using the earlier
Attributes SQL, and registers permissions. IF NOT EXISTS does not repair an incompatible table schema.
No changes are made to products, product_attributes, cart, checkout, or other modules.

## Endpoints

All requests use the existing accessToken cookie.
Super-admin (su) has access; assign attribute-group permissions to other staff through existing RBAC.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/attribute-groups | attribute-group:create |
| GET | /api/attribute-groups | attribute-group:read |
| GET | /api/attribute-groups/:id | attribute-group:read |
| PATCH or PUT | /api/attribute-groups/:id | attribute-group:update |
| DELETE | /api/attribute-groups/:id | attribute-group:delete |
| GET | /api/attribute-groups/export?format=csv | attribute-group:read |
| GET | /api/attribute-groups/export?format=xlsx | attribute-group:read |

Create payload:
```json
{ "name": "Technical Specifications", "sortOrder": 0 }
```

- name: required on create, trimmed nonblank string, max 255 characters; no control characters.
- sortOrder: optional, defaults to 0; JSON integer 0–2147483647, not a string.
- Unique names are case-sensitive. Duplicate names return 409.
- Null values, unknown keys, malformed UUIDs and invalid fields return 400.
- Create returns 201; detail/update return 200 with id, name, sortOrder, createdAt, updatedAt.
- PATCH/PUT both accept partial updates. Omitted fields remain unchanged; empty updates return 400.
- Missing records return 404.
- Default Product group ID is protected from deletion to preserve the earlier Attributes default.
- Referenced groups cannot be deleted when the earlier Attributes foreign key is installed:
  the API returns 409 asking you to reassign attributes first.
- Delete returns { "message": "Attribute group deleted successfully" }.
- Send only name and sortOrder from the edit form, not response metadata.

## Listing

GET /api/attribute-groups?search=technical&page=1&limit=10&sortBy=sortOrder&sortOrder=ASC

| Parameter | Values |
|---|---|
| search | Literal case-insensitive substring of name, max 255 characters |
| date | createdAt calendar day, YYYY-MM-DD |
| startDate/endDate | Inclusive date range; cannot combine with date |
| page | Positive integer, defaults 1 |
| limit | 1–100, defaults 10 |
| sortBy | name, sortOrder, createdAt; defaults sortOrder |
| sortOrder | ASC/DESC, defaults ASC |

Date filters use stored timestamp calendar days. ID breaks sorting ties for stable pagination.
Response: { data: [...], meta: { total, page, limit, totalPages } }.

## Export and UI

CSV/XLSX exports apply the same filters and sorting, ignoring pagination for row selection.
Columns: Attribute Group Name, Sort Order. Maximum 10,000 matches; narrow filters if exceeded.
Formula-like names are escaped in spreadsheets, without modifying stored names.
View/column visibility and row selection remain frontend state.

The table and default group ID match the earlier Attributes module. That module's files are not
currently in this checkout and are not recreated here. If restored, its dropdown reads this same table.

## Checks

npm run typecheck
npm run test:attribute-groups
npm run build

Tests use mocked repositories and real TypeORM metadata/query generation, without database connections.
Live database integration requires you to apply the SQL first.
