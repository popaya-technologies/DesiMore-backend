# Options admin API

Run [option-schema.sql](option-schema.sql) once in pgAdmin against the existing application database.
No schema or data writes are executed during implementation/testing. There is no automatic migration.
The new options table is separate from product_options. Existing product/cart/checkout behavior is unchanged.
This module manages catalog definitions only; it does not automatically attach options to products.

## Endpoints and permissions

Use the existing accessToken cookie. Super-admin (su) bypasses permission checks.
Assign option permissions to other staff through existing RBAC.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/options | option:create |
| GET | /api/options | option:read |
| GET | /api/options/:id | option:read |
| PATCH or PUT | /api/options/:id | option:update |
| DELETE | /api/options/:id | option:delete |
| GET | /api/options/form-options | Any of option:read/create/update |
| GET | /api/options/export?format=csv | option:read |
| GET | /api/options/export?format=xlsx | option:read |

## Create form

```json
{
  "name": "Color",
  "type": "select",
  "sortOrder": 0,
  "values": [
    { "name": "Red", "image": "/uploads/red.jpg", "sortOrder": 0 },
    { "name": "Blue", "image": null, "sortOrder": 1 }
  ]
}
```

- name: required nonblank string, max 255 characters; trimmed. Option names are unique (case-sensitive).
- type: defaults select. Accepted values: select, radio, checkbox, text, textarea, date, time, datetime.
  These match existing product option types. Send the lowercase value, not the display label.
- sortOrder: integer 0–2147483647, defaults 0. Send a JSON number.
- values: maximum 100 rows. select/radio/checkbox require at least one row.
  Other types require an empty array (or omit values on create).
- Each value requires name (max 255 characters). Duplicate value names ignoring case are rejected.
- Value image is optional: defaults null; null or empty string clears it.
  Accepts HTTP(S) URLs or /uploads/ and /catalog/ paths; rejects unsafe schemes and credentials.
- Value sortOrder defaults 0.
- Use POST /api/uploads/image (multipart file or image) for images and pass its returned URL/path.
  Existing uploader behavior is unchanged.
- Unknown keys, invalid types, null collections and malformed IDs are rejected.
- Null is allowed only for a value's image.

Create returns 201; GET/update return 200 with:
id, name, type, sortOrder, values, createdAt, updatedAt.
Every value has id, name, image and sortOrder. Values are returned sorted ascending,
preserving row order for ties.

## Editing

PUT/PATCH are partial updates; omitted fields stay unchanged.
Use only writable request keys, not an entire API response.
A supplied values array replaces the collection:
- Include existing row IDs to preserve them.
- Omit the ID for a new row. Server generates UUIDs.
- Omitted existing rows are removed.
- Supplied row IDs must belong to this option and cannot repeat.
- For retained IDs, omitted image/sortOrder preserve existing values.
- Value name is required on every supplied row.
- When switching a choice option to text/date/etc., send values: [] explicitly.
- A type-only change is rejected if the existing values do not fit the new type.

The option and its values save together in one transaction. Update locks the option row.
Delete removes this catalog option and its JSON values, but does not remove image files or product options.
Missing records return 404; duplicate option names return 409; validation errors return 400.

## Listing and export

GET /api/options?search=color&type=select&page=1&limit=10&sortBy=sortOrder&sortOrder=ASC

- search: case-insensitive literal substring of option name, max 255 characters.
- type: exact option type.
- date: createdAt calendar date, YYYY-MM-DD.
- startDate/endDate: inclusive createdAt date range; cannot combine with date.
- page: positive integer, defaults 1. limit: 1–100, defaults 10.
- sortBy: name, type, sortOrder, createdAt; defaults sortOrder.
- sortOrder: ASC/DESC; defaults ASC. ID breaks ties for stable pagination.

Response: { data: [...], meta: { total, page, limit, totalPages } }.
Export applies these filters/sorting and ignores pagination for row selection.
Maximum 10,000 matches; larger results return 400 requesting narrower filters.
CSV/XLSX columns match the list: Option Name, Sort Order.
Formula-like names are escaped in exports without changing stored names.
View/column visibility and selection remain frontend state.

GET /api/options/form-options returns types as {value,label} pairs and defaults {type:"select",sortOrder:0}.

## Verification

Run npm run typecheck, npm run test:options, npm run build.
Tests use mocked repositories and TypeORM query generation without connecting to a database.
Database integration and frontend end-to-end tests require applying the SQL first.
