import { randomUUID } from "crypto";
import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { CatalogOption } from "../entities/option.entity";
import { CATALOG_OPTION_TYPES, CreateOptionDto, UpdateOptionDto } from "../dto/option.dto";
import { ApiError } from "../utils/api-error";

const cleanName = (name: string) => {
  const result = name.trim();
  if (/[\u0000-\u001f\u007f]/.test(result)) throw new ApiError(400, "Names cannot contain control characters");
  return result;
};
function validImage(image: string) {
  if (/[\s\\\u0000-\u001f\u007f]/.test(image)) return false;
  if (image.startsWith("/uploads/") || image.startsWith("/catalog/")) return true;
  try {
    const url = new URL(image);
    return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch { return false; }
}
export async function validateOption(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Option must be a nonempty object");
  const dto = creating ? plainToInstance(CreateOptionDto, input) : plainToInstance(UpdateOptionDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid option data", errors);
  if (dto.name !== undefined) dto.name = cleanName(dto.name);
  if (dto.values !== undefined) {
    const names = new Set<string>(), ids = new Set<string>();
    for (const row of dto.values) {
      row.name = cleanName(row.name);
      const key = row.name.toLowerCase();
      if (names.has(key)) throw new ApiError(400, "Option value names must be unique");
      names.add(key);
      if (row.id !== undefined) {
        row.id = row.id.toLowerCase();
        if (creating || ids.has(row.id)) throw new ApiError(400, "Invalid or duplicate option value ID");
        ids.add(row.id);
      }
      if (row.image !== undefined) {
        row.image = row.image?.trim() || null;
        if (row.image && !validImage(row.image)) throw new ApiError(400, "Image must be HTTP(S), /uploads/ or /catalog/");
      }
    }
  }
  return dto;
}
export function optionResponse(option: CatalogOption) {
  return { ...option, values: [...option.values].sort((a, b) => a.sortOrder - b.sortOrder) };
}
export class OptionService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateOption(input, !id);
    try {
      return await this.db.transaction(async manager => {
        const repo = manager.getRepository(CatalogOption);
        const existing = id ? await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
        if (id && !existing) throw new ApiError(404, "Option not found");
        const option = existing ?? repo.create({ type: "select", sortOrder: 0, values: [] });
        for (const key of ["name", "type", "sortOrder"])
          if (dto[key] !== undefined) option[key] = dto[key];
        if (dto.values !== undefined) {
          const previous = new Map((existing?.values ?? []).map(row => [row.id, row]));
          option.values = dto.values.map(row => {
            const old = row.id ? previous.get(row.id) : undefined;
            if (row.id && !old) throw new ApiError(400, "Option value ID does not belong to this option");
            return { id: row.id ?? randomUUID(), name: row.name,
              image: row.image !== undefined ? row.image : old?.image ?? null,
              sortOrder: row.sortOrder ?? old?.sortOrder ?? 0 };
          });
        }
        const choice = ["select", "radio", "checkbox"].includes(option.type);
        if (choice && !option.values.length) throw new ApiError(400, "Choice options require at least one value");
        if (!choice && option.values.length) throw new ApiError(400, "This option type requires an empty values array");
        return optionResponse(await repo.save(option));
      });
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Option name already exists");
      throw error;
    }
  }
}
export function optionQuery(query: any) {
  const allowed = ["search", "type", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(CatalogOption).createQueryBuilder("option");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("option.name ILIKE :search", { search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%" });
  }
  if (query.type !== undefined) {
    if (!CATALOG_OPTION_TYPES.includes(query.type)) throw new ApiError(400, "Invalid type");
    qb.andWhere("option.type = :type", { type: query.type });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('option."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('option."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!["name", "type", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("option." + sortBy, direction).addOrderBy("option.id", "ASC");
  return { qb, page, limit };
}
