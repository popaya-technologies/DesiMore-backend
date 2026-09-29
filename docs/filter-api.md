# Filters admin API

Supports the Filters list and Add/Edit Filter screen. Run [filter-schema.sql](filter-schema.sql)
once in pgAdmin against your existing application database before using these endpoints.
No SQL is executed automatically and no database tables or rows are created during implementation/testing.

## Endpoints

Use the existing accessToken cookie. Super-admin (su) bypasses RBAC; assign permissions
to other staff through the existing RBAC system.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/filters | filter:create |
| GET | /api/filters | filter:read |
| GET | /api/filters/:id | filter:read |
| PATCH or PUT | /api/filters/:id | filter:update |
| DELETE | /api/filters/:id | filter:delete |
| GET | /api/filters/export?format=csv | filter:read |
| GET | /api/filters/export?format=xlsx | filter:read |

## Form payload

```json
{
  "name": "Color",
  "sortOrder": 0,
  "values": [
    { "name": "Red", "sortOrder": 0 },
    { "name": "Blue", "sortOrder": 1 }
  ]
}
```

Filter Group Name maps to name. Filter Name in each row maps to values[].name.

- Group name: required nonblank string, max 255 characters; trimmed.
- Group names are unique (case-sensitive); duplicates return 409.
- Group sortOrder: optional integer 0–2147483647, defaults 0. Send a JSON number.
- values: required array of 1–100 rows on create.
- Each value needs a nonblank name, max 255 characters, and optional integer sortOrder (default 0).
- Names cannot contain control characters. Value names must be unique within the group, ignoring case.
- Unknown fields, nulls, malformed IDs and invalid types return 400.

Successful create returns 201; detail/update return 200 with:
id, name, sortOrder, values, createdAt, updatedAt.
Each value includes a generated UUID id, name and sortOrder.
Values are returned sorted ascending, preserving input order for ties.

## Editing

PUT and PATCH accept partial updates. Omitted fields stay unchanged.
An empty request object returns 400. Send only writable keys, not the entire GET response.
Supplying values replaces that collection:
- Include existing IDs to retain values; omit ID for new rows.
- IDs must belong to the current group and cannot repeat.
- Each supplied row requires name. Omitted sortOrder is preserved for existing IDs.
- Existing rows not included are removed.
- At least one value must remain.

Example:
```json
{
  "name": "Available Colors",
  "values": [
    {
      "id": "EXISTING_VALUE_UUID",
      "name": "Dark Red",
      "sortOrder": 1
    },
    { "name": "Green", "sortOrder": 0 }
  ]
}
```

Updates lock the group row and save all values atomically. Invalid nested data does not persist scalar edits.
DELETE removes the group and its JSON values. Missing groups return 404.

## List and export

GET /api/filters?search=color&page=1&limit=20&sortBy=sortOrder&sortOrder=ASC

| Query | Meaning |
|---|---|
| search | Case-insensitive literal substring of group name, max 255 characters |
| date | Creation date YYYY-MM-DD |
| startDate/endDate | Inclusive creation-date range; cannot combine with date |
| page | Positive integer, default 1 |
| limit | 1–100, default 20 to match the screenshot |
| sortBy | name, sortOrder, createdAt; default sortOrder |
| sortOrder | ASC/DESC; default ASC |

Date filters use the stored timestamp calendar date. ID breaks sorting ties for stable pagination.
Response: { data: [...], meta: { total, page, limit, totalPages } }.

CSV/XLSX export applies the same filters and sort, ignoring pagination for row selection.
Maximum 10,000 matching groups; larger results return 400 requesting narrower filters.
Columns match the list: Filter Group, Sort Order.
Formula-like names are escaped in exports without modifying stored data.
View/column visibility and row-selection state remain frontend concerns.

## Scope and checks

This module manages admin filter definitions only. It does not attach filters to products/categories
or change storefront filtering, products, cart, checkout, or existing modules.
All values live in filter_groups.values (JSONB); no separate child table is needed.

Run npm run typecheck, npm run test:filters and npm run build.
Tests use repository doubles and real TypeORM metadata/query generation without database connections.
Actual database integration requires applying your SQL first.
