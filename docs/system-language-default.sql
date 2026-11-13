CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ROLLBACK;
BEGIN;

ALTER TABLE system_languages
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT FALSE;

-- Keep an existing default when present. Otherwise prefer English, then the
-- first enabled language by sort order.
WITH selected_default AS (
  SELECT id
  FROM system_languages
  ORDER BY
    "isDefault" DESC,
    CASE WHEN LOWER("languageName") = 'english' THEN 0 ELSE 1 END,
    status DESC,
    "sortOrder" ASC,
    "createdAt" ASC
  LIMIT 1
)
UPDATE system_languages AS language
SET
  "isDefault" = language.id = selected_default.id,
  status = CASE
    WHEN language.id = selected_default.id THEN TRUE
    ELSE language.status
  END
FROM selected_default;

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_system_languages_one_default"
  ON system_languages ("isDefault")
  WHERE "isDefault" = TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CHK_system_languages_default_enabled'
  ) THEN
    ALTER TABLE system_languages
      ADD CONSTRAINT "CHK_system_languages_default_enabled"
      CHECK (NOT "isDefault" OR status);
  END IF;
END $$;

COMMIT;
