ROLLBACK;
BEGIN;

ALTER TABLE seo_urls
  ADD COLUMN IF NOT EXISTS "languageId" UUID;

UPDATE seo_urls AS seo
SET "languageId" = language.id
FROM system_languages AS language
WHERE seo."languageId" IS NULL
  AND (
    LOWER(TRIM(seo.language)) = LOWER(TRIM(language."languageName"))
    OR LOWER(TRIM(seo.language)) = LOWER(TRIM(language.code))
  );

UPDATE seo_urls AS seo
SET "languageId" = language.id
FROM system_languages AS language
WHERE seo."languageId" IS NULL
  AND language."isDefault" = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM seo_urls WHERE "languageId" IS NULL) THEN
    RAISE EXCEPTION 'Some SEO URLs could not be assigned to a language. Create a default language first.';
  END IF;
END $$;

ALTER TABLE seo_urls
  ALTER COLUMN "languageId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'FK_seo_urls_system_language'
  ) THEN
    ALTER TABLE seo_urls
      ADD CONSTRAINT "FK_seo_urls_system_language"
      FOREIGN KEY ("languageId")
      REFERENCES system_languages(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_seo_urls_language_id"
  ON seo_urls ("languageId");

COMMIT;
