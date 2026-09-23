import { MigrationInterface, QueryRunner } from "typeorm";
export class ExpandProductForm1790035200000 implements MigrationInterface {
  name = "ExpandProductForm1790035200000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "sku" varchar(100)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "mpn" varchar(100)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "minimumQuantity" integer NOT NULL DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "subtractStock" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "outOfStockStatus" varchar(30) NOT NULL DEFAULT \'out_of_stock\'',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "requiresShipping" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "dateAvailable" date',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "lengthClass" varchar(20) NOT NULL DEFAULT \'inch\'',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "weightClass" varchar(20) NOT NULL DEFAULT \'pound\'',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "sortOrder" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleQuantity" integer NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleMinimumQuantity" integer NOT NULL DEFAULT 1',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleRequiresShipping" boolean NOT NULL DEFAULT true',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleDateAvailable" date',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleLength" numeric(10,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleWidth" numeric(10,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleHeight" numeric(10,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleWeight" numeric(10,2)',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleLengthClass" varchar(20) NOT NULL DEFAULT \'inch\'',
    );
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "wholesaleWeightClass" varchar(20) NOT NULL DEFAULT \'pound\'',
    );
    await queryRunner.query(
      'CREATE TABLE "downloads" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "name" varchar(255) NOT NULL, "url" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())',
    );
    await queryRunner.query(
      'CREATE TABLE "product_attributes" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "name" varchar(255) NOT NULL, "text" text NOT NULL, "sortOrder" integer NOT NULL DEFAULT 0)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_product_attributes_product" ON "product_attributes" ("productId")',
    );
    await queryRunner.query(
      'CREATE TABLE "product_options" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "name" varchar(255) NOT NULL, "type" varchar(20) NOT NULL, "required" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT 0, "values" jsonb NOT NULL DEFAULT \'[]\')',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_product_options_product" ON "product_options" ("productId")',
    );
    await queryRunner.query(
      'CREATE TABLE "product_discounts" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "customerGroup" varchar(30) NOT NULL, "quantity" integer NOT NULL CHECK ("quantity" >= 1), "priority" integer NOT NULL DEFAULT 0, "price" numeric(10,2) NOT NULL CHECK ("price" >= 0), "dateStart" date, "dateEnd" date, CHECK ("dateEnd" IS NULL OR "dateStart" IS NULL OR "dateEnd" >= "dateStart"))',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_product_discounts_product" ON "product_discounts" ("productId")',
    );
    await queryRunner.query(
      'CREATE TABLE "product_images" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "url" text NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT 0)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_product_images_product" ON "product_images" ("productId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_product_images_main" ON "product_images" ("productId") WHERE "isMain" = true',
    );
    await queryRunner.query(
      'CREATE TABLE "product_downloads" ("productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "downloadId" uuid NOT NULL REFERENCES "downloads"("id") ON DELETE CASCADE, PRIMARY KEY ("productId", "downloadId"))',
    );
    await queryRunner.query(
      'CREATE TABLE "product_related" ("productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "relatedProductId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, PRIMARY KEY ("productId", "relatedProductId"), CHECK ("productId" <> "relatedProductId"))',
    );
    await queryRunner.query(
      'INSERT INTO "product_images" ("productId", "url", "isMain", "sortOrder") SELECT p.id, image.url, image.position = 1, (image.position - 1)::integer FROM products p CROSS JOIN LATERAL unnest(p.images) WITH ORDINALITY AS image(url, position)',
    );
    // Legacy wholesaleOrderQuantity is packaging, never wholesale stock.
    await queryRunner.query(
      'ALTER TABLE "downloads" ADD COLUMN "storagePath" text',
    );
    for (const table of ["orders", "wholesale_order_requests"])
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "inventoryReservations" jsonb NOT NULL DEFAULT '[]'`,
      );
    await queryRunner.query(
      `UPDATE products SET "unitsPerCarton" = "wholesaleOrderQuantity"::integer WHERE "unitsPerCarton" IS NULL AND "wholesaleOrderQuantity" ~ '^[1-9][0-9]{0,8}$'`,
    );
    for (const table of [
      "cart_items",
      "order_items",
      "wholesale_order_items",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "selectedOptions" jsonb NOT NULL DEFAULT '[]'`,
      );
    }
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["orders", "wholesale_order_requests"])
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "inventoryReservations"`,
      );
    for (const table of ["cart_items", "order_items", "wholesale_order_items"])
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP COLUMN "selectedOptions"`,
      );
    await queryRunner.query('DROP TABLE "product_related"');
    await queryRunner.query('DROP TABLE "product_downloads"');
    await queryRunner.query('DROP TABLE "product_images"');
    await queryRunner.query('DROP TABLE "product_discounts"');
    await queryRunner.query('DROP TABLE "product_options"');
    await queryRunner.query('DROP TABLE "product_attributes"');
    await queryRunner.query('DROP TABLE "downloads"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "sku"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "mpn"');
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "minimumQuantity"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "subtractStock"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "outOfStockStatus"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "requiresShipping"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "dateAvailable"',
    );
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "lengthClass"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "weightClass"');
    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "sortOrder"');
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleQuantity"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleMinimumQuantity"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleRequiresShipping"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleDateAvailable"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleLength"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleWidth"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleHeight"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleWeight"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleLengthClass"',
    );
    await queryRunner.query(
      'ALTER TABLE "products" DROP COLUMN "wholesaleWeightClass"',
    );
  }
}
