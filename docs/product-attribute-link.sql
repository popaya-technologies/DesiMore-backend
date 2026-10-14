-- Run manually against the intended PostgreSQL database before deploying the
-- backend code. Take a backup first. This is intentionally not a migration.
BEGIN;

ALTER TABLE "product_attributes"
  ADD COLUMN IF NOT EXISTS "attributeId" uuid;

-- Backfill only names that identify exactly one master attribute. Rows whose
-- names are missing or ambiguous remain NULL and continue to work as legacy data.
WITH unique_attributes AS (
  SELECT lower(btrim(name)) AS normalized_name, (array_agg(id ORDER BY id))[1] AS id
  FROM attributes
  GROUP BY lower(btrim(name))
  HAVING count(*) = 1
)
UPDATE product_attributes pa
SET "attributeId" = ua.id
FROM unique_attributes ua
WHERE pa."attributeId" IS NULL
  AND lower(btrim(pa.name)) = ua.normalized_name;

ALTER TABLE "product_attributes"
  DROP CONSTRAINT IF EXISTS "FK_product_attributes_attribute";
ALTER TABLE "product_attributes"
  ADD CONSTRAINT "FK_product_attributes_attribute"
  FOREIGN KEY ("attributeId") REFERENCES attributes(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS "IDX_product_attributes_attribute"
  ON product_attributes ("attributeId");
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_product_attributes_product_attribute"
  ON product_attributes ("productId", "attributeId")
  WHERE "attributeId" IS NOT NULL;

COMMIT;

-- Review legacy rows after the transaction. Resolve them by selecting the right
-- attributes.id and updating product_attributes."attributeId" manually.
SELECT id, "productId", name
FROM product_attributes
WHERE "attributeId" IS NULL
ORDER BY "productId", "sortOrder", id;
