-- Run manually in pgAdmin. No new tables are required for Backup & Restore.
BEGIN;
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('backup:read', 'List database tables for backup', 'backup', 'read'),
('backup:export', 'Download selected database table backups', 'backup', 'export'),
('backup:restore', 'Replace table data from a backup and view restore progress', 'backup', 'restore')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
