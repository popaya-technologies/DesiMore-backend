import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateParentCategories1765065000000
  implements MigrationInterface
{
  name = "CreateParentCategories1765065000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "parent_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "image" character varying(255), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_9a6e67779aed32d00ebc9ef32c8" UNIQUE ("name"), CONSTRAINT "PK_6e138c1964368f8bd04f1938743" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD "parentCategoryId" uuid`
    );
    await queryRunner.query(
      `ALTER TABLE "categories" ADD CONSTRAINT "FK_8cc2cb7f6c5da6c2fd2856dddfb" FOREIGN KEY ("parentCategoryId") REFERENCES "parent_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "categories" DROP CONSTRAINT "FK_8cc2cb7f6c5da6c2fd2856dddfb"`
    );
    await queryRunner.query(
      `ALTER TABLE "categories" DROP COLUMN "parentCategoryId"`
    );
    await queryRunner.query(`DROP TABLE "parent_categories"`);
  }
}
