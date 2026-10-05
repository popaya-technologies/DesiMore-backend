-- Run manually in pgAdmin. The application does not execute this script.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "weight_classes" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "weightTitle" VARCHAR(100) NOT NULL UNIQUE CHECK (length(btrim("weightTitle")) > 0),
  "weightUnit" VARCHAR(32) NOT NULL UNIQUE CHECK (length(btrim("weightUnit")) > 0),
  "value" NUMERIC(20,8) NOT NULL DEFAULT 1 CHECK ("value" >= 0.00000001 AND "value" <= 999999999999),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IDX_weight_classes_createdAt" ON "weight_classes" ("createdAt");
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('weight-class:read', 'Read and export weight classes', 'weight-class', 'read'),
('weight-class:create', 'Create weight classes', 'weight-class', 'create'),
('weight-class:update', 'Update weight classes', 'weight-class', 'update'),
('weight-class:delete', 'Delete weight classes', 'weight-class', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
