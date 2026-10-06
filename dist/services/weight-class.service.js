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
exports.WeightClassService = void 0;
exports.validateWeightClass = validateWeightClass;
exports.weightClassQuery = weightClassQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const weight_class_entity_1 = require("../entities/weight-class.entity");
const weight_class_dto_1 = require("../dto/weight-class.dto");
const api_error_1 = require("../utils/api-error");
const weight_class_dto_2 = require("../dto/weight-class.dto");
function validateWeightClass(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Weight class must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(weight_class_dto_1.CreateWeightClassDto, input) : (0, class_transformer_1.plainToInstance)(weight_class_dto_1.UpdateWeightClassDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid weight class data", errors);
        for (const field of ["weightTitle", "weightUnit"]) {
            if (dto[field] !== undefined) {
                dto[field] = dto[field].trim();
                if (/[\u0000-\u001f\u007f]/.test(dto[field]))
                    throw new api_error_1.ApiError(400, field + " cannot contain control characters");
            }
        }
        return dto;
    });
}
function weightClassQuery(query) {
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
    const qb = data_source_1.AppDataSource.getRepository(weight_class_entity_1.WeightClass).createQueryBuilder("weightClass");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("(weightClass.weightTitle ILIKE :search OR weightClass.weightUnit ILIKE :search)", {
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
        qb.andWhere('weightClass."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('weightClass."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "weightTitle", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["weightTitle", "weightUnit", "value", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("weightClass." + sortBy, direction).addOrderBy("weightClass.id", "ASC");
    return { qb, page, limit };
}
class WeightClassService {
    removeMany(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new api_error_1.ApiError(400, "Invalid bulk delete body");
            const dto = (0, class_transformer_1.plainToInstance)(weight_class_dto_2.BulkDeleteWeightClassDto, input);
            const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid weight class IDs", errors);
            const ids = dto.ids.map(id => id.toLowerCase()).sort();
            yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(weight_class_entity_1.WeightClass);
                for (const id of ids) {
                    const row = yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
                    if (!row)
                        throw new api_error_1.ApiError(404, "Weight class not found; no weight classes were deleted");
                }
                yield repo.delete(ids);
            }));
            return { message: "Weight classes deleted successfully", deletedCount: ids.length };
        });
    }
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const dto = yield validateWeightClass(input, !id);
            const repo = this.db.getRepository(weight_class_entity_1.WeightClass);
            try {
                if (!id)
                    return yield repo.save(repo.create(Object.assign(Object.assign({}, dto), { value: (_a = dto.value) !== null && _a !== void 0 ? _a : 1 })));
                const result = yield repo.update(id, dto);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Weight class not found");
                const row = yield repo.findOneBy({ id });
                if (!row)
                    throw new api_error_1.ApiError(404, "Weight class not found");
                return row;
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Weight class title or unit already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.getRepository(weight_class_entity_1.WeightClass).delete(id);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Weight class not found");
                return { message: "Weight class deleted successfully" };
            }
            catch (error) {
                if (error.code === "23503")
                    throw new api_error_1.ApiError(409, "This weight class is in use and cannot be deleted");
                throw error;
            }
        });
    }
}
exports.WeightClassService = WeightClassService;
