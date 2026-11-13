BEGIN;

ALTER TABLE order_statuses
  ADD COLUMN IF NOT EXISTS code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS color VARCHAR(7) NOT NULL DEFAULT '#64748b',
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE orders
  ALTER COLUMN status TYPE VARCHAR(100);

-- Give existing rows stable URL-safe codes. A short UUID suffix resolves names
-- that differ only by spaces, punctuation, or letter case.
WITH generated AS (
  SELECT
    id,
    COALESCE(
      NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''),
      'status'
    ) AS base_code,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(name), '[^a-z0-9]+', '-', 'g')), ''),
        'status'
      )
      ORDER BY "createdAt", id
    ) AS duplicate_number
  FROM order_statuses
  WHERE code IS NULL OR LENGTH(TRIM(code)) = 0
)
UPDATE order_statuses AS target
SET code = CASE
  WHEN generated.duplicate_number = 1 THEN generated.base_code
  ELSE generated.base_code || '-' || SUBSTRING(target.id::text, 1, 8)
END
FROM generated
WHERE target.id = generated.id;

-- Make legacy names unique without deleting any existing record.
WITH duplicate_names AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY LOWER(name) ORDER BY "createdAt", id) AS duplicate_number
  FROM order_statuses
)
UPDATE order_statuses AS target
SET name = target.name || ' (' || SUBSTRING(target.id::text, 1, 8) || ')'
FROM duplicate_names
WHERE target.id = duplicate_names.id
  AND duplicate_names.duplicate_number > 1;

INSERT INTO order_statuses
  (id, name, code, color, "sortOrder", "isActive", "isSystem", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(), seed.name, seed.code, seed.color, seed.sort_order,
  TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  VALUES
    ('Pending',    'pending',    '#eab308', 1),
    ('Confirmed',  'confirmed',  '#3b82f6', 2),
    ('Processing', 'processing', '#f97316', 3),
    ('Shipped',    'shipped',    '#8b5cf6', 4),
    ('Delivered',  'delivered',  '#22c55e', 5),
    ('Cancelled',  'cancelled',  '#ef4444', 6),
    ('Refunded',   'refunded',   '#64748b', 7)
) AS seed(name, code, color, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM order_statuses existing
  WHERE LOWER(existing.name) = LOWER(seed.name)
     OR LOWER(existing.code) = LOWER(seed.code)
);

UPDATE order_statuses
SET
  "isSystem" = TRUE,
  color = CASE code
    WHEN 'pending' THEN '#eab308'
    WHEN 'confirmed' THEN '#3b82f6'
    WHEN 'processing' THEN '#f97316'
    WHEN 'shipped' THEN '#8b5cf6'
    WHEN 'delivered' THEN '#22c55e'
    WHEN 'cancelled' THEN '#ef4444'
    WHEN 'refunded' THEN '#64748b'
    ELSE color
  END,
  "sortOrder" = CASE code
    WHEN 'pending' THEN 1
    WHEN 'confirmed' THEN 2
    WHEN 'processing' THEN 3
    WHEN 'shipped' THEN 4
    WHEN 'delivered' THEN 5
    WHEN 'cancelled' THEN 6
    WHEN 'refunded' THEN 7
    ELSE "sortOrder"
  END
WHERE code IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- Preserve an existing default. For a first-time setup, Pending is the default.
UPDATE order_statuses
SET "isDefault" = TRUE,
    "isActive" = TRUE
WHERE code = 'pending'
  AND NOT EXISTS (
    SELECT 1 FROM order_statuses WHERE "isDefault" = TRUE
  );

-- Repair legacy data if more than one row was marked as default.
WITH ranked_defaults AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "sortOrder", "createdAt", id) AS default_number
  FROM order_statuses
  WHERE "isDefault" = TRUE
)
UPDATE order_statuses AS target
SET "isDefault" = FALSE
FROM ranked_defaults
WHERE target.id = ranked_defaults.id
  AND ranked_defaults.default_number > 1;

UPDATE order_statuses
SET "isActive" = TRUE
WHERE "isDefault" = TRUE;

ALTER TABLE order_statuses
  ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_order_statuses_code_ci"
  ON order_statuses (LOWER(code));

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_order_statuses_name_ci"
  ON order_statuses (LOWER(name));

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_order_statuses_single_default"
  ON order_statuses ("isDefault")
  WHERE "isDefault" = TRUE;

ALTER TABLE order_statuses
  DROP CONSTRAINT IF EXISTS "CHK_order_statuses_code_format";

ALTER TABLE order_statuses
  ADD CONSTRAINT "CHK_order_statuses_code_format"
  CHECK (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE order_statuses
  DROP CONSTRAINT IF EXISTS "CHK_order_statuses_color_format";

ALTER TABLE order_statuses
  ADD CONSTRAINT "CHK_order_statuses_color_format"
  CHECK (color ~ '^#[0-9a-fA-F]{6}$');

ALTER TABLE order_statuses
  DROP CONSTRAINT IF EXISTS "CHK_order_statuses_sort_order";

ALTER TABLE order_statuses
  ADD CONSTRAINT "CHK_order_statuses_sort_order"
  CHECK ("sortOrder" >= 0);

COMMIT;
