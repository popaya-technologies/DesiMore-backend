-- Run manually in pgAdmin. The application does not execute this script.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "length_classes" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "lengthTitle" VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim("lengthTitle")) > 0),
  "lengthUnit" VARCHAR(32) NOT NULL UNIQUE CHECK (length(btrim("lengthUnit")) > 0),
  "value" NUMERIC(20,8) NOT NULL DEFAULT 1 CHECK ("value" >= 0.00000001 AND "value" <= 999999999999),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IDX_length_classes_createdAt" ON "length_classes" ("createdAt");
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('length-class:read', 'Read and export length classes', 'length-class', 'read'),
('length-class:create', 'Create length classes', 'length-class', 'create'),
('length-class:update', 'Update length classes', 'length-class', 'update'),
('length-class:delete', 'Delete length classes', 'length-class', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
