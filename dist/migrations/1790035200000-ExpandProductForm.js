"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpandProductForm1790035200000 = void 0;
class ExpandProductForm1790035200000 {
    constructor() {
        this.name = "ExpandProductForm1790035200000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "sku" varchar(100)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "mpn" varchar(100)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "minimumQuantity" integer NOT NULL DEFAULT 1');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "subtractStock" boolean NOT NULL DEFAULT true');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "outOfStockStatus" varchar(30) NOT NULL DEFAULT \'out_of_stock\'');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "requiresShipping" boolean NOT NULL DEFAULT true');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "dateAvailable" date');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "lengthClass" varchar(20) NOT NULL DEFAULT \'inch\'');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "weightClass" varchar(20) NOT NULL DEFAULT \'pound\'');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "sortOrder" integer NOT NULL DEFAULT 0');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleQuantity" integer NOT NULL DEFAULT 0');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleMinimumQuantity" integer NOT NULL DEFAULT 1');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleRequiresShipping" boolean NOT NULL DEFAULT true');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleDateAvailable" date');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleLength" numeric(10,2)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleWidth" numeric(10,2)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleHeight" numeric(10,2)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleWeight" numeric(10,2)');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleLengthClass" varchar(20) NOT NULL DEFAULT \'inch\'');
            yield queryRunner.query('ALTER TABLE "products" ADD COLUMN "wholesaleWeightClass" varchar(20) NOT NULL DEFAULT \'pound\'');
            yield queryRunner.query('CREATE TABLE "downloads" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "name" varchar(255) NOT NULL, "url" text NOT NULL, "createdAt" timestamp NOT NULL DEFAULT now())');
            yield queryRunner.query('CREATE TABLE "product_attributes" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "name" varchar(255) NOT NULL, "text" text NOT NULL, "sortOrder" integer NOT NULL DEFAULT 0)');
            yield queryRunner.query('CREATE INDEX "IDX_product_attributes_product" ON "product_attributes" ("productId")');
            yield queryRunner.query('CREATE TABLE "product_options" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "name" varchar(255) NOT NULL, "type" varchar(20) NOT NULL, "required" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT 0, "values" jsonb NOT NULL DEFAULT \'[]\')');
            yield queryRunner.query('CREATE INDEX "IDX_product_options_product" ON "product_options" ("productId")');
            yield queryRunner.query('CREATE TABLE "product_discounts" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "customerGroup" varchar(30) NOT NULL, "quantity" integer NOT NULL CHECK ("quantity" >= 1), "priority" integer NOT NULL DEFAULT 0, "price" numeric(10,2) NOT NULL CHECK ("price" >= 0), "dateStart" date, "dateEnd" date, CHECK ("dateEnd" IS NULL OR "dateStart" IS NULL OR "dateEnd" >= "dateStart"))');
            yield queryRunner.query('CREATE INDEX "IDX_product_discounts_product" ON "product_discounts" ("productId")');
            yield queryRunner.query('CREATE TABLE "product_images" ("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "url" text NOT NULL, "isMain" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT 0)');
            yield queryRunner.query('CREATE INDEX "IDX_product_images_product" ON "product_images" ("productId")');
            yield queryRunner.query('CREATE UNIQUE INDEX "IDX_product_images_main" ON "product_images" ("productId") WHERE "isMain" = true');
            yield queryRunner.query('CREATE TABLE "product_downloads" ("productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "downloadId" uuid NOT NULL REFERENCES "downloads"("id") ON DELETE CASCADE, PRIMARY KEY ("productId", "downloadId"))');
            yield queryRunner.query('CREATE TABLE "product_related" ("productId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, "relatedProductId" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE, PRIMARY KEY ("productId", "relatedProductId"), CHECK ("productId" <> "relatedProductId"))');
            yield queryRunner.query('INSERT INTO "product_images" ("productId", "url", "isMain", "sortOrder") SELECT p.id, image.url, image.position = 1, (image.position - 1)::integer FROM products p CROSS JOIN LATERAL unnest(p.images) WITH ORDINALITY AS image(url, position)');
            // Legacy wholesaleOrderQuantity is packaging, never wholesale stock.
            yield queryRunner.query('ALTER TABLE "downloads" ADD COLUMN "storagePath" text');
            for (const table of ["orders", "wholesale_order_requests"])
                yield queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "inventoryReservations" jsonb NOT NULL DEFAULT '[]'`);
            yield queryRunner.query(`UPDATE products SET "unitsPerCarton" = "wholesaleOrderQuantity"::integer WHERE "unitsPerCarton" IS NULL AND "wholesaleOrderQuantity" ~ '^[1-9][0-9]{0,8}$'`);
            for (const table of [
                "cart_items",
                "order_items",
                "wholesale_order_items",
            ]) {
                yield queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "selectedOptions" jsonb NOT NULL DEFAULT '[]'`);
            }
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const table of ["orders", "wholesale_order_requests"])
                yield queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "inventoryReservations"`);
            for (const table of ["cart_items", "order_items", "wholesale_order_items"])
                yield queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "selectedOptions"`);
            yield queryRunner.query('DROP TABLE "product_related"');
            yield queryRunner.query('DROP TABLE "product_downloads"');
            yield queryRunner.query('DROP TABLE "product_images"');
            yield queryRunner.query('DROP TABLE "product_discounts"');
            yield queryRunner.query('DROP TABLE "product_options"');
            yield queryRunner.query('DROP TABLE "product_attributes"');
            yield queryRunner.query('DROP TABLE "downloads"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "sku"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "mpn"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "minimumQuantity"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "subtractStock"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "outOfStockStatus"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "requiresShipping"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "dateAvailable"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "lengthClass"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "weightClass"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "sortOrder"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleQuantity"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleMinimumQuantity"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleRequiresShipping"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleDateAvailable"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleLength"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleWidth"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleHeight"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleWeight"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleLengthClass"');
            yield queryRunner.query('ALTER TABLE "products" DROP COLUMN "wholesaleWeightClass"');
        });
    }
}
exports.ExpandProductForm1790035200000 = ExpandProductForm1790035200000;
