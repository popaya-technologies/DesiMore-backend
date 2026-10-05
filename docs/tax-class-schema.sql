-- Run manually in pgAdmin. No application code executes this script.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL UNIQUE CHECK (length(btrim("name")) > 0),
  "rate" NUMERIC(12,4) NOT NULL CHECK ("rate" >= 0),
  "type" VARCHAR(20) NOT NULL DEFAULT 'percentage' CHECK ("type" IN ('percentage','fixed')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "tax_classes" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" VARCHAR(255) NOT NULL UNIQUE CHECK (length(btrim("title")) > 0),
  "description" TEXT NOT NULL CHECK (length(btrim("description")) > 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS "tax_class_rules" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "taxClassId" UUID NOT NULL REFERENCES "tax_classes"("id") ON DELETE CASCADE,
  "taxRateId" UUID NOT NULL REFERENCES "tax_rates"("id") ON DELETE RESTRICT,
  "basedOn" VARCHAR(20) NOT NULL DEFAULT 'shipping' CHECK ("basedOn" IN ('shipping','payment','store')),
  "priority" INTEGER NOT NULL DEFAULT 1 CHECK ("priority" >= 0),
  CONSTRAINT "UQ_tax_class_rule_rate_basis" UNIQUE ("taxClassId", "taxRateId", "basedOn")
);
CREATE INDEX IF NOT EXISTS "IDX_tax_class_rules_class" ON "tax_class_rules" ("taxClassId");
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('tax-class:read', 'Read tax classes and rate dropdown', 'tax-class', 'read'),
('tax-class:create', 'Create tax classes and rates', 'tax-class', 'create'),
('tax-class:update', 'Update tax classes', 'tax-class', 'update'),
('tax-class:delete', 'Delete tax classes', 'tax-class', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
