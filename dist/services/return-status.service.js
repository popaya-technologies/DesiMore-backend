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
exports.ReturnStatusService = void 0;
exports.validateReturnStatus = validateReturnStatus;
exports.returnStatusQuery = returnStatusQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const return_status_entity_1 = require("../entities/return-status.entity");
const return_status_dto_1 = require("../dto/return-status.dto");
const api_error_1 = require("../utils/api-error");
const return_status_dto_2 = require("../dto/return-status.dto");
function validateReturnStatus(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Return status must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(return_status_dto_1.CreateReturnStatusDto, input) : (0, class_transformer_1.plainToInstance)(return_status_dto_1.UpdateReturnStatusDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid return status data", errors);
        if (dto.name !== undefined) {
            dto.name = dto.name.trim();
            if (/[\u0000-\u001f\u007f]/.test(dto.name))
                throw new api_error_1.ApiError(400, "name cannot contain control characters");
        }
        return dto;
    });
}
function returnStatusQuery(query) {
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
    const qb = data_source_1.AppDataSource.getRepository(return_status_entity_1.ReturnStatus).createQueryBuilder("returnStatus");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("returnStatus.name ILIKE :search", {
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
        qb.andWhere('returnStatus."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('returnStatus."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "name", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!["name", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(direction))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy("returnStatus." + sortBy, direction).addOrderBy("returnStatus.id", "ASC");
    return { qb, page, limit };
}
class ReturnStatusService {
    removeMany(input) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!input || typeof input !== "object" || Array.isArray(input))
                throw new api_error_1.ApiError(400, "Invalid bulk delete body");
            const dto = (0, class_transformer_1.plainToInstance)(return_status_dto_2.BulkDeleteReturnStatusDto, input);
            const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, validationError: { target: false, value: false } });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid return status IDs", errors);
            const ids = dto.ids.map(id => id.toLowerCase()).sort();
            yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(return_status_entity_1.ReturnStatus);
                for (const id of ids) {
                    const row = yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
                    if (!row)
                        throw new api_error_1.ApiError(404, "Return status not found; no statuses were deleted");
                }
                yield repo.delete(ids);
            }));
            return { message: "Return statuses deleted successfully", deletedCount: ids.length };
        });
    }
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateReturnStatus(input, !id);
            const repo = this.db.getRepository(return_status_entity_1.ReturnStatus);
            try {
                if (!id)
                    return yield repo.save(repo.create(dto));
                const result = yield repo.update(id, dto);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Return status not found");
                const row = yield repo.findOneBy({ id });
                if (!row)
                    throw new api_error_1.ApiError(404, "Return status not found");
                return row;
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Return status name already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield this.db.getRepository(return_status_entity_1.ReturnStatus).delete(id);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Return status not found");
                return { message: "Return status deleted successfully" };
            }
            catch (error) {
                if (error.code === "23503")
                    throw new api_error_1.ApiError(409, "This return status is in use and cannot be deleted");
                throw error;
            }
        });
    }
}
exports.ReturnStatusService = ReturnStatusService;
