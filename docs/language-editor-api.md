# Language Editor API

Run [language-editor-schema.sql](language-editor-schema.sql) once in pgAdmin against the existing application database.
No automatic migration is added and no database changes are executed by this implementation.
If you already installed the same table earlier, do not recreate it.

## Endpoints

All endpoints use the existing accessToken cookie and permissions below. Super-admin (su)
bypasses permission checks; assign permissions to other staff using existing RBAC.

| Method | Endpoint | Permission |
|---|---|---|
| POST | /api/language-editor | language-editor:create |
| GET | /api/language-editor | language-editor:read |
| GET | /api/language-editor/:id | language-editor:read |
| PATCH or PUT | /api/language-editor/:id | language-editor:update |
| DELETE | /api/language-editor/:id | language-editor:delete |
| DELETE | /api/language-editor/bulk | language-editor:delete |
| GET | /api/language-editor/form-options | language-editor:read |
| GET | /api/language-editor/export?format=csv | language-editor:read |
| GET | /api/language-editor/export?format=xlsx | language-editor:read |

## Create/edit

```json
{
  "store": "Default",
  "language": "English",
  "route": "common/home",
  "key": "heading_title",
  "value": "Welcome to our store"
}
```

- store: optional on create, defaults Default; nonblank string, max 100 characters.
- language: optional on create, defaults English; nonblank string, max 50 characters.
- route/key: required on create, nonblank strings, max 255 characters each.
- value: required string, max 20,000 characters. Empty string intentionally blanks a translation.
- Store/language/route/key are trimmed, case-sensitive, and cannot contain control characters.
- Value preserves Unicode, placeholders, whitespace and newlines. Null characters are rejected.
- Store and language are text labels; the project has no separate registry for them.
- Unknown keys and null values are rejected.
- Store + language + route + key must be unique; duplicates return 409.
- PATCH and PUT both update only supplied fields. Empty update objects return 400.
- Response: id, store, language, route, key, value, createdAt, updatedAt.
- Create returns 201; reads/updates/deletes return 200. Missing IDs return 404.
- Render values as text in the frontend, not injected HTML.

The form-options endpoint returns distinct stored labels plus Default and English:
```json
{
  "stores": ["Default"],
  "languages": ["English"],
  "defaults": { "store": "Default", "language": "English" }
}
```

## List

Query parameters:
- search: case-insensitive literal substring across all five fields, max 255 characters.
- store, language, route, key: exact filters.
- date: createdAt calendar date, YYYY-MM-DD.
- startDate/endDate: inclusive createdAt date range; cannot combine with date.
- page: positive integer, default 1; limit: 1–100, default 10.
- sortBy: store, language, route, key, value, createdAt, updatedAt; default createdAt.
- sortOrder: ASC/DESC, default DESC. ID breaks ties for stable pagination.

Example: GET /api/language-editor?search=welcome&language=English&page=1&limit=10

```json
{
  "data": [],
  "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
}
```

## Bulk delete

DELETE /api/language-editor/bulk with JSON:
```json
{ "ids": ["11111111-1111-4111-8111-111111111111"] }
```

Requires 1–100 unique UUIDs. All IDs are checked inside a transaction before deletion;
missing IDs return 404 and nothing is deleted. Success includes deletedCount.
For Axios DELETE, provide the body through the data option.

## Export and scope

CSV/XLSX export applies listing filters/sorting and ignores pagination for row selection.
It exports Store, Language, Route, Key, Value. Maximum 10,000 matching rows;
narrow the filters if the limit is exceeded. Formula-like values are escaped for spreadsheets
without changing the stored translation.
View/column settings and selected rows are frontend state.
This is the admin translation editor only; it does not automatically translate other pages,
change storefront routes or replace strings in existing modules.

## Verification

Run npm run typecheck, npm run test:language-editor, and npm run build.
Tests use mocked repositories and real TypeORM metadata/query generation without connecting
to a database. SQL execution and database integration require your manual table installation.
