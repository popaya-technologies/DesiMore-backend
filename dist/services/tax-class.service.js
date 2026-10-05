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
exports.TaxClassService = void 0;
exports.validateTaxClass = validateTaxClass;
exports.taxClassQuery = taxClassQuery;
exports.createTaxRate = createTaxRate;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const tax_class_entity_1 = require("../entities/tax-class.entity");
const tax_class_dto_1 = require("../dto/tax-class.dto");
const api_error_1 = require("../utils/api-error");
const tax_class_dto_2 = require("../dto/tax-class.dto");
function validateTaxClass(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Tax class must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(tax_class_dto_1.CreateTaxClassDto, input) : (0, class_transformer_1.plainToInstance)(tax_class_dto_1.UpdateTaxClassDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid tax class data", errors);
        if (dto.title !== undefined) {
            dto.title = dto.title.trim();
            if (/[\u0000-\u001f\u007f]/.test(dto.title))
                throw new api_error_1.ApiError(400, "name cannot contain control characters");
        }
        if (dto.description !== undefined) {
            dto.description = dto.description.trim();
            if (dto.description.includes("\u0000"))
                throw new api_error_1.ApiError(400, "description cannot contain null characters");
        }
        if (dto.rules) {
            const seen = new Set();
            for (const rule of dto.rules) {
                rule.taxRateId = rule.taxRateId.toLowerCase();
                rule.basedOn = (_a = rule.basedOn) !== null && _a !== void 0 ? _a : "shipping";
                rule.priority = (_b = rule.priority) !== null && _b !== void 0 ? _b : 1;
                const key = `${rule.taxRateId}:${rule.basedOn}`;
                if (seen.has(key))
                    throw new api_error_1.ApiError(400, "Duplicate tax rate and address basis");
                seen.add(key);
            }
        }
        return dto;
    });
}
function taxClassQuery(query) {
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
    const qb = data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxClass).createQueryBuilder("taxClass");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("taxClass.title ILIKE :search", {
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
        qb.andWhere('taxClass."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('taxClass."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "title", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["title", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("taxClass." + sortBy, direction).addOrderBy("taxClass.id", "ASC");
    return { qb, page, limit };
}
class TaxClassService {
    removeMany(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new api_error_1.ApiError(400, "Invalid bulk delete body");
            const dto = (0, class_transformer_1.plainToInstance)(tax_class_dto_2.BulkDeleteTaxClassDto, input);
            const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid tax class IDs", errors);
            const ids = dto.ids.map(id => id.toLowerCase()).sort();
            yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(tax_class_entity_1.TaxClass);
                for (const id of ids) {
                    const row = yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
                    if (!row)
                        throw new api_error_1.ApiError(404, "Tax class not found; no statuses were deleted");
                }
                yield repo.delete(ids);
            }));
            return { message: "Tax classes deleted successfully", deletedCount: ids.length };
        });
    }
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateTaxClass(input, !id);
            try {
                return yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    const repo = manager.getRepository(tax_class_entity_1.TaxClass);
                    const row = id ? yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : repo.create();
                    if (!row)
                        throw new api_error_1.ApiError(404, "Tax class not found");
                    if (dto.title !== undefined)
                        row.title = dto.title;
                    if (dto.description !== undefined)
                        row.description = dto.description;
                    if (dto.rules)
                        for (const taxRateId of [...new Set(dto.rules.map(r => r.taxRateId))].sort()) {
                            const rate = yield manager.getRepository(tax_class_entity_1.TaxRate).findOne({ where: { id: taxRateId }, lock: { mode: "pessimistic_read" } });
                            if (!rate)
                                throw new api_error_1.ApiError(400, "Selected tax rate does not exist");
                        }
                    yield repo.save(row);
                    const ruleRepo = manager.getRepository(tax_class_entity_1.TaxClassRule);
                    if (dto.rules !== undefined) {
                        yield ruleRepo.delete({ taxClassId: row.id });
                        if (dto.rules.length)
                            yield ruleRepo.save(dto.rules.map(rule => ruleRepo.create(Object.assign(Object.assign({}, rule), { taxClassId: row.id }))));
                    }
                    return repo.findOne({ where: { id: row.id }, relations: ["rules", "rules.taxRate"], order: { rules: { priority: "ASC", id: "ASC" } } });
                }));
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Tax class name already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.getRepository(tax_class_entity_1.TaxClass).delete(id);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Tax class not found");
                return { message: "Tax class deleted successfully" };
            }
            catch (error) {
                if (error.code === "23503")
                    throw new api_error_1.ApiError(409, "This tax class is in use and cannot be deleted");
                throw error;
            }
        });
    }
}
exports.TaxClassService = TaxClassService;
function createTaxRate(input) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw new api_error_1.ApiError(400, "Invalid tax rate");
        const dto = (0, class_transformer_1.plainToInstance)(tax_class_dto_2.CreateTaxRateDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid tax rate", errors);
        dto.name = dto.name.trim();
        if (/[\u0000-\u001f\u007f]/.test(dto.name))
            throw new api_error_1.ApiError(400, "Invalid rate name");
        const repo = data_source_1.AppDataSource.getRepository(tax_class_entity_1.TaxRate);
        try {
            return yield repo.save(repo.create({ name: dto.name, rate: dto.rate.toFixed(4), type: (_a = dto.type) !== null && _a !== void 0 ? _a : "percentage" }));
        }
        catch (error) {
            if (error.code === "23505")
                throw new api_error_1.ApiError(409, "Tax rate name already exists");
            throw error;
        }
    });
}
