-- pgAdmin: run once in the EXISTING application database.
-- Use this SQL OR the TypeORM migration, not both.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE "banners" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" varchar(255) NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "slides" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
INSERT INTO "permissions" ("id", "name", "description", "resource", "action", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), 'banner:' || action, 'Manage banners: ' || action, 'banner', action, now(), now()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM "permissions" p WHERE p."resource" = 'banner' AND p."action" = actions.action
)
ON CONFLICT ("name") DO NOTHING;
INSERT INTO "migrations" ("timestamp", "name")
SELECT 1790553600000, 'CreateBanners1790553600000'
WHERE NOT EXISTS (SELECT 1 FROM "migrations" WHERE "name" = 'CreateBanners1790553600000');
COMMIT;
