ROLLBACK;
BEGIN;

ALTER TABLE language_translations
  ADD COLUMN IF NOT EXISTS "languageId" UUID;

UPDATE language_translations AS translation
SET "languageId" = language.id
FROM system_languages AS language
WHERE translation."languageId" IS NULL
  AND (
    LOWER(TRIM(translation.language)) = LOWER(TRIM(language."languageName"))
    OR LOWER(TRIM(translation.language)) = LOWER(TRIM(language.code))
  );

UPDATE language_translations AS translation
SET "languageId" = language.id
FROM system_languages AS language
WHERE translation."languageId" IS NULL
  AND language."isDefault" = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM language_translations WHERE "languageId" IS NULL) THEN
    RAISE EXCEPTION 'Some translations could not be assigned to a language. Create a default language first.';
  END IF;
END $$;

ALTER TABLE language_translations
  ALTER COLUMN "languageId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_language_translations_system_language'
  ) THEN
    ALTER TABLE language_translations
      ADD CONSTRAINT "FK_language_translations_system_language"
      FOREIGN KEY ("languageId")
      REFERENCES system_languages(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_language_translations_language_id"
  ON language_translations ("languageId");

COMMIT;
