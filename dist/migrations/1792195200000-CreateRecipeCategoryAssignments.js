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
exports.CreateRecipeCategoryAssignments1792195200000 = void 0;
class CreateRecipeCategoryAssignments1792195200000 {
    constructor() {
        this.name = "CreateRecipeCategoryAssignments1792195200000";
    }
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`
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
            yield queryRunner.query('CREATE INDEX "IDX_recipe_category_assignments_recipe" ON "recipe_category_assignments" ("recipeId")');
            yield queryRunner.query('CREATE INDEX "IDX_recipe_category_assignments_category" ON "recipe_category_assignments" ("categoryId")');
            yield queryRunner.query(`
      INSERT INTO "recipe_category_assignments" ("recipeId", "categoryId")
      SELECT DISTINCT recipe.id, category.id
      FROM "recipes" recipe
      CROSS JOIN LATERAL jsonb_array_elements_text(recipe.categories) AS category_name(name)
      INNER JOIN "recipe_categories" category ON lower(category.name) = lower(category_name.name)
      ON CONFLICT DO NOTHING
    `);
            yield queryRunner.query('ALTER TABLE "recipes" DROP COLUMN "categories"');
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query(`ALTER TABLE "recipes" ADD "categories" jsonb NOT NULL DEFAULT '[]'::jsonb`);
            yield queryRunner.query(`
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
            yield queryRunner.query('DROP TABLE "recipe_category_assignments"');
        });
    }
}
exports.CreateRecipeCategoryAssignments1792195200000 = CreateRecipeCategoryAssignments1792195200000;
