-- Run manually in pgAdmin against the application's database before using the API.
-- This script is not executed by application startup.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS "order_history" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "status" VARCHAR(50) NOT NULL,
  "comment" TEXT NOT NULL DEFAULT '',
  "carrierName" VARCHAR(255),
  "trackingNumber" VARCHAR(255),
  "customerNotified" BOOLEAN NOT NULL DEFAULT false,
  "override" BOOLEAN NOT NULL DEFAULT false,
  "createdBy" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "IDX_order_history_order" ON "order_history" ("orderId", "createdAt");
CREATE TABLE IF NOT EXISTS "cancelled_order_archives" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "orderId" UUID NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE RESTRICT,
  "createdBy" UUID,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO "permissions" ("name", "description", "resource", "action") VALUES
  ('cancelled-order:read', 'Read cancelled orders', 'cancelled-order', 'read'),
  ('cancelled-order:update', 'Add cancelled order history', 'cancelled-order', 'update'),
  ('cancelled-order:delete', 'Archive cancelled orders', 'cancelled-order', 'delete')
ON CONFLICT ("name") DO NOTHING;
COMMIT;
