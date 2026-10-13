import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGiftVoucherToOrders1791763200000 implements MigrationInterface {
  name = "AddGiftVoucherToOrders1791763200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "giftVoucherCode" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "giftVoucherAmount" numeric(12,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "giftVoucherAmount"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "giftVoucherCode"`);
  }
}
