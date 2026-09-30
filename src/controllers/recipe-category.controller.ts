import { Request, Response } from "express";

import { AppDataSource } from "../data-source";
import { RecipeCategory } from "../entities/recipe-category.entity";
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

    const result = await repository.delete(
      String(req.params.id),
    );

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