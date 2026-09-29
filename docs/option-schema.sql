-- Run once in pgAdmin against your EXISTING application database.
-- This script is NOT automatically executed by the backend.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE "options" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "type" VARCHAR(20) NOT NULL DEFAULT 'select',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "values" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO "permissions" (
  "id", "name", "description", "resource", "action", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(), 'option:' || actions.action,
  'Manage catalog options: ' || actions.action, 'option', actions.action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p
  WHERE p."resource" = 'option' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
