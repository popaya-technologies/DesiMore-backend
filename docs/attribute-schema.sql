-- Run ONCE in pgAdmin Query Tool against the existing application database.
-- Manual installation only: no migration or database changes are run by the code.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE "attribute_groups" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO "attribute_groups" ("id", "name", "sortOrder")
VALUES ('b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc', 'Product', 0);

CREATE TABLE "attributes" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL,
  "attributeGroupId" UUID NOT NULL DEFAULT 'b72874ef-2e3e-4a3c-8c9c-f01e19ad21dc',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "UQ_attribute_group_name" UNIQUE ("attributeGroupId", "name"),
  CONSTRAINT "FK_attribute_group" FOREIGN KEY ("attributeGroupId")
    REFERENCES "attribute_groups" ("id") ON DELETE RESTRICT
);

INSERT INTO "permissions" (
  "id", "name", "description", "resource", "action", "createdAt", "updatedAt"
)
SELECT uuid_generate_v4(), 'attribute:' || actions.action,
  'Manage attributes: ' || actions.action, 'attribute', actions.action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p
  WHERE p."resource" = 'attribute' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
