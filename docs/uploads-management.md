# Admin Uploads

The `/dashboard/uploads` page manages image files stored by the existing `/api/uploads/image` and `/api/uploads/images` routes. It does not manage product downloads or remote Cloudinary assets. No database migration is required.

- `GET /api/uploads`: `page` (default 1), `limit` (default 10, maximum 100), `name` (case-insensitive substring), `date` (`YYYY-MM-DD`, UTC).
- Returns `{ data: [{ id, name, createdAt, no }], meta: { total, page, limit, totalPages } }`, newest first. IDs are server-generated filenames. Names are the sanitized original filenames without the UUID prefix.
- Date Added uses the stored file's creation time. For copied/restored files this may differ from the original upload date.
- `DELETE /api/uploads/bulk`: JSON `{ ids: string[] }`, 1–100 unique IDs. Returns `{ deletedCount }`. Every file is validated before changing the batch. Moving failures roll back already moved files.
- Both routes require authentication plus the `upload/read` or `upload/delete` permission. Super users retain their existing bypass. Seed definitions include these permissions for the admin role; existing installations can grant them using the existing role/permission APIs. No seed or database mutation is run automatically.
- Delete removes files from the list and public URL by moving them into `UPLOAD_DIR/.admin-deleted`. Express static serving ignores dot directories. The existing image upload API responses remain unchanged. Files may be referenced by products, recipes, or banners; the confirmation explains this impact.
- Only UUID-prefixed image files created by the existing uploader are managed. Arbitrary files, directories, symlinks, private downloads, and paths outside the upload directory are excluded.

Validation: `node --test --test-isolation=none -r ts-node/register tests/upload-management-api.test.js`.
