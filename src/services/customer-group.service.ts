import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { CustomerGroup } from "../entities/customer-group.entity";
import { CreateCustomerGroupDto, UpdateCustomerGroupDto } from "../dto/customer-group.dto";
import { ApiError } from "../utils/api-error";

export async function validateCustomerGroup(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Customer group must be a nonempty object");
  const dto = creating ? plainToInstance(CreateCustomerGroupDto, input) : plainToInstance(UpdateCustomerGroupDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid customer group data", errors);
  if (dto.name !== undefined) {
    dto.name = dto.name.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "name cannot contain control characters");
  }
  if (dto.description?.includes("\u0000")) throw new ApiError(400, "description cannot contain null characters");
  return dto;
}
export function customerGroupQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(CustomerGroup).createQueryBuilder("customerGroup");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("customerGroup.name ILIKE :search", {
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
  if (start) qb.andWhere('customerGroup."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('customerGroup."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!["name", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("customerGroup." + sortBy, direction).addOrderBy("customerGroup.id", "ASC");
  return { qb, page, limit };
}
export class CustomerGroupService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateCustomerGroup(input, !id);
    const repo = this.db.getRepository(CustomerGroup);
    try {
      if (!id) return await repo.save(repo.create(dto));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Customer group not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Customer group not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Customer group name already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(CustomerGroup).delete(id);
      if (!result.affected) throw new ApiError(404, "Customer group not found");
      return { message: "Customer group deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This customer group is in use and cannot be deleted");
      throw error;
    }
  }
}
