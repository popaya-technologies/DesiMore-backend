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
exports.CustomerGroupService = void 0;
exports.validateCustomerGroup = validateCustomerGroup;
exports.customerGroupQuery = customerGroupQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const customer_group_entity_1 = require("../entities/customer-group.entity");
const customer_group_dto_1 = require("../dto/customer-group.dto");
const api_error_1 = require("../utils/api-error");
function validateCustomerGroup(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Customer group must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(customer_group_dto_1.CreateCustomerGroupDto, input) : (0, class_transformer_1.plainToInstance)(customer_group_dto_1.UpdateCustomerGroupDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid customer group data", errors);
        if (dto.name !== undefined) {
            dto.name = dto.name.trim();
            if (/[\u0000-\u001f\u007f]/.test(dto.name))
                throw new api_error_1.ApiError(400, "name cannot contain control characters");
        }
        if ((_a = dto.description) === null || _a === void 0 ? void 0 : _a.includes("\u0000"))
            throw new api_error_1.ApiError(400, "description cannot contain null characters");
        return dto;
    });
}
function customerGroupQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
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
    const qb = data_source_1.AppDataSource.getRepository(customer_group_entity_1.CustomerGroup).createQueryBuilder("customerGroup");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("customerGroup.name ILIKE :search", {
            search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
        });
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
        qb.andWhere('customerGroup."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('customerGroup."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "sortOrder", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["name", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("customerGroup." + sortBy, direction).addOrderBy("customerGroup.id", "ASC");
    return { qb, page, limit };
}
class CustomerGroupService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateCustomerGroup(input, !id);
            const repo = this.db.getRepository(customer_group_entity_1.CustomerGroup);
            try {
                if (!id)
                    return yield repo.save(repo.create(dto));
                const result = yield repo.update(id, dto);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Customer group not found");
                const row = yield repo.findOneBy({ id });
                if (!row)
                    throw new api_error_1.ApiError(404, "Customer group not found");
                return row;
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Customer group name already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.getRepository(customer_group_entity_1.CustomerGroup).delete(id);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Customer group not found");
                return { message: "Customer group deleted successfully" };
            }
            catch (error) {
                if (error.code === "23503")
                    throw new api_error_1.ApiError(409, "This customer group is in use and cannot be deleted");
                throw error;
            }
        });
    }
}
exports.CustomerGroupService = CustomerGroupService;
