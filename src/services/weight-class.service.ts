import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { WeightClass } from "../entities/weight-class.entity";
import { CreateWeightClassDto, UpdateWeightClassDto } from "../dto/weight-class.dto";
import { ApiError } from "../utils/api-error";
import { BulkDeleteWeightClassDto } from "../dto/weight-class.dto";

export async function validateWeightClass(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Weight class must be a nonempty object");
  const dto = creating ? plainToInstance(CreateWeightClassDto, input) : plainToInstance(UpdateWeightClassDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid weight class data", errors);
  for (const field of ["weightTitle", "weightUnit"] as const) {
    if (dto[field] !== undefined) {
      dto[field] = dto[field].trim();
      if (/[\u0000-\u001f\u007f]/.test(dto[field])) throw new ApiError(400, field + " cannot contain control characters");
    }
  }

  return dto;
}
export function weightClassQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(WeightClass).createQueryBuilder("weightClass");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("(weightClass.weightTitle ILIKE :search OR weightClass.weightUnit ILIKE :search)", {
      search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
    });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('weightClass."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('weightClass."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "weightTitle", direction = query.sortOrder ?? "ASC";
  if (!["weightTitle", "weightUnit", "value", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("weightClass." + sortBy, direction).addOrderBy("weightClass.id", "ASC");
  return { qb, page, limit };
}
export class WeightClassService {
  async removeMany(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid bulk delete body");
    const dto = plainToInstance(BulkDeleteWeightClassDto, input);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
    if (errors.length) throw new ApiError(400, "Invalid weight class IDs", errors);
    const ids = dto.ids.map(id => id.toLowerCase()).sort();
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(WeightClass);
      for (const id of ids) {
        const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!row) throw new ApiError(404, "Weight class not found; no weight classes were deleted");
      }
      await repo.delete(ids);
    });
    return { message: "Weight classes deleted successfully", deletedCount: ids.length };
  }
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateWeightClass(input, !id);
    const repo = this.db.getRepository(WeightClass);
    try {
      if (!id) return await repo.save(repo.create({ ...dto, value: dto.value ?? 1 }));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Weight class not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Weight class not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Weight class title or unit already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(WeightClass).delete(id);
      if (!result.affected) throw new ApiError(404, "Weight class not found");
      return { message: "Weight class deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This weight class is in use and cannot be deleted");
      throw error;
    }
  }
}
