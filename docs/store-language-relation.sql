ROLLBACK;
BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS "languageId" UUID;

UPDATE stores AS store
SET "languageId" = language.id
FROM system_languages AS language
WHERE store."languageId" IS NULL
  AND ( 
    LOWER(TRIM(store.language)) = LOWER(TRIM(language."languageName"))
    OR LOWER(TRIM(store.language)) = LOWER(TRIM(language.code))
  );

UPDATE stores AS store
SET "languageId" = language.id
FROM system_languages AS language
WHERE store."languageId" IS NULL
  AND language."isDefault" = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM stores WHERE "languageId" IS NULL) THEN
    RAISE EXCEPTION 'Some stores could not be assigned to a language. Create a default language first.';
  END IF;
END $$;

ALTER TABLE stores
  ALTER COLUMN "languageId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_stores_system_language'
  ) THEN
    ALTER TABLE stores
      ADD CONSTRAINT "FK_stores_system_language"
      FOREIGN KEY ("languageId")
      REFERENCES system_languages(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_stores_language_id"
  ON stores ("languageId");

COMMIT;
