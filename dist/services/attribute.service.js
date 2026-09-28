"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeService = void 0;
exports.validateAttribute = validateAttribute;
exports.attributeQuery = attributeQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const attribute_entity_1 = require("../entities/attribute.entity");
const attribute_group_entity_1 = require("../entities/attribute-group.entity");
const attribute_dto_1 = require("../dto/attribute.dto");
const api_error_1 = require("../utils/api-error");
function validateAttribute(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Attribute must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(attribute_dto_1.CreateAttributeDto, input) : (0, class_transformer_1.plainToInstance)(attribute_dto_1.UpdateAttributeDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid attribute data", errors);
        if (dto.name !== undefined) {
            dto.name = dto.name.trim();
            if (/[\u0000-\u001f\u007f]/.test(dto.name))
                throw new api_error_1.ApiError(400, "name cannot contain control characters");
        }
        return dto;
    });
}
function attributeQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "attributeGroupId", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
    if (Object.keys(query).some(key => !allowed.includes(key)))
        throw new api_error_1.ApiError(400, "Unknown query parameter");
    const integer = (value, fallback, max) => {
        if (value === undefined)
            return fallback;
        if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
            throw new api_error_1.ApiError(400, "Invalid page or limit");
        return Number(value);
    };
    const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 10, 100);
    const qb = data_source_1.AppDataSource.getRepository(attribute_entity_1.Attribute).createQueryBuilder("attribute")
        .leftJoinAndSelect("attribute.attributeGroup", "attributeGroup");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        const search = "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%";
        qb.andWhere(new typeorm_1.Brackets(inner => {
            inner.where("attribute.name ILIKE :search", { search })
                .orWhere("attributeGroup.name ILIKE :search", { search });
        }));
    }
    if (query.attributeGroupId !== undefined) {
        if (typeof query.attributeGroupId !== "string" || !(0, class_validator_1.isUUID)(query.attributeGroupId))
            throw new api_error_1.ApiError(400, "Invalid attributeGroupId");
        qb.andWhere("attribute.attributeGroupId = :groupId", { groupId: query.attributeGroupId });
    }
    if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
        throw new api_error_1.ApiError(400, "Use date or startDate/endDate");
    const start = (_a = query.date) !== null && _a !== void 0 ? _a : query.startDate, end = (_b = query.date) !== null && _b !== void 0 ? _b : query.endDate;
    for (const date of [start, end]) {
        if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(0, class_validator_1.isDateString)(date, { strict: true })))
            throw new api_error_1.ApiError(400, "Dates must use YYYY-MM-DD");
    }
    if (start && end && start > end)
        throw new api_error_1.ApiError(400, "endDate must not precede startDate");
    if (start)
        qb.andWhere('attribute."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('attribute."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const columns = { name: "attribute.name", attributeGroup: "attributeGroup.name",
        sortOrder: "attribute.sortOrder", createdAt: "attribute.createdAt" };
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "sortOrder", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (typeof sortBy !== "string" || !Object.prototype.hasOwnProperty.call(columns, sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy(columns[sortBy], direction).addOrderBy("attribute.id", "ASC");
    return { qb, page, limit };
}
class AttributeService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const dto = yield validateAttribute(input, !id);
            const repo = this.db.getRepository(attribute_entity_1.Attribute);
            if (id && !(yield repo.existsBy({ id })))
                throw new api_error_1.ApiError(404, "Attribute not found");
            const groupId = (_a = dto.attributeGroupId) !== null && _a !== void 0 ? _a : (!id ? attribute_group_entity_1.DEFAULT_ATTRIBUTE_GROUP_ID : undefined);
            if (groupId !== undefined) {
                if (!(yield this.db.getRepository(attribute_group_entity_1.AttributeGroup).existsBy({ id: groupId })))
                    throw new api_error_1.ApiError(400, "Attribute group not found; select an existing group");
                dto.attributeGroupId = groupId;
            }
            try {
                if (!id) {
                    const row = yield repo.save(repo.create(dto));
                    return repo.findOneOrFail({ where: { id: row.id }, relations: ["attributeGroup"] });
                }
                const result = yield repo.update(id, dto);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Attribute not found");
                const row = yield repo.findOne({ where: { id }, relations: ["attributeGroup"] });
                if (!row)
                    throw new api_error_1.ApiError(404, "Attribute not found");
                return row;
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "An attribute with this name already exists in this group");
                throw error;
            }
        });
    }
}
exports.AttributeService = AttributeService;
