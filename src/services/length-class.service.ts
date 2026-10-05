import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { LengthClass } from "../entities/length-class.entity";
import { CreateLengthClassDto, UpdateLengthClassDto } from "../dto/length-class.dto";
import { ApiError } from "../utils/api-error";
import { BulkDeleteLengthClassDto } from "../dto/length-class.dto";

export async function validateLengthClass(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Length class must be a nonempty object");
  const dto = creating ? plainToInstance(CreateLengthClassDto, input) : plainToInstance(UpdateLengthClassDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid length class data", errors);
  for (const field of ["lengthTitle", "lengthUnit"] as const) {
    if (dto[field] !== undefined) {
      dto[field] = dto[field].trim();
      if (/[\u0000-\u001f\u007f]/.test(dto[field])) throw new ApiError(400, field + " cannot contain control characters");
    }
  }

  return dto;
}
export function lengthClassQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(LengthClass).createQueryBuilder("lengthClass");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("(lengthClass.lengthTitle ILIKE :search OR lengthClass.lengthUnit ILIKE :search)", {
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
  if (start) qb.andWhere('lengthClass."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('lengthClass."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "lengthTitle", direction = query.sortOrder ?? "ASC";
  if (!["lengthTitle", "lengthUnit", "value", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("lengthClass." + sortBy, direction).addOrderBy("lengthClass.id", "ASC");
  return { qb, page, limit };
}
export class LengthClassService {
  async removeMany(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid bulk delete body");
    const dto = plainToInstance(BulkDeleteLengthClassDto, input);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
    if (errors.length) throw new ApiError(400, "Invalid length class IDs", errors);
    const ids = dto.ids.map(id => id.toLowerCase()).sort();
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(LengthClass);
      for (const id of ids) {
        const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!row) throw new ApiError(404, "Length class not found; no length classes were deleted");
      }
      await repo.delete(ids);
    });
    return { message: "Length classes deleted successfully", deletedCount: ids.length };
  }
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateLengthClass(input, !id);
    const repo = this.db.getRepository(LengthClass);
    try {
      if (!id) return await repo.save(repo.create({ ...dto, value: dto.value ?? 1 }));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Length class not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Length class not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Length class title or unit already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(LengthClass).delete(id);
      if (!result.affected) throw new ApiError(404, "Length class not found");
      return { message: "Length class deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This length class is in use and cannot be deleted");
      throw error;
    }
  }
}
