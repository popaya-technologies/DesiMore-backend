# Weight class API

Run [weight-class-schema.sql](weight-class-schema.sql) manually in pgAdmin before using these endpoints. No automatic table creation or migration was added.

All endpoints require the existing authentication token (`Authorization: Bearer <token>`). Super admins have access; other admins need the corresponding `weight-class` read/create/update/delete permissions assigned through existing role management. The SQL script inserts permission definitions but does not assign them to roles.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/weight-classes` | Create |
| GET | `/api/weight-classes` | List |
| GET | `/api/weight-classes/:id` | Get one |
| PUT / PATCH | `/api/weight-classes/:id` | Update supplied fields |
| DELETE | `/api/weight-classes/:id` | Delete one |
| DELETE | `/api/weight-classes/bulk` | Delete selected rows with `{ "ids": ["uuid", "uuid"] }` |
| GET | `/api/weight-classes/export?format=csv` | Export filtered rows; `xlsx` also supported |

Create request:

```json
{ "weightTitle": "Kilogram", "weightUnit": "kg", "value": 1 }
```

Title and unit are required, trimmed, and individually unique (case sensitive). Title allows 100 characters and unit allows 32. Value is a JSON number greater than zero, with at most 8 decimal places and a maximum of 999999999999. Omitted value defaults to 1 on creation. PATCH/PUT require at least one supported field; omitted fields retain their values. IDs are UUIDs.

List example: `/api/weight-classes?search=kg&page=1&limit=10&sortBy=weightTitle&sortOrder=ASC`.

List response:

```json
{
  "data": [{ "id": "uuid", "weightTitle": "Kilogram", "weightUnit": "kg", "value": 1, "no": 1, "createdAt": "timestamp", "updatedAt": "timestamp" }],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}
```

Search matches title or unit. Filter creation dates using `date=YYYY-MM-DD` or `startDate`/`endDate` (inclusive). Sort fields: `weightTitle`, `weightUnit`, `value`, `createdAt`, `updatedAt`; directions: `ASC`, `DESC`. Page defaults to 1; limit defaults to 10 and allows 1–100. Exports accept the same filters/sorting and include all matching rows up to 10,000, independently of pagination. Bulk deletion allows 1–100 distinct IDs and deletes nothing if any ID is missing.

Validation returns 400, missing authentication 401, insufficient permission 403, missing records 404, and duplicate/in-use records 409.
