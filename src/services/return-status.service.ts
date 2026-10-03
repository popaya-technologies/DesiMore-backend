import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { ReturnStatus } from "../entities/return-status.entity";
import { CreateReturnStatusDto, UpdateReturnStatusDto } from "../dto/return-status.dto";
import { ApiError } from "../utils/api-error";
import { BulkDeleteReturnStatusDto } from "../dto/return-status.dto";

export async function validateReturnStatus(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Return status must be a nonempty object");
  const dto = creating ? plainToInstance(CreateReturnStatusDto, input) : plainToInstance(UpdateReturnStatusDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid return status data", errors);
  if (dto.name !== undefined) {
    dto.name = dto.name.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "name cannot contain control characters");
  }

  return dto;
}
export function returnStatusQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(ReturnStatus).createQueryBuilder("returnStatus");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("returnStatus.name ILIKE :search", {
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
  if (start) qb.andWhere('returnStatus."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('returnStatus."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "name", direction = query.sortOrder ?? "ASC";
  if (!["name", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("returnStatus." + sortBy, direction).addOrderBy("returnStatus.id", "ASC");
  return { qb, page, limit };
}
export class ReturnStatusService {
  async removeMany(input: unknown) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new ApiError(400, "Invalid bulk delete body");
    const dto = plainToInstance(BulkDeleteReturnStatusDto, input);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
    if (errors.length) throw new ApiError(400, "Invalid return status IDs", errors);
    const ids = dto.ids.map(id => id.toLowerCase()).sort();
    await this.db.transaction(async manager => {
      const repo = manager.getRepository(ReturnStatus);
      for (const id of ids) {
        const row = await repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
        if (!row) throw new ApiError(404, "Return status not found; no statuses were deleted");
      }
      await repo.delete(ids);
    });
    return { message: "Return statuses deleted successfully", deletedCount: ids.length };
  }
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateReturnStatus(input, !id);
    const repo = this.db.getRepository(ReturnStatus);
    try {
      if (!id) return await repo.save(repo.create(dto));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Return status not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Return status not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Return status name already exists");
      throw error;
    }
  }
  async remove(id: string) {
    try {
      const result = await this.db.getRepository(ReturnStatus).delete(id);
      if (!result.affected) throw new ApiError(404, "Return status not found");
      return { message: "Return status deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This return status is in use and cannot be deleted");
      throw error;
    }
  }
}
