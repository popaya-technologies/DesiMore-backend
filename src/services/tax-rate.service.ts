import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { TaxRate } from "../entities/tax-class.entity";
import { CreateTaxRateDto, UpdateTaxRateDto } from "../dto/tax-rate.dto";
import { ApiError } from "../utils/api-error";
import { BulkDeleteTaxRateDto } from "../dto/tax-rate.dto";
import { GeoZone } from "../entities/geo_zone.entity";
import { CustomerGroup } from "../entities/customer-group.entity";

export const taxRateRelations = ["geoZone", "customerGroups"];
export const taxRateResponse = (row: TaxRate) => ({
  id: row.id, name: row.name, rate: row.rate, type: row.type,
  geoZoneId: row.geoZoneId ?? null,
  geoZone: row.geoZone ? { id: row.geoZone.id, name: row.geoZone.name } : null,
  customerGroupIds: (row.customerGroups ?? []).map(g => g.id),
  customerGroups: (row.customerGroups ?? []).map(g => ({ id: g.id, name: g.name })),
  createdAt: row.createdAt, updatedAt: row.updatedAt,
});

export async function validateTaxRate(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Tax rate must be a nonempty object");
  const dto = creating ? plainToInstance(CreateTaxRateDto, input) : plainToInstance(UpdateTaxRateDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid tax rate data", errors);
  if (creating && (dto.name === undefined || dto.rate === undefined)) throw new ApiError(400, "name and rate are required");
  if (dto.name !== undefined) {
    dto.name = dto.name.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "name cannot contain control characters");
  }

  return dto;
}
export function taxRateQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(TaxRate).createQueryBuilder("taxRate");
  qb.leftJoinAndSelect("taxRate.geoZone", "geoZone").leftJoinAndSelect("taxRate.customerGroups", "customerGroup");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("taxRate.name ILIKE :search", {
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
  if (start) qb.andWhere('taxRate."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('taxRate."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "name", direction = query.sortOrder ?? "ASC";
  if (!["name", "rate", "type", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("taxRate." + sortBy, direction).addOrderBy("taxRate.id", "ASC");
  return { qb, page, limit };
}
export class TaxRateService {
  async removeMany(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid bulk delete body");
    const dto = plainToInstance(BulkDeleteTaxRateDto, input);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
    if (errors.length) throw new ApiError(400, "Invalid tax rate IDs", errors);
    const ids = dto.ids.map(id => id.toLowerCase()).sort();
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(TaxRate);
      for (const id of ids) {
        const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!row) throw new ApiError(404, "Tax rate not found; no statuses were deleted");
      }
      await repo.delete(ids);
    });
    return { message: "Tax rates deleted successfully", deletedCount: ids.length };
  }
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateTaxRate(input, !id);
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(TaxRate);
        const row = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : repo.create({ type: "percentage", geoZoneId: null });
        if (!row) throw new ApiError(404, "Tax rate not found");
        if (dto.name !== undefined) row.name = dto.name;
        if (dto.rate !== undefined) row.rate = dto.rate.toFixed(4);
        if (dto.type !== undefined) row.type = dto.type;
        if (dto.geoZoneId !== undefined) {
          if (dto.geoZoneId && !await manager.getRepository(GeoZone).findOneBy({ id: dto.geoZoneId })) throw new ApiError(400, "Geo zone not found");
          row.geoZoneId = dto.geoZoneId;
        }
        if (dto.customerGroupIds !== undefined) {
          row.customerGroups = [];
          for (const groupId of dto.customerGroupIds) {
            const group = await manager.getRepository(CustomerGroup).findOneBy({ id: groupId });
            if (!group) throw new ApiError(400, "Customer group not found");
            row.customerGroups.push(group);
          }
        }
        await repo.save(row);
        return taxRateResponse(await repo.findOne({ where: { id: row.id }, relations: taxRateRelations }));
      });
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Tax rate name already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(TaxRate).delete(id);
      if (!result.affected) throw new ApiError(404, "Tax rate not found");
      return { message: "Tax rate deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This tax rate is in use and cannot be deleted");
      throw error;
    }
  }
}
