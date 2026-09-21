import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessageProducts1765080000000 implements MigrationInterface {
  name = "CreateMessageProducts1765080000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "message_products" ("messageId" uuid NOT NULL, "productId" uuid NOT NULL, CONSTRAINT "PK_message_products" PRIMARY KEY ("messageId", "productId"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_products_messageId" ON "message_products" ("messageId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_products_productId" ON "message_products" ("productId")`
    );
    await queryRunner.query(
      `ALTER TABLE "message_products" ADD CONSTRAINT "FK_message_products_messageId" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "message_products" ADD CONSTRAINT "FK_message_products_productId" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_products" DROP CONSTRAINT "FK_message_products_productId"`
    );
    await queryRunner.query(
      `ALTER TABLE "message_products" DROP CONSTRAINT "FK_message_products_messageId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_message_products_productId"`
    );
    await queryRunner.query(
      `DROP INDEX "IDX_message_products_messageId"`
    );
    await queryRunner.query(`DROP TABLE "message_products"`);
  }
}
