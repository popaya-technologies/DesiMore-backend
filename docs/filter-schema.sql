-- Execute once in pgAdmin against the existing application database.
-- No migration or database initialization runs this SQL automatically.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "filter_groups" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL UNIQUE,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "values" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "permissions" (
    "id", "name", "description", "resource", "action", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(), 'filter:' || actions.action,
    'Manage filter groups: ' || actions.action,
    'filter', actions.action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
    SELECT 1 FROM "permissions" p
    WHERE p."resource" = 'filter' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
