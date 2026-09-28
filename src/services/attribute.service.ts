import { plainToInstance } from "class-transformer";
import { isDateString, isUUID, validate } from "class-validator";
import { Brackets } from "typeorm";
import { AppDataSource } from "../data-source";
import { Attribute } from "../entities/attribute.entity";
import { AttributeGroup, DEFAULT_ATTRIBUTE_GROUP_ID } from "../entities/attribute-group.entity";
import { CreateAttributeDto, UpdateAttributeDto } from "../dto/attribute.dto";
import { ApiError } from "../utils/api-error";

export async function validateAttribute(input: unknown, creating: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
    throw new ApiError(400, "Attribute must be a nonempty object");
  const dto = creating ? plainToInstance(CreateAttributeDto, input) : plainToInstance(UpdateAttributeDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false } });
  if (errors.length) throw new ApiError(400, "Invalid attribute data", errors);
  if (dto.name !== undefined) {
    dto.name = dto.name.trim();
    if (/[\u0000-\u001f\u007f]/.test(dto.name)) throw new ApiError(400, "name cannot contain control characters");
  }
  return dto;
}

export function attributeQuery(query: any) {
  const allowed = ["search", "attributeGroupId", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
  if (Object.keys(query).some(key => !allowed.includes(key))) throw new ApiError(400, "Unknown query parameter");
  const integer = (value: unknown, fallback: number, max: number) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
      throw new ApiError(400, "Invalid page or limit");
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
  const qb = AppDataSource.getRepository(Attribute).createQueryBuilder("attribute")
    .leftJoinAndSelect("attribute.attributeGroup", "attributeGroup");
  if (query.search !== undefined) {
    if (typeof query.search !== "string" || query.search.length > 255) throw new ApiError(400, "Invalid search");
    const search = "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%";
    qb.andWhere(new Brackets(inner => {
      inner.where("attribute.name ILIKE :search", { search })
        .orWhere("attributeGroup.name ILIKE :search", { search });
    }));
  }
  if (query.attributeGroupId !== undefined) {
    if (typeof query.attributeGroupId !== "string" || !isUUID(query.attributeGroupId))
      throw new ApiError(400, "Invalid attributeGroupId");
    qb.andWhere("attribute.attributeGroupId = :groupId", { groupId: query.attributeGroupId });
  }
  if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
    throw new ApiError(400, "Use date or startDate/endDate");
  const start = query.date ?? query.startDate, end = query.date ?? query.endDate;
  for (const date of [start, end]) {
    if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !isDateString(date, { strict: true })))
      throw new ApiError(400, "Dates must use YYYY-MM-DD");
  }
  if (start && end && start > end) throw new ApiError(400, "endDate must not precede startDate");
  if (start) qb.andWhere('attribute."createdAt" >= CAST(:start AS date)', { start });
  if (end) qb.andWhere('attribute."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
  const columns = { name: "attribute.name", attributeGroup: "attributeGroup.name",
    sortOrder: "attribute.sortOrder", createdAt: "attribute.createdAt" };
  const sortBy = query.sortBy ?? "sortOrder", direction = query.sortOrder ?? "ASC";
  if (typeof sortBy !== "string" || !Object.prototype.hasOwnProperty.call(columns, sortBy) || !["ASC", "DESC"].includes(direction))
    throw new ApiError(400, "Invalid sorting");
  qb.orderBy(columns[sortBy], direction).addOrderBy("attribute.id", "ASC");
  return { qb, page, limit };
}

export class AttributeService {
  constructor(private db = AppDataSource) {}
  async save(input: unknown, id?: string) {
    const dto = await validateAttribute(input, !id);
    const repo = this.db.getRepository(Attribute);
    if (id && !(await repo.existsBy({ id }))) throw new ApiError(404, "Attribute not found");
    const groupId = dto.attributeGroupId ?? (!id ? DEFAULT_ATTRIBUTE_GROUP_ID : undefined);
    if (groupId !== undefined) {
      if (!(await this.db.getRepository(AttributeGroup).existsBy({ id: groupId })))
        throw new ApiError(400, "Attribute group not found; select an existing group");
      dto.attributeGroupId = groupId;
    }
    try {
      if (!id) {
        const row = await repo.save(repo.create(dto));
        return repo.findOneOrFail({ where: { id: row.id }, relations: ["attributeGroup"] });
      }
      const result = await repo.update(id, dto);
      if (!result.affected) throw new ApiError(404, "Attribute not found");
      const row = await repo.findOne({ where: { id }, relations: ["attributeGroup"] });
      if (!row) throw new ApiError(404, "Attribute not found");
      return row;
    } catch (error) {
      if (error.code === "23505") throw new ApiError(409, "An attribute with this name already exists in this group");
      throw error;
    }
  }
}
