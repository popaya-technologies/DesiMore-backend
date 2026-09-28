import { plainToInstance } from "class-transformer";
import { isDateString, validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID } from "../entities/attribute-group.entity";
import { CreateAttributeGroupDto, UpdateAttributeGroupDto } from "../dto/attribute-group.dto";
import { ApiError } from "../utils/api-error";

export async function validateAttributeGroup(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Attribute group must be a nonempty object");
  const dto = creating ? plainToInstance(CreateAttributeGroupDto, input) : plainToInstance(UpdateAttributeGroupDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid attribute group data", errors);
  if (dto.name !== undefined) {
    dto.name = dto.name.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "name cannot contain control characters");
  }
  return dto;
}
export function attributeGroupQuery(query: any) {
  const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(AttributeGroup).createQueryBuilder("attributeGroup");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    qb.andWhere("attributeGroup.name ILIKE :search", {
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
  if (start) qb.andWhere('attributeGroup."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('attributeGroup."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (!["name", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy("attributeGroup." + sortBy, direction).addOrderBy("attributeGroup.id", "ASC");
  return { qb, page, limit };
}
export class AttributeGroupService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateAttributeGroup(input, !id);
    const repo = this.db.getRepository(AttributeGroup);
    try {
      if (!id) return await repo.save(repo.create(dto));
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Attribute group not found");
      const row = await repo.findOneBy({ id });
      if (!row) throw new ApiError(404, "Attribute group not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "Attribute group name already exists");
      throw error;
    }
  }
  async remove(id: string) {
    // Preserve the default ID used by Attributes when no group is specified.
    if (id === DEFAULT_ATTRIBUTE_GROUP_ID) throw new ApiError(409, "The default Product group cannot be deleted");
    try {
      const result = await this.db.getRepository(AttributeGroup).delete(id);
      if (!result.affected) throw new ApiError(404, "Attribute group not found");
      return { message: "Attribute group deleted successfully" };
    } catch (error) {
      if (error.code === "23503") throw new ApiError(409, "This group is used by attributes; reassign them before deleting it");
      throw error;
    }
  }
}
