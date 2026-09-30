import { Request, Response } from "express";
import * as XLSX from "xlsx";

import { AppDataSource } from "../data-source";
import { Recipe } from "../entities/recipe.entity";
import { recipeQuery, RecipeService } from "../services/recipe.service";
import { ApiError, respondError } from "../utils/api-error";

const handle = (action: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await action(req, res); } catch (error) { respondError(res, error); }
};

export const RecipeController = {
  create: handle(async (req, res) => { res.status(201).json(await new RecipeService().save(req.body)); }),
  update: handle(async (req, res) => { res.json(await new RecipeService().save(req.body, String(req.params.id))); }),
  get: handle(async (req, res) => {
    const recipe = await AppDataSource.getRepository(Recipe).findOneBy({ id: String(req.params.id) });
    if (!recipe) throw new ApiError(404, "Recipe not found");
    res.json(recipe);
  }),
  list: handle(async (req, res) => {
    const { qb, page, limit } = recipeQuery(req.query);
    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    res.json({ data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }),
  remove: handle(async (req, res) => {
    const result = await AppDataSource.getRepository(Recipe).delete(String(req.params.id));
    if (!result.affected) throw new ApiError(404, "Recipe not found");
    res.json({ message: "Recipe deleted successfully" });
  }),
  export: handle(async (req, res) => {
    const format = req.query.format ?? "csv";
    if (!['csv', 'xlsx'].includes(String(format))) throw new ApiError(400, "Export format must be csv or xlsx");
    const { qb } = recipeQuery(req.query);
    const recipes = await qb.take(10001).getMany();
    if (recipes.length > 10000) throw new ApiError(400, "Narrow filters to export at most 10000 recipes");
    const safe = (value: string) => /^\s*[=+\-@]|^[\t\r\n]/.test(value) ? `'${value}` : value;
    const sheet = XLSX.utils.json_to_sheet(recipes.map(recipe => ({
      Image: recipe.image ?? "",
      "Recipe Name": safe(recipe.name),
      "Sort Order": recipe.sortOrder,
      Status: recipe.isActive ? "Enabled" : "Disabled",
    })));
    res.attachment(`recipes.${format}`);
    if (format === "csv") res.type("text/csv").send(XLSX.utils.sheet_to_csv(sheet));
    else {
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Recipes");
      res.type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .send(XLSX.write(book, { type: "buffer", bookType: "xlsx" }));
    }
  }),
};
