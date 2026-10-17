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
exports.AddSeoUrlUniqueness1792281600000 = void 0;
class AddSeoUrlUniqueness1792281600000 {
    constructor() {
        this.name = "AddSeoUrlUniqueness1792281600000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "seo_urls"
          GROUP BY "store", "language", "keyword" HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Duplicate SEO keywords exist. Remove duplicates before running this migration.';
        END IF;
        IF EXISTS (
          SELECT 1 FROM "seo_urls"
          GROUP BY "store", "language", "query" HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Duplicate SEO targets exist. Remove duplicates before running this migration.';
        END IF;
      END $$
    `);
            yield queryRunner.query(`ALTER TABLE "seo_urls" ADD CONSTRAINT "UQ_seo_url_keyword_scope" UNIQUE ("store", "language", "keyword")`);
            yield queryRunner.query(`ALTER TABLE "seo_urls" ADD CONSTRAINT "UQ_seo_url_query_scope" UNIQUE ("store", "language", "query")`);
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "seo_urls" DROP CONSTRAINT "UQ_seo_url_query_scope"`);
            yield queryRunner.query(`ALTER TABLE "seo_urls" DROP CONSTRAINT "UQ_seo_url_keyword_scope"`);
        });
    }
}
exports.AddSeoUrlUniqueness1792281600000 = AddSeoUrlUniqueness1792281600000;
