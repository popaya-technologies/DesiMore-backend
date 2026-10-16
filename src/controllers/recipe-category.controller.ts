import { Request, Response } from "express";

import { AppDataSource } from "../data-source";
import { RecipeCategory } from "../entities/recipe-category.entity";
import { Recipe } from "../entities/recipe.entity";
import { RecipeCategoryService } from "../services/recipe-category.service";
import { ApiError, respondError } from "../utils/api-error";

const handle =
  (
    action: (
      req: Request,
      res: Response,
    ) => Promise<void>,
  ) =>
  async (req: Request, res: Response) => {
    try {
      await action(req, res);
    } catch (error) {
      respondError(res, error);
    }
  };

export const RecipeCategoryController = {
  publicList: handle(async (_req, res) => {
    const categories = await AppDataSource.getRepository(RecipeCategory).find({
      where: { isActive: true },
      order: { sortOrder: "ASC", name: "ASC" },
    });
    res.json({ data: categories });
  }),
  create: handle(async (req, res) => {
    const category =
      await new RecipeCategoryService().save(req.body);

    res.status(201).json(category);
  }),

  update: handle(async (req, res) => {
    const category =
      await new RecipeCategoryService().save(
        req.body,
        String(req.params.id),
      );

    res.json(category);
  }),

  get: handle(async (req, res) => {
    const category =
      await AppDataSource.getRepository(
        RecipeCategory,
      ).findOneBy({
        id: String(req.params.id),
      });

    if (!category) {
      throw new ApiError(
        404,
        "Recipe category not found",
      );
    }

    res.json(category);
  }),

  list: handle(async (_req, res) => {
    const repository =
      AppDataSource.getRepository(RecipeCategory);

    const categories = await repository.find({
      order: {
        sortOrder: "ASC",
        name: "ASC",
      },
    });

    res.json({
      data: categories,
      meta: {
        total: categories.length,
        page: 1,
        limit: categories.length,
        totalPages: categories.length ? 1 : 0,
      },
    });
  }),

  remove: handle(async (req, res) => {
    const repository =
      AppDataSource.getRepository(RecipeCategory);

    const categoryId = String(req.params.id);
    const childCount = await repository.count({ where: { parent: categoryId } });
    if (childCount > 0) {
      throw new ApiError(409, `This category has ${childCount} child category/categories and cannot be deleted`);
    }
    const assignedRecipes = await AppDataSource.getRepository(Recipe)
      .createQueryBuilder("recipe")
      .innerJoin("recipe.categories", "category", "category.id = :categoryId", { categoryId })
      .getCount();
    if (assignedRecipes > 0) {
      throw new ApiError(409, `This category is assigned to ${assignedRecipes} recipe(s) and cannot be deleted`);
    }

    const result = await repository.delete(categoryId);

    if (!result.affected) {
      throw new ApiError(
        404,
        "Recipe category not found",
      );
    }

    res.json({
      message: "Recipe category deleted successfully",
    });
  }),
};
