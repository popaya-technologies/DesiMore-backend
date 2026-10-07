# Pages API

Run `docs/page-schema.sql` manually in pgAdmin in the existing application database before using these APIs. The backend does not create tables or run this script. Restart the development server or build and restart production after deployment.

All endpoints require the existing `accessToken` login cookie and the corresponding `page` permission (`read`, `create`, `update`, `delete`). Super admins already bypass permission checks. Assign the new permissions to other admin roles using the existing RBAC management.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/pages` | List, filter, sort and paginate |
| GET | `/api/pages/:id` | Get all fields for editing |
| POST | `/api/pages` | Create a page |
| PATCH / PUT | `/api/pages/:id` | Update supplied fields |
| DELETE | `/api/pages/:id` | Delete a page |
| GET | `/api/pages/export?format=csv` | CSV export; `format=xlsx` also supported |

Example create body:

```json
{
  "title": "About Us",
  "description": "<h2>Our story</h2><p>Welcome to DesiMore.</p>",
  "media": ["https://example.com/about.jpg", "/uploads/about.jpg"],
  "metaTagTitle": "About DesiMore",
  "metaTagDescription": "Learn about our story.",
  "metaTagKeywords": "desimore, about us",
  "bottom": "footer_about_us",
  "sortOrder": 0,
  "isActive": true,
  "slug": "about-us"
}
```

`title` (Information Title) and `slug` (Default store SEO Keyword) are required on create. The remaining fields default to empty strings, empty media, `bottom: "none"`, `sortOrder: 0`, and `isActive: true`. Use `bottom` values `footer_about_us`, `footer_consumer`, `footer_privacy`, `top_menu`, or `none`. Status uses a JSON boolean. Sort order is a nonnegative integer. Slugs use lowercase letters, digits, and single hyphens, with no spaces. The SQL registry enforces case-insensitive keyword uniqueness across pages and existing `seo_urls`, including concurrent writes. If existing SEO keywords have duplicates after trimming/lowercasing, resolve them before running the SQL; the script rolls back on a conflict.

Upload images first with existing `POST /api/uploads/image` (`file` or `image` multipart field) or `POST /api/uploads/images`, then place returned URLs in `media`. Page requests use JSON. Media supports HTTP(S), `/uploads/`, and `/catalog/` URLs. Updating media replaces the entire array; `[]` clears it. Deleting a page does not delete shared uploaded files. Rich text is sanitized to remove scripts and unsafe HTML.

List example: `/api/pages?search=about&date=2026-10-07&page=1&limit=10&sortBy=title&sortOrder=ASC`.

Filters: `search` matches title or slug; `date` filters creation date, or use `startDate`/`endDate` inclusively in `YYYY-MM-DD`. Date boundaries use the PostgreSQL session timezone. `isActive=true|false` and `bottom` are optional filters. `limit` is 1–100; page numbering starts at 1. Sort fields: `title`, `slug`, `sortOrder`, `isActive`, `createdAt`, `updatedAt`; direction: `ASC` or `DESC`. Default is newest first. List response: `{ "data": [...], "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 } }`.

Create returns 201 and the saved page; get/update return the page; delete returns a success message. Invalid input returns 400, missing login 401, missing permission 403, missing page 404, and conflicting slug 409. Exports accept the same filters and sorting, ignore pagination, and permit at most 10,000 matching pages.
