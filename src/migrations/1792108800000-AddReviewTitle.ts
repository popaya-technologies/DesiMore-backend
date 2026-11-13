import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewTitle1792108800000 implements MigrationInterface {
  name = "AddReviewTitle1792108800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" ADD "title" character varying(255)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "reviews" DROP COLUMN "title"');
  }
}
