import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRecipeCategoryAssignments1792195200000 implements MigrationInterface {
  name = "CreateRecipeCategoryAssignments1792195200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "recipe_category_assignments" (
        "recipeId" uuid NOT NULL,
        "categoryId" uuid NOT NULL,
        CONSTRAINT "PK_recipe_category_assignments" PRIMARY KEY ("recipeId", "categoryId"),
        CONSTRAINT "FK_recipe_category_assignments_recipe" FOREIGN KEY ("recipeId")
          REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_recipe_category_assignments_category" FOREIGN KEY ("categoryId")
          REFERENCES "recipe_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_recipe_category_assignments_recipe" ON "recipe_category_assignments" ("recipeId")');
    await queryRunner.query('CREATE INDEX "IDX_recipe_category_assignments_category" ON "recipe_category_assignments" ("categoryId")');
    await queryRunner.query(`
      INSERT INTO "recipe_category_assignments" ("recipeId", "categoryId")
      SELECT DISTINCT recipe.id, category.id
      FROM "recipes" recipe
      CROSS JOIN LATERAL jsonb_array_elements_text(recipe.categories) AS category_name(name)
      INNER JOIN "recipe_categories" category ON lower(category.name) = lower(category_name.name)
      ON CONFLICT DO NOTHING
    `);
    await queryRunner.query('ALTER TABLE "recipes" DROP COLUMN "categories"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "recipes" ADD "categories" jsonb NOT NULL DEFAULT '[]'::jsonb`);
    await queryRunner.query(`
      UPDATE "recipes" recipe
      SET "categories" = assignments.names
      FROM (
        SELECT assignment."recipeId", jsonb_agg(category.name ORDER BY category."sortOrder", category.name) AS names
        FROM "recipe_category_assignments" assignment
        INNER JOIN "recipe_categories" category ON category.id = assignment."categoryId"
        GROUP BY assignment."recipeId"
      ) assignments
      WHERE recipe.id = assignments."recipeId"
    `);
    await queryRunner.query('DROP TABLE "recipe_category_assignments"');
  }
}
