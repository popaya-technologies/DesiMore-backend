CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clear a transaction left aborted by an earlier failed pgAdmin query.
ROLLBACK;

BEGIN;

-- Keep the old administration experience: these are ordinary editable names.
INSERT INTO stock_statuses (id, name, "createdAt", "updatedAt")
SELECT gen_random_uuid(), seed.name, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES ('2-3 Days'), ('In Stock'), ('Out Of Stock'), ('Pre-Order')
) AS seed(name)
WHERE NOT EXISTS (
  SELECT 1 FROM stock_statuses existing
  WHERE LOWER(existing.name) = LOWER(seed.name)
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS "stockStatusId" UUID;

UPDATE products AS product
SET "stockStatusId" = status.id
FROM stock_statuses AS status
WHERE product."stockStatusId" IS NULL
  AND LOWER(status.name) = CASE product."outOfStockStatus"
    WHEN '2_3_days' THEN '2-3 days'
    WHEN 'in_stock' THEN 'in stock'
    WHEN 'pre_order' THEN 'pre-order'
    ELSE 'out of stock'
  END;

UPDATE products AS product
SET "stockStatusId" = status.id
FROM stock_statuses AS status
WHERE product."stockStatusId" IS NULL
  AND LOWER(status.name) = 'out of stock';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM products WHERE "stockStatusId" IS NULL) THEN
    RAISE EXCEPTION 'Some products could not be assigned to a stock status.';
  END IF;
END $$;

ALTER TABLE products
  ALTER COLUMN "stockStatusId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_products_stock_status'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT "FK_products_stock_status"
      FOREIGN KEY ("stockStatusId")
      REFERENCES stock_statuses(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_products_stock_status_id"
  ON products ("stockStatusId");

COMMIT;
