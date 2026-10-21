import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import sanitizeHtml from "sanitize-html";

import { AppDataSource } from "../data-source";
import { CreateRecipeDto, UpdateRecipeDto } from "../dto/recipe.dto";
import { Recipe } from "../entities/recipe.entity";
import { RecipeCategory } from "../entities/recipe-category.entity";
import { SeoUrl } from "../entities/seo-url.entity";
import { getDefaultSystemLanguage } from "./system-language.service";
import { ApiError } from "../utils/api-error";

const cleanText = (value: string, label: string) => {
  const result = value.trim();
  if (/\p{Cc}/u.test(result)) throw new ApiError(400, `${label} cannot contain control characters`);
  return result;
};

const cleanImage = (value: unknown) => {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048) throw new ApiError(400, "Invalid image");
  const image = value.trim();
  if (!/^(https?:\/\/|\/uploads\/|\/catalog\/)/i.test(image) || /^https?:\/\/[^/]*@/i.test(image))
    throw new ApiError(400, "Image must be an HTTP(S), /uploads/, or /catalog/ path");
  return image;
};

export async function validateRecipe(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Recipe must be a nonempty object");
  const dto = creating ? plainToInstance(CreateRecipeDto, input) : plainToInstance(UpdateRecipeDto, input);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length) throw new ApiError(400, "Invalid recipe data", errors);
  for (const key of ["name", "metaTitle"] as const) if (dto[key] !== undefined) dto[key] = cleanText(dto[key], key);
  if (dto.seoKeyword !== undefined) {
    dto.seoKeyword = dto.seoKeyword === null || dto.seoKeyword.trim() === "" ? null : cleanText(dto.seoKeyword, "seoKeyword");
    if (dto.seoKeyword && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dto.seoKeyword))
      throw new ApiError(400, "SEO keyword must contain lowercase letters, numbers and single hyphens only");
  }
  if (dto.description !== undefined) dto.description = sanitizeHtml(dto.description);
  if (dto.image !== undefined) dto.image = cleanImage(dto.image);
  if (dto.additionalImages !== undefined) dto.additionalImages = dto.additionalImages.map(row => ({
    image: cleanImage(row.image) as string,
    sortOrder: row.sortOrder ?? 0,
  }));
  if (dto.categoryIds !== undefined) dto.categoryIds = [...new Set(dto.categoryIds)];
  if (dto.relatedProducts !== undefined) {
    dto.relatedProducts = [...new Set(dto.relatedProducts.map(value => cleanText(value, "relatedProducts")).filter(Boolean))];
  }
  return dto;
}

export class RecipeService {
  constructor(private db = AppDataSource) {}

  async save(input: unknown, id?: string) {
    const dto = await validateRecipe(input, !id);
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(Recipe);
        // Lock only the recipe row. PostgreSQL cannot apply FOR UPDATE to the
        // nullable side of the LEFT JOIN generated when relations are loaded.
        const existing = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
        if (id && !existing) throw new ApiError(404, "Recipe not found");
        const recipe = existing ?? repo.create({
          description: "", metaDescription: "", metaKeywords: "", sortOrder: 0, isActive: true,
          image: null, additionalImages: [], categories: [], relatedProducts: [],
          seoKeyword: null,
        });
        const { categoryIds, ...fields } = dto;
        Object.assign(recipe, fields);
        if (categoryIds !== undefined) {
          const categories = categoryIds.length
            ? await manager.getRepository(RecipeCategory).findByIds(categoryIds)
            : [];
          if (categories.length !== categoryIds.length) throw new ApiError(400, "One or more recipe categories do not exist");
          recipe.categories = categories;
        }
        recipe.additionalImages = [...(recipe.additionalImages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
        if (!recipe.seoKeyword) {
          recipe.seoKeyword = recipe.name
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "recipe";
        }
        const saved = await repo.save(recipe);
        const seoRepo = manager.getRepository(SeoUrl);
        const defaultLanguage = await getDefaultSystemLanguage(manager);
        const query = `recipe_id=${saved.id}`;
        const mapping = await seoRepo.findOne({
          where: { query, store: "Default", languageId: defaultLanguage.id },
        });
        const conflict = await seoRepo.findOne({
          where: { keyword: saved.seoKeyword, store: "Default", languageId: defaultLanguage.id },
        });
        if (conflict && conflict.id !== mapping?.id)
          throw new ApiError(409, "This SEO keyword is already used by another resource");
        await seoRepo.save(
          mapping
            ? Object.assign(mapping, {
                keyword: saved.seoKeyword,
                language: defaultLanguage.languageName,
                languageId: defaultLanguage.id,
                systemLanguage: defaultLanguage,
              })
            : seoRepo.create({
                query,
                keyword: saved.seoKeyword,
                store: "Default",
                language: defaultLanguage.languageName,
                languageId: defaultLanguage.id,
                systemLanguage: defaultLanguage,
              }),
        );
        return saved;
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "Recipe name or SEO keyword already exists");
      throw error;
    }
  }

  async remove(id: string) {
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(Recipe);
      const recipe = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
      if (!recipe) throw new ApiError(404, "Recipe not found");
      const defaultLanguage = await getDefaultSystemLanguage(manager);
      await manager.getRepository(SeoUrl).delete({
        query: `recipe_id=${id}`,
        store: "Default",
        languageId: defaultLanguage.id,
      });
      await repo.remove(recipe);
      return { message: "Recipe deleted successfully" };
    });
  }
}

export function recipeQuery(query: Record<string, unknown>) {
  const allowed = ["search", "categoryId", "isActive", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max) throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(Recipe).createQueryBuilder("recipe")
    .leftJoinAndSelect("recipe.categories", "category")
    .distinct(true);
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("recipe.name ILIKE :search", { search: `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%` });
  }
  if (query.isActive !== undefined) {
    if (query.isActive !== "true" && query.isActive !== "false") throw new ApiError(400, "isActive must be true or false");
    qb.andWhere('recipe."isActive" = :isActive', { isActive: query.isActive === "true" });
  }
  if (query.categoryId !== undefined) {
    if (typeof query.categoryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.categoryId))
      throw new ApiError(400, "Invalid recipe category ID");
    qb.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined)) throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true }))) throw new ApiError(400, "Dates must use YYYY-MM-DD");
  if (start && end && String(start) > String(end)) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('recipe."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('recipe."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!['name', 'sortOrder', 'isActive', 'createdAt'].includes(String(sortBy)) || !['ASC', 'DESC'].includes(String(direction))) throw new ApiError(400, "Invalid sorting");
  const sortColumns: Record<string, string> = {
    name: "recipe.name",
    sortOrder: "recipe.sortOrder",
    isActive: "recipe.isActive",
    createdAt: "recipe.createdAt",
  };
  qb.orderBy(sortColumns[String(sortBy)], direction as "ASC" | "DESC").addOrderBy("recipe.id", "ASC");
  return { qb, page, limit };
}
