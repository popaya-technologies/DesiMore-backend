-- Manual pgAdmin installation only. No SQL is executed by the application.
-- Compatible with the attribute_groups table in the earlier Attributes SQL.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "attribute_groups" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "attribute_groups" ("id", "name", "sortOrder")
VALUES ('b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc', 'Product', 0)
ON CONFLICT DO NOTHING;

INSERT INTO "permissions" (
  "id", "name", "description", "resource", "action", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(), 'attribute-group:' || actions.action,
  'Manage attribute groups: ' || actions.action,
  'attribute-group', actions.action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p
  WHERE p."resource" = 'attribute-group' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
