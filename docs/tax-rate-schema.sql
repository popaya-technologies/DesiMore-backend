-- Run manually in pgAdmin. Requires existing customer_groups and geo_zones tables.
-- Compatible with the earlier Tax Classes schema; existing rates are preserved.
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
ALTER TABLE "tax_rates" ADD COLUMN IF NOT EXISTS "geoZoneId" UUID;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_tax_rates_geo_zone' AND conrelid = 'tax_rates'::regclass) THEN
    ALTER TABLE "tax_rates" ADD CONSTRAINT "FK_tax_rates_geo_zone"
      FOREIGN KEY ("geoZoneId") REFERENCES "geo_zones"("id") ON DELETE RESTRICT;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "tax_rate_customer_groups" (
  "taxRateId" UUID NOT NULL REFERENCES "tax_rates"("id") ON DELETE CASCADE,
  "customerGroupId" UUID NOT NULL REFERENCES "customer_groups"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("taxRateId", "customerGroupId")
);
CREATE INDEX IF NOT EXISTS "IDX_tax_rates_geo_zone" ON "tax_rates" ("geoZoneId");
CREATE INDEX IF NOT EXISTS "IDX_tax_rate_customer_group" ON "tax_rate_customer_groups" ("customerGroupId");
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('tax-rate:read', 'Read and export tax rates and form options', 'tax-rate', 'read'),
('tax-rate:create', 'Create tax rates', 'tax-rate', 'create'),
('tax-rate:update', 'Update tax rates', 'tax-rate', 'update'),
('tax-rate:delete', 'Delete tax rates', 'tax-rate', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
