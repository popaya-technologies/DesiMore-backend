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
exports.TaxRateService = exports.taxRateResponse = exports.taxRateRelations = void 0;
exports.validateTaxRate = validateTaxRate;
exports.taxRateQuery = taxRateQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const tax_class_entity_1 = require("../entities/tax-class.entity");
const tax_rate_dto_1 = require("../dto/tax-rate.dto");
const api_error_1 = require("../utils/api-error");
const tax_rate_dto_2 = require("../dto/tax-rate.dto");
const geo_zone_entity_1 = require("../entities/geo_zone.entity");
const customer_group_entity_1 = require("../entities/customer-group.entity");
exports.taxRateRelations = ["geoZone", "customerGroups"];
const taxRateResponse = (row) => {
    var _a, _b, _c;
    return ({
        id: row.id, name: row.name, rate: row.rate, type: row.type,
        geoZoneId: (_a = row.geoZoneId) !== null && _a !== void 0 ? _a : null,
        geoZone: row.geoZone ? { id: row.geoZone.id, name: row.geoZone.name } : null,
        customerGroupIds: ((_b = row.customerGroups) !== null && _b !== void 0 ? _b : []).map(g => g.id),
        customerGroups: ((_c = row.customerGroups) !== null && _c !== void 0 ? _c : []).map(g => ({ id: g.id, name: g.name })),
        createdAt: row.createdAt, updatedAt: row.updatedAt,
    });
};
exports.taxRateResponse = taxRateResponse;
function validateTaxRate(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Tax rate must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(tax_rate_dto_1.CreateTaxRateDto, input) : (0, class_transformer_1.plainToInstance)(tax_rate_dto_1.UpdateTaxRateDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid tax rate data", errors);
        if (creating && (dto.name === undefined || dto.rate === undefined))
            throw new api_error_1.ApiError(400, "name and rate are required");
        if (dto.name !== undefined) {
            dto.name = dto.name.trim();
            if (/[\u0000-\u001f\u007f]/.test(dto.name))
                throw new api_error_1.ApiError(400, "name cannot contain control characters");
        }
        return dto;
    });
}
function taxRateQuery(query) {
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
    const qb = data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxRate).createQueryBuilder("taxRate");
    qb.leftJoinAndSelect("taxRate.geoZone", "geoZone").leftJoinAndSelect("taxRate.customerGroups", "customerGroup");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("taxRate.name ILIKE :search", {
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
        qb.andWhere('taxRate."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('taxRate."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "name", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["name", "rate", "type", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("taxRate." + sortBy, direction).addOrderBy("taxRate.id", "ASC");
    return { qb, page, limit };
}
class TaxRateService {
    removeMany(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new api_error_1.ApiError(400, "Invalid bulk delete body");
            const dto = (0, class_transformer_1.plainToInstance)(tax_rate_dto_2.BulkDeleteTaxRateDto, input);
            const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid tax rate IDs", errors);
            const ids = dto.ids.map(id => id.toLowerCase()).sort();
            yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(tax_class_entity_1.TaxRate);
                for (const id of ids) {
                    const row = yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
                    if (!row)
                        throw new api_error_1.ApiError(404, "Tax rate not found; no statuses were deleted");
                }
                yield repo.delete(ids);
            }));
            return { message: "Tax rates deleted successfully", deletedCount: ids.length };
        });
    }
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateTaxRate(input, !id);
            try {
                return yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    const repo = manager.getRepository(tax_class_entity_1.TaxRate);
                    const row = id ? yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : repo.create({ type: "percentage", geoZoneId: null });
                    if (!row)
                        throw new api_error_1.ApiError(404, "Tax rate not found");
                    if (dto.name !== undefined)
                        row.name = dto.name;
                    if (dto.rate !== undefined)
                        row.rate = dto.rate.toFixed(4);
                    if (dto.type !== undefined)
                        row.type = dto.type;
                    if (dto.geoZoneId !== undefined) {
                        if (dto.geoZoneId && !(yield manager.getRepository(geo_zone_entity_1.GeoZone).findOneBy({ id: dto.geoZoneId })))
                            throw new api_error_1.ApiError(400, "Geo zone not found");
                        row.geoZoneId = dto.geoZoneId;
                    }
                    if (dto.customerGroupIds !== undefined) {
                        row.customerGroups = [];
                        for (const groupId of dto.customerGroupIds) {
                            const group = yield manager.getRepository(customer_group_entity_1.CustomerGroup).findOneBy({ id: groupId });
                            if (!group)
                                throw new api_error_1.ApiError(400, "Customer group not found");
                            row.customerGroups.push(group);
                        }
                    }
                    yield repo.save(row);
                    return (0, exports.taxRateResponse)(yield repo.findOne({ where: { id: row.id }, relations: exports.taxRateRelations }));
                }));
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Tax rate name already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.getRepository(tax_class_entity_1.TaxRate).delete(id);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Tax rate not found");
                return { message: "Tax rate deleted successfully" };
            }
            catch (error) {
                if (error.code === "23503")
                    throw new api_error_1.ApiError(409, "This tax rate is in use and cannot be deleted");
                throw error;
            }
        });
    }
}
exports.TaxRateService = TaxRateService;
