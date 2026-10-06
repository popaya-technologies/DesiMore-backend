# Admin Error Log

Admin page: `/dashboard/error-logs` under System. Matches the existing theme and provides a read-only scrollable viewer, refresh, download, and clear confirmation.

API endpoints:

- `GET /api/error-logs`: `{ content, size, updatedAt, truncated }`. Shows the last 1 MiB, starting at a line boundary. `size` is the full retained file size in bytes.
- `GET /api/error-logs/download`: all retained entries as a UTF-8 `.log` attachment.
- `DELETE /api/error-logs`: body `{ confirm: "CLEAR" }`. Clears the log and returns empty viewer metadata. Writes after the clear remain recorded.

Authentication and separate `error-log/read` and `error-log/delete` permissions are required. Existing super users retain their bypass. The seed includes read/delete permissions for admin roles; existing installations can grant them through the existing RBAC APIs. No database changes or seed execution are performed automatically.

`server.ts` installs persistent capture for the application's existing `console.error` and `console.warn` calls while preserving console output. Unhandled Express request errors are passed to an error middleware; server failures are logged with generic client responses. No process exception handlers are installed and normal crash behavior is preserved.

Storage defaults to `logs/error.log` outside public asset directories. Override with `ERROR_LOG_FILE`. Do not configure it inside a publicly served folder. New files use mode 0600 where supported. Stored entries include UTC timestamps and error stack traces. Common credential keys, bearer values, and JWTs are redacted. Custom text may still contain application-specific sensitive information; restrict log access to trusted admins.

The retained file is bounded to 5 MiB and individual entries to 16 KiB. Oldest lines are discarded at the retention limit. Read, append, download, and clear are serialized within one server process. Multi-process deployments need an external centralized logger or separate per-process paths. Log history predating this implementation is not imported from terminal output.

After deployment, restart the backend to enable persistent capture. No database migration is needed.

Tests: `node --test --test-isolation=none -r ts-node/register tests/error-log-api.test.js`. These use temporary files and mocked authentication/RBAC, without a real database connection.
