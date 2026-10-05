# Backup & Restore API

No new database tables or automatic migrations are required. Run `backup-permissions.sql` manually in pgAdmin, then assign the desired `backup` permissions to admin roles using the existing role management. Super admins already bypass permission checks.

Use the existing `accessToken` cookie for authentication. Permissions are separate: `backup:read` lists tables, `backup:export` downloads data, and `backup:restore` replaces data and reads restore progress.

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/backup/tables` | Populate table checkboxes |
| POST | `/api/backup/export` | Download selected table data |
| POST | `/api/backup/restore` | Upload backup and start restore |
| GET | `/api/backup/restore/:id` | Poll restore progress |

## Backup tab

`GET /api/backup/tables` discovers existing ordinary tables in the PostgreSQL `public` schema, including join tables. No table names are hardcoded. It excludes partitioned/inherited tables, row security tables, views and foreign tables.

```json
{
  "data": [{ "name": "products", "schema": "public", "dependencies": ["public.categories"], "referencedBy": ["public.product_images"] }],
  "meta": { "total": 1, "format": "desimore-backup", "version": 1, "maxFileBytes": 52428800 }
}
```

Select All / Unselect All operate on this list in the frontend. Send the selected names:

```http
POST /api/backup/export
Content-Type: application/json

{"tables":["length_classes","weight_classes"]}
```

Download the response as a file using its `Content-Disposition` filename. The versioned JSON backup contains column metadata and PostgreSQL text values, preserving decimal precision, large integers, binary data, arrays, JSON and timestamps. Export uses one read-only repeatable-read transaction for a consistent snapshot. A maximum of 500 tables, 100000 total rows and 50 MB is supported. Narrow the selection if a limit is exceeded.

The file contains database data only. Schema definitions, indexes, functions, permissions granted to database roles, uploaded images and other filesystem assets are not included. PostgreSQL/MySQL SQL dumps and old-site backups cannot be imported by this endpoint. Use this API's exports, and restore against an existing matching schema. For larger databases or schema-level backups use pgAdmin's native backup tools.

## Restore tab

The Import button selects the downloaded JSON file. Send multipart form data:

```js
const form = new FormData();
form.append("file", selectedFile);
form.append("confirm", "RESTORE");
const response = await fetch("/api/backup/restore", {
  method: "POST", credentials: "include", body: form
});
const job = await response.json();
```

The frontend should tell the administrator that restore replaces existing rows in every uploaded table before sending `confirm=RESTORE`. The API returns HTTP 202 with `id`, `status: "queued"`, `progress: 0`, `completedTables`, `totalTables`, `restoredRows` and `createdAt`.

Poll `/api/backup/restore/<id>` once per second. Update the bar from `progress`; stop polling when `status` is `completed` or `failed`. Show `message` and refresh the admin data after completion. Progress reaches 100 only after the transaction commits. On failure, changes roll back and counters reset to zero. Check HTTP status before downloading or displaying success.

Restore validates every table and its writable column names/types against the current database. Values are parameters; uploaded SQL is never executed. Generated columns are recalculated and explicit identity values are retained. Existing constraints and triggers remain active. Owned identity/serial sequences restart after restored IDs in the same transaction.

All tables that reference a table being replaced must also be present in the file, even if empty. Use `referencedBy` to help select them; selecting all supported tables is easiest. External-schema references, unsupported dependent tables and non-deferrable FK cycles may prevent restore. Deferrable FK cycles and self references are supported. Missing schema, invalid rows or constraint failures leave the tables unchanged.

Restore holds exclusive locks on the selected tables; use a maintenance window for production restores. The configured database role needs table SELECT/INSERT/TRUNCATE privileges and ownership of restored sequences. SQL statements have a 60-second timeout and lock acquisition a 5-second timeout.

Jobs are held in process memory for up to one hour (maximum 20). There are no persistent job tables. For multiple application instances, route upload and polling to the same instance using sticky routing. Restarting the server loses job status; an interrupted transaction rolls back. A database advisory lock prevents simultaneous restores across instances. Only the job creator or a super admin can read its status, and both need restore permission.

Validation returns 400; oversized files return 413; authentication returns 401; missing permission returns 403; missing/other-owner jobs return 404; a running restore returns 409. A job's SQL/schema failure is reported as `status: "failed"` in the progress response.

Database backups can include user records, password hashes, tokens and configuration; restrict export and restore permission to trusted administrators and store downloaded files securely.

PostgreSQL references: [TRUNCATE transaction behavior](https://www.postgresql.org/docs/current/sql-truncate.html), [transactional sequence restart](https://www.postgresql.org/docs/current/sql-altersequence.html), [JSON record conversion](https://www.postgresql.org/docs/current/functions-json.html).
