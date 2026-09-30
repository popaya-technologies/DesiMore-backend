-- Run manually in pgAdmin. The application does not execute this script.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "customer_groups" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL UNIQUE CHECK (length(btrim("name")) > 0),
  "description" TEXT NOT NULL DEFAULT '',
  "approveNewCustomers" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0 CHECK ("sortOrder" >= 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
('customer-group:read', 'Read and export customer groups', 'customer-group', 'read'),
('customer-group:create', 'Create customer groups', 'customer-group', 'create'),
('customer-group:update', 'Update customer groups', 'customer-group', 'update'),
('customer-group:delete', 'Delete customer groups', 'customer-group', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
