-- Run this file manually once in pgAdmin against the existing application database.
-- The application keeps TypeORM synchronize disabled and does not execute this SQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  "metaTitle" VARCHAR(255) NOT NULL,
  "metaDescription" TEXT NOT NULL DEFAULT '',
  "metaKeywords" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0 CHECK ("sortOrder" >= 0),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  image TEXT,
  "additionalImages" JSONB NOT NULL DEFAULT '[]'::jsonb,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  "relatedProducts" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "seoKeyword" VARCHAR(255) UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "CHK_recipes_additional_images_array" CHECK (jsonb_typeof("additionalImages") = 'array'),
  CONSTRAINT "CHK_recipes_categories_array" CHECK (jsonb_typeof(categories) = 'array'),
  CONSTRAINT "CHK_recipes_related_products_array" CHECK (jsonb_typeof("relatedProducts") = 'array')
);

CREATE INDEX IF NOT EXISTS "IDX_recipes_sort_order" ON recipes ("sortOrder", id);
CREATE INDEX IF NOT EXISTS "IDX_recipes_status" ON recipes ("isActive");
CREATE INDEX IF NOT EXISTS "IDX_recipes_created_at" ON recipes ("createdAt");

INSERT INTO permissions (id, name, description, resource, action, "createdAt", "updatedAt")
SELECT uuid_generate_v4(), 'recipe:' || action, 'Manage recipes: ' || action, 'recipe', action, NOW(), NOW()
FROM (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p WHERE p.resource = 'recipe' AND p.action = actions.action
)
ON CONFLICT (name) DO NOTHING;
