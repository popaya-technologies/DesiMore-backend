import { randomUUID } from "crypto";
import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { FilterGroup } from "../entities/filter.entity";
import { CreateFilterDto, UpdateFilterDto } from "../dto/filter.dto";
import { ApiError } from "../utils/api-error";

const cleanName = (name: string) => {
  const result = name.trim();
  if (/[\u0000-\u001f\u007f]/.test(result)) throw new ApiError(400, "Names cannot contain control characters");
  return result;
};
export async function validateFilter(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Filter must be a nonempty object");
  const dto = creating ? plainToInstance(CreateFilterDto, input) : plainToInstance(UpdateFilterDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid filter data", errors);
  if (dto.name !== undefined) dto.name = cleanName(dto.name);
  if (dto.values !== undefined) {
    const names = new Set<string>(), ids = new Set<string>();
    for (const row of dto.values) {
      row.name = cleanName(row.name);
      const key = row.name.toLowerCase();
      if (names.has(key)) throw new ApiError(400, "Filter value names must be unique");
      names.add(key);
      if (row.id !== undefined) {
        row.id = row.id.toLowerCase();
        if (creating || ids.has(row.id)) throw new ApiError(400, "Invalid or duplicate filter value ID");
        ids.add(row.id);
      }

    }
  }
  return dto;
}
export function filterResponse(filter: FilterGroup) {
  return { ...filter, values: [...filter.values].sort((a, b) => a.sortOrder - b.sortOrder) };
}
export class FilterService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateFilter(input, !id);
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(FilterGroup);
        const existing = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
        if (id && !existing) throw new ApiError(404, "Filter not found");
        const filter = existing ?? repo.create({ sortOrder: 0, values: [] });
        for (const key of ["name", "sortOrder"])
          if (dto[key] !== undefined) filter[key] = dto[key];
        if (dto.values !== undefined) {
          const previous = new Map((existing?.values ?? []).map(row => [row.id, row]));
          filter.values = dto.values.map(row => {
            const old = row.id ? previous.get(row.id) : undefined;
            if (row.id && !old) throw new ApiError(400, "Filter value ID does not belong to this filter");
            return { id: row.id ?? randomUUID(), name: row.name,
              sortOrder: row.sortOrder ?? old?.sortOrder ?? 0 };
          });
        }
        if (!filter.values.length) throw new ApiError(400, "At least one filter value is required");
        return filterResponse(await repo.save(filter));
      });
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Filter name already exists");
      throw error;
    }
  }
}
export function filterQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 20, 100);
  const qb = AppDataSource.getRepository(FilterGroup).createQueryBuilder("filter");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("filter.name ILIKE :search", { search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%" });
  }

  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('filter."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('filter."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!["name", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("filter." + sortBy, direction).addOrderBy("filter.id", "ASC");
  return { qb, page, limit };
}
