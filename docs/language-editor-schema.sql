-- Execute once in pgAdmin against the EXISTING application database.
-- No automatic migration is added. Do not rerun if this table already exists.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "language_translations" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "store" VARCHAR(100) NOT NULL DEFAULT 'Default',
  "language" VARCHAR(50) NOT NULL DEFAULT 'English',
  "route" VARCHAR(255) NOT NULL,
  "key" VARCHAR(255) NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "UQ_language_translation_scope"
    UNIQUE ("store", "language", "route", "key")
);

INSERT INTO "permissions" (
  "id", "name", "description", "resource", "action", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(),
  'language-editor:' || actions.action,
  'Manage translations: ' || actions.action,
  'language-editor', actions.action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p
  WHERE p."resource" = 'language-editor' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
