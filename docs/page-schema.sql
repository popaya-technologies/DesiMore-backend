-- Run manually in pgAdmin Query Tool in your EXISTING application database.
-- This file is not executed by the backend. No migration is registered.
BEGIN;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE "pages" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" varchar(255) NOT NULL CHECK (length(btrim("title")) > 0),
  "description" text NOT NULL DEFAULT '',
  "media" jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof("media") = 'array'),
  "metaTagTitle" varchar(255) NOT NULL DEFAULT '',
  "metaTagDescription" text NOT NULL DEFAULT '',
  "metaTagKeywords" text NOT NULL DEFAULT '',
  "bottom" varchar(32) NOT NULL DEFAULT 'none'
    CHECK ("bottom" IN ('footer_about_us', 'footer_consumer', 'footer_privacy', 'top_menu', 'none')),
  "sortOrder" integer NOT NULL DEFAULT 0 CHECK ("sortOrder" >= 0),
  "isActive" boolean NOT NULL DEFAULT true,
  "slug" varchar(255) NOT NULL UNIQUE CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX "IDX_pages_createdAt" ON "pages" ("createdAt", "id");
CREATE INDEX "IDX_pages_placement" ON "pages" ("bottom", "isActive", "sortOrder");

-- A shared unique registry protects keywords across pages and existing SEO URLs,
-- including concurrent requests. Existing SEO URL duplicates abort this transaction.
CREATE TABLE "page_seo_keywords" (
  "keyword" text PRIMARY KEY,
  "owner" text NOT NULL UNIQUE
);
INSERT INTO "page_seo_keywords" ("keyword", "owner")
SELECT lower(btrim("keyword")), 'seo:' || "id"::text FROM "seo_urls";
CREATE FUNCTION reserve_page_seo_keyword() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE keyword_value text; owner_value text;
BEGIN
  owner_value := CASE WHEN TG_TABLE_NAME = 'pages' THEN 'page:' ELSE 'seo:' END;
  IF TG_OP = 'DELETE' THEN
    DELETE FROM "page_seo_keywords" WHERE "owner" = owner_value || OLD."id"::text;
    RETURN OLD;
  END IF;
  owner_value := owner_value || NEW."id"::text;
  IF TG_TABLE_NAME = 'pages' THEN keyword_value := NEW."slug";
  ELSE keyword_value := NEW."keyword"; END IF;
  DELETE FROM "page_seo_keywords" WHERE "owner" = owner_value;
  INSERT INTO "page_seo_keywords" ("keyword", "owner") VALUES (lower(btrim(keyword_value)), owner_value);
  RETURN NEW;
END;
$$;
CREATE TRIGGER "pages_keyword_registry" AFTER INSERT OR UPDATE OR DELETE ON "pages"
FOR EACH ROW EXECUTE FUNCTION reserve_page_seo_keyword();
CREATE TRIGGER "seo_urls_page_keyword_registry" AFTER INSERT OR UPDATE OR DELETE ON "seo_urls"
FOR EACH ROW EXECUTE FUNCTION reserve_page_seo_keyword();

INSERT INTO "permissions" ("id", "name", "description", "resource", "action", "createdAt", "updatedAt")
SELECT uuid_generate_v4(), 'page:' || action, 'Manage pages: ' || action, 'page', action, now(), now()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (SELECT 1 FROM "permissions" p WHERE p."resource" = 'page' AND p."action" = actions.action)
ON CONFLICT ("name") DO NOTHING;
COMMIT;
