import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
  TableUnique,
} from "typeorm";

export class AddCartTypeAndMultipleCarts1765070000000
  implements MigrationInterface
{
  name = "AddCartTypeAndMultipleCarts1765070000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("carts");
    const userUnique = table?.uniques.find(
      (unique) =>
        unique.columnNames.length === 1 && unique.columnNames[0] === "userId"
    );
    if (userUnique) {
      await queryRunner.dropUniqueConstraint("carts", userUnique);
    }

    await queryRunner.addColumn(
      "carts",
      new TableColumn({
        name: "type",
        type: "varchar",
        length: "20",
        isNullable: false,
        default: `'regular'`,
      })
    );

    await queryRunner.createIndex(
      "carts",
      new TableIndex({
        name: "IDX_carts_userId_type",
        columnNames: ["userId", "type"],
        isUnique: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex("carts", "IDX_carts_userId_type");
    await queryRunner.dropColumn("carts", "type");

    await queryRunner.createUniqueConstraint(
      "carts",
      new TableUnique({
        name: "UQ_carts_userId",
        columnNames: ["userId"],
      })
    );
  }
}
