-- Run manually in pgAdmin. This script is not executed by the application.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "return_statuses" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim("name")) > 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('return-status:read', 'Read and export return statuses', 'return-status', 'read'),
('return-status:create', 'Create return statuses', 'return-status', 'create'),
('return-status:update', 'Update return statuses', 'return-status', 'update'),
('return-status:delete', 'Delete return statuses', 'return-status', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
