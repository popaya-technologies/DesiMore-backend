BEGIN;

ALTER TABLE order_history
  ADD COLUMN IF NOT EXISTS "previousStatus" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "createdByName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "createdByAccountType" VARCHAR(30);

ALTER TABLE order_history
  ALTER COLUMN status TYPE VARCHAR(100);

CREATE INDEX IF NOT EXISTS "IDX_order_history_order_created"
  ON order_history ("orderId", "createdAt" DESC);

COMMIT;
