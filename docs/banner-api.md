# Banner API

Supports the supplied admin Banner list and Add/Edit Banner screens.
Only Banner code and app route registration are added; uploads reuse the existing image API.

## Database setup in pgAdmin

Open Query Tool for your existing application database and run [banner-schema.sql](banner-schema.sql)
once, OR use `npm run migration:run`.
The SQL adds the banners table, four banner permissions, and the migration history entry.
It assumes your existing permissions and migrations tables.
The application database has not been modified by this implementation.

Slides are stored as a JSONB array on each banner, so banner and slides save atomically.
No separate slide table is required.

## Authentication and endpoints

Use the existing accessToken cookie. All endpoints are admin APIs protected by the indicated
banner permission. Super-admin (su) bypasses RBAC; assign permissions to other staff via existing RBAC.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/banners | banner:create |
| GET | /api/banners | banner:read |
| GET | /api/banners/:id | banner:read |
| PATCH | /api/banners/:id | banner:update |
| PUT | /api/banners/:id | banner:update |
| DELETE | /api/banners/:id | banner:delete |
| GET | /api/banners/export?format=csv | banner:read |
| GET | /api/banners/export?format=xlsx | banner:read |

PUT and PATCH both accept partial updates, consistent with the existing admin editing pattern.
No public storefront endpoint is added in this admin-only scope.

## Create request (JSON)

```json
{
  "name": "Homepage Offers",
  "isActive": true,
  "slides": [
    {
      "title": "Shop our latest products",
      "link": "/products",
      "image": "/uploads/your-uploaded-image.jpg",
      "sortOrder": 0
    },
    {
      "title": "Special offer",
      "link": "https://example.com/offers",
      "image": "https://example.com/banner.jpg",
      "sortOrder": 1
    }
  ]
}
```

- name: required, nonblank string, up to 255 characters; trimmed.
- isActive: optional boolean, defaults true. Send true/false, not Enabled/Disabled.
- slides: required, 1–100 slides; each slide requires a nonblank image.
- title: optional string, up to 255 characters, defaults empty.
- link: optional string, up to 2048 characters, defaults empty (no click destination).
  Supports HTTP(S) and site-relative paths such as /products; rejects unsafe schemes,
  protocol-relative URLs and URLs with embedded credentials.
- image: HTTP(S) URL or existing /uploads/ or /catalog/ path, up to 2048 characters.
- sortOrder: optional integer 0–2147483647, defaults 0. Send a number, not a string.
- Unknown keys, null values, invalid URLs and malformed UUIDs are rejected.
- Banner names need not be unique.

Image upload: POST /api/uploads/image using multipart file or image, then use the returned URL/path
in slides[].image. Existing upload limits and authentication apply; no uploader changes are made.

The response contains id, name, isActive, slides, slideCount, createdAt and updatedAt.
Slides are returned in ascending sortOrder, preserving input order for ties.

When editing, omitted properties remain unchanged. A supplied slides array replaces the entire
collection; send the full desired set. Slides have no individual IDs. At least one slide must remain.
To disable a banner, send only:
```json
{ "isActive": false }
```
Delete removes the banner and its stored slides, but does not delete image files.

## Listing, filters, pagination and export

Example:
```text
GET /api/banners?search=home&isActive=true&page=1&limit=10&sortBy=name&sortOrder=ASC
```

| Query | Meaning |
|---|---|
| search | Case-insensitive literal substring of banner name |
| date | Creation date YYYY-MM-DD |
| startDate, endDate | Inclusive creation-date range; cannot combine with date |
| isActive | true or false |
| page | Positive integer, defaults 1 |
| limit | 1–100, defaults 10 |
| sortBy | name, isActive, createdAt; defaults createdAt |
| sortOrder | ASC or DESC; defaults DESC |

Date filters compare stored createdAt timestamps to calendar-day boundaries.
Ties use ID for stable pagination.
Response:
```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
}
```

Export accepts the same filters and sorting, ignoring page/limit for row selection.
Exports all matches up to 10,000 banners; larger results return 400 asking for narrower filters.
CSV/XLSX columns: Banner Name, Slides (count), Status, Created At.
Spreadsheet formula-like names are escaped in exports.
The table's View/column settings and selected-row state remain frontend concerns.

## Testing

```powershell
npm run typecheck
$env:BANNER_TEST_DATABASE_URL = 'postgresql://postgres@127.0.0.1:55439/desimore_banner_test'
npm run test:banners
npm run build
```

Tests require an isolated database named desimore_banner_test and clear only that database.
