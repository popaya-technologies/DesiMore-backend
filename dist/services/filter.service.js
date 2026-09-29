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
exports.FilterService = void 0;
exports.validateFilter = validateFilter;
exports.filterResponse = filterResponse;
exports.filterQuery = filterQuery;
const crypto_1 = require("crypto");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const filter_entity_1 = require("../entities/filter.entity");
const filter_dto_1 = require("../dto/filter.dto");
const api_error_1 = require("../utils/api-error");
const cleanName = (name) => {
    const result = name.trim();
    if (/[\u0000-\u001f\u007f]/.test(result))
        throw new api_error_1.ApiError(400, "Names cannot contain control characters");
    return result;
};
function validateFilter(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Filter must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(filter_dto_1.CreateFilterDto, input) : (0, class_transformer_1.plainToInstance)(filter_dto_1.UpdateFilterDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid filter data", errors);
        if (dto.name !== undefined)
            dto.name = cleanName(dto.name);
        if (dto.values !== undefined) {
            const names = new Set(), ids = new Set();
            for (const row of dto.values) {
                row.name = cleanName(row.name);
                const key = row.name.toLowerCase();
                if (names.has(key))
                    throw new api_error_1.ApiError(400, "Filter value names must be unique");
                names.add(key);
                if (row.id !== undefined) {
                    row.id = row.id.toLowerCase();
                    if (creating || ids.has(row.id))
                        throw new api_error_1.ApiError(400, "Invalid or duplicate filter value ID");
                    ids.add(row.id);
                }
            }
        }
        return dto;
    });
}
function filterResponse(filter) {
    return Object.assign(Object.assign({}, filter), { values: [...filter.values].sort((a, b) => a.sortOrder - b.sortOrder) });
}
class FilterService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateFilter(input, !id);
            try {
                return yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const repo = manager.getRepository(filter_entity_1.FilterGroup);
                    const existing = id ? yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
                    if (id && !existing)
                        throw new api_error_1.ApiError(404, "Filter not found");
                    const filter = existing !== null && existing !== void 0 ? existing : repo.create({ sortOrder: 0, values: [] });
                    for (const key of ["name", "sortOrder"])
                        if (dto[key] !== undefined)
                            filter[key] = dto[key];
                    if (dto.values !== undefined) {
                        const previous = new Map(((_a = existing === null || existing === void 0 ? void 0 : existing.values) !== null && _a !== void 0 ? _a : []).map(row => [row.id, row]));
                        filter.values = dto.values.map(row => {
                            var _a, _b, _c;
                            const old = row.id ? previous.get(row.id) : undefined;
                            if (row.id && !old)
                                throw new api_error_1.ApiError(400, "Filter value ID does not belong to this filter");
                            return { id: (_a = row.id) !== null && _a !== void 0 ? _a : (0, crypto_1.randomUUID)(), name: row.name,
                                sortOrder: (_c = (_b = row.sortOrder) !== null && _b !== void 0 ? _b : old === null || old === void 0 ? void 0 : old.sortOrder) !== null && _c !== void 0 ? _c : 0 };
                        });
                    }
                    if (!filter.values.length)
                        throw new api_error_1.ApiError(400, "At least one filter value is required");
                    return filterResponse(yield repo.save(filter));
                }));
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Filter name already exists");
                throw error;
            }
        });
    }
}
exports.FilterService = FilterService;
function filterQuery(query) {
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
    const page = integer(query.page, 1, 1000000), limit = integer(query.limit, 20, 100);
    const qb = data_source_1.AppDataSource.getRepository(filter_entity_1.FilterGroup).createQueryBuilder("filter");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("filter.name ILIKE :search", { search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%" });
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
        qb.andWhere('filter."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('filter."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "sortOrder", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["name", "sortOrder", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("filter." + sortBy, direction).addOrderBy("filter.id", "ASC");
    return { qb, page, limit };
}
