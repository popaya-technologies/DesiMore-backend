import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { TaxClass, TaxClassRule, TaxRate } from "../entities/tax-class.entity";
import { CreateTaxClassDto, UpdateTaxClassDto } from "../dto/tax-class.dto";
import { ApiError } from "../utils/api-error";
import { BulkDeleteTaxClassDto, CreateTaxRateDto } from "../dto/tax-class.dto";

export async function validateTaxClass(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Tax class must be a nonempty object");
  const dto = creating ? plainToInstance(CreateTaxClassDto, input) : plainToInstance(UpdateTaxClassDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid tax class data", errors);
  if (dto.title !== undefined) {
    dto.title = dto.title.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.title)) throw new ApiError(400, "name cannot contain control characters");
  }

  if (dto.description !== undefined) {
    dto.description = dto.description.trim();
    if (dto.description.includes("\u0000")) throw new ApiError(400, "description cannot contain null characters");
  }
  if (dto.rules) {
    const seen = new Set<string>();
    for (const rule of dto.rules) {
      rule.taxRateId = rule.taxRateId.toLowerCase();
      rule.basedOn = rule.basedOn ?? "shipping";
      rule.priority = rule.priority ?? 1;
      const key = `${rule.taxRateId}:${rule.basedOn}`;
      if (seen.has(key)) throw new ApiError(400, "Duplicate tax rate and address basis");
      seen.add(key);
    }
  }
  return dto;
}
export function taxClassQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(TaxClass).createQueryBuilder("taxClass");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("taxClass.title ILIKE :search", {
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
  if (start) qb.andWhere('taxClass."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('taxClass."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "title", direction = query.sortOrder ?? "ASC";
  if (!["title", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("taxClass." + sortBy, direction).addOrderBy("taxClass.id", "ASC");
  return { qb, page, limit };
}
export class TaxClassService {
  async removeMany(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid bulk delete body");
    const dto = plainToInstance(BulkDeleteTaxClassDto, input);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
    if (errors.length) throw new ApiError(400, "Invalid tax class IDs", errors);
    const ids = dto.ids.map(id => id.toLowerCase()).sort();
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(TaxClass);
      for (const id of ids) {
        const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!row) throw new ApiError(404, "Tax class not found; no statuses were deleted");
      }
      await repo.delete(ids);
    });
    return { message: "Tax classes deleted successfully", deletedCount: ids.length };
  }
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateTaxClass(input, !id);
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(TaxClass);
        const row = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : repo.create();
        if (!row) throw new ApiError(404, "Tax class not found");
        if (dto.title !== undefined) row.title = dto.title;
        if (dto.description !== undefined) row.description = dto.description;
        if (dto.rules) for (const taxRateId of [...new Set(dto.rules.map(r => r.taxRateId))].sort()) {
          const rate = await manager.getRepository(TaxRate).findOne({ where: { id: taxRateId }, lock: { mode: "pessimistic_read" } });
          if (!rate) throw new ApiError(400, "Selected tax rate does not exist");
        }
        await repo.save(row);
        const ruleRepo = manager.getRepository(TaxClassRule);
        if (dto.rules !== undefined) {
          await ruleRepo.delete({ taxClassId: row.id });
          if (dto.rules.length) await ruleRepo.save(dto.rules.map(rule => ruleRepo.create({ ...rule, taxClassId: row.id })));
        }
        return repo.findOne({ where: { id: row.id }, relations: ["rules", "rules.taxRate"], order: { rules: { priority: "ASC", id: "ASC" } } });
      });
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Tax class name already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(TaxClass).delete(id);
      if (!result.affected) throw new ApiError(404, "Tax class not found");
      return { message: "Tax class deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This tax class is in use and cannot be deleted");
      throw error;
    }
  }
}

export async function createTaxRate(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid tax rate");
  const dto = plainToInstance(CreateTaxRateDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid tax rate", errors);
  dto.name = dto.name.trim();
  if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "Invalid rate name");
  const repo = AppDataSource.getRepository(TaxRate);
  try { return await repo.save(repo.create({ name: dto.name, rate: dto.rate.toFixed(4), type: dto.type ?? "percentage" })); }
  catch (error) { if (error.code === "23505") throw new ApiError(409, "Tax rate name already exists"); throw error; }
}
