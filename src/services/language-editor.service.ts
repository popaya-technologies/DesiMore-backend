import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { Brackets, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { LanguageTranslation } from "../entities/language-translation.entity";
import { CreateTranslationDto, UpdateTranslationDto, DeleteTranslationsDto } from "../dto/language-editor.dto";
import { ApiError } from "../utils/api-error";

async function validated<T extends object>(type: new () => T, input: unknown): Promise<T> {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Request must be a nonempty object");
  const dto = plainToInstance(type, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid translation data", errors);
  return dto;
}
export async function validateTranslation(input: unknown, creating: boolean) {
  const dto = creating ? await validated(CreateTranslationDto, input) : await validated(UpdateTranslationDto, input);
  for (const key of ["store", "language", "route", "key"]) {
    if (dto[key] !== undefined) {
      dto[key] = dto[key].trim();
      if (/[\u0000-\u001f\u007f]/.test(dto[key])) throw new ApiError(400, key + " cannot contain control characters");
    }
  }
  if (dto.value?.includes("\u0000")) throw new ApiError(400, "value cannot contain a null character");
  return dto;
}
export const validateTranslationIds = (input: unknown) => validated(DeleteTranslationsDto, input);

export function translationQuery(query: any) {
  const allowed = ["search", "store", "language", "route", "key", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(LanguageTranslation).createQueryBuilder("translation");
  for (const [key, max] of [["store", 100], ["language", 50], ["route", 255], ["key", 255]] as const) {
    if (query[key] !== undefined) {
      if (typeof query[key] !== "string" || !query[key].trim() || query[key].length > max)
        throw new ApiError(400, "Invalid " + key + " filter");
      qb.andWhere('translation."' + key + '" = :' + key, { [key]: query[key].trim() });
    }
  }
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    const search = "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%";
    qb.andWhere(new Brackets(inner => {
      for (const key of ["store", "language", "route", "key", "value"])
        inner.orWhere('translation."' + key + '" ILIKE :search', { search });
    }));
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('translation."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('translation."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "createdAt", sortOrder = query.sortOrder ?? "DESC";
  if (!["store", "language", "route", "key", "value", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy('translation."' + sortBy + '"', sortOrder).addOrderBy("translation.id", "ASC");
  return { qb, page, limit };
}
export class LanguageEditorService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateTranslation(input, !id);
    const repo = this.db.getRepository(LanguageTranslation);
    try {
      if (!id) return await repo.save(repo.create(dto));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Translation not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Translation not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "A translation already exists for this store, language, route and key");
      throw error;
    }
  }
  async deleteMany(input: unknown) {
    const { ids } = await validateTranslationIds(input);
    return this.db.transaction(async manager => {
      const repo = manager.getRepository(LanguageTranslation);
      const rows = await repo.find({ where: { id: In(ids) }, order: { id: "ASC" }, lock: { mode: "pessimistic_write" } });
      if (rows.length !== ids.length) throw new ApiError(404, "One or more translations were not found; nothing deleted");
      await repo.delete(ids);
      return { message: "Translations deleted successfully", deletedCount: ids.length };
    });
  }
}
