import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSeoUrlUniqueness1792281600000 implements MigrationInterface {
  name = "AddSeoUrlUniqueness1792281600000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
    await queryRunner.query(`ALTER TABLE "seo_urls" ADD CONSTRAINT "UQ_seo_url_keyword_scope" UNIQUE ("store", "language", "keyword")`);
    await queryRunner.query(`ALTER TABLE "seo_urls" ADD CONSTRAINT "UQ_seo_url_query_scope" UNIQUE ("store", "language", "query")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "seo_urls" DROP CONSTRAINT "UQ_seo_url_query_scope"`);
    await queryRunner.query(`ALTER TABLE "seo_urls" DROP CONSTRAINT "UQ_seo_url_keyword_scope"`);
  }
}
