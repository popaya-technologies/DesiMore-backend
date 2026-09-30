import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import sanitizeHtml from "sanitize-html";

import { AppDataSource } from "../data-source";
import { CreateRecipeDto, UpdateRecipeDto } from "../dto/recipe.dto";
import { Recipe } from "../entities/recipe.entity";
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
    if (dto.seoKeyword && !/^[A-Za-z0-9_-]+$/.test(dto.seoKeyword)) throw new ApiError(400, "SEO keyword may contain only letters, numbers, hyphens and underscores");
  }
  if (dto.description !== undefined) dto.description = sanitizeHtml(dto.description);
  if (dto.image !== undefined) dto.image = cleanImage(dto.image);
  if (dto.additionalImages !== undefined) dto.additionalImages = dto.additionalImages.map(row => ({
    image: cleanImage(row.image) as string,
    sortOrder: row.sortOrder ?? 0,
  }));
  for (const key of ["categories", "relatedProducts"] as const) {
    if (dto[key] !== undefined) {
      dto[key] = [...new Set(dto[key].map(value => cleanText(value, key)).filter(Boolean))];
    }
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
        const existing = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
        if (id && !existing) throw new ApiError(404, "Recipe not found");
        const recipe = existing ?? repo.create({
          description: "", metaDescription: "", metaKeywords: "", sortOrder: 0, isActive: true,
          image: null, additionalImages: [], categories: [], relatedProducts: [],
          seoKeyword: null,
        });
        Object.assign(recipe, dto);
        recipe.additionalImages = [...(recipe.additionalImages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
        return await repo.save(recipe);
      });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ApiError(409, "Recipe name or SEO keyword already exists");
      throw error;
    }
  }
}

export function recipeQuery(query: Record<string, unknown>) {
  const allowed = ["search", "isActive", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max) throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(Recipe).createQueryBuilder("recipe");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("recipe.name ILIKE :search", { search: `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%` });
  }
  if (query.isActive !== undefined) {
    if (query.isActive !== "true" && query.isActive !== "false") throw new ApiError(400, "isActive must be true or false");
    qb.andWhere('recipe."isActive" = :isActive', { isActive: query.isActive === "true" });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined)) throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true }))) throw new ApiError(400, "Dates must use YYYY-MM-DD");
  if (start && end && String(start) > String(end)) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('recipe."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('recipe."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!['name', 'sortOrder', 'isActive', 'createdAt'].includes(String(sortBy)) || !['ASC', 'DESC'].includes(String(direction))) throw new ApiError(400, "Invalid sorting");
  qb.orderBy(`recipe."${sortBy}"`, direction as "ASC" | "DESC").addOrderBy("recipe.id", "ASC");
  return { qb, page, limit };
}
