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
exports.LanguageEditorService = exports.validateTranslationIds = void 0;
exports.validateTranslation = validateTranslation;
exports.translationQuery = translationQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const language_translation_entity_1 = require("../entities/language-translation.entity");
const language_editor_dto_1 = require("../dto/language-editor.dto");
const api_error_1 = require("../utils/api-error");
function validated(type, input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Request must be a nonempty object");
        const dto = (0, class_transformer_1.plainToInstance)(type, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid translation data", errors);
        return dto;
    });
}
function validateTranslation(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dto = creating ? yield validated(language_editor_dto_1.CreateTranslationDto, input) : yield validated(language_editor_dto_1.UpdateTranslationDto, input);
        for (const key of ["store", "language", "route", "key"]) {
            if (dto[key] !== undefined) {
                dto[key] = dto[key].trim();
                if (/[\u0000-\u001f\u007f]/.test(dto[key]))
                    throw new api_error_1.ApiError(400, key + " cannot contain control characters");
            }
        }
        if ((_a = dto.value) === null || _a === void 0 ? void 0 : _a.includes("\u0000"))
            throw new api_error_1.ApiError(400, "value cannot contain a null character");
        return dto;
    });
}
const validateTranslationIds = (input) => validated(language_editor_dto_1.DeleteTranslationsDto, input);
exports.validateTranslationIds = validateTranslationIds;
function translationQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "store", "language", "route", "key", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
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
    const qb = data_source_1.AppDataSource.getRepository(language_translation_entity_1.LanguageTranslation).createQueryBuilder("translation");
    for (const [key, max] of [["store", 100], ["language", 50], ["route", 255], ["key", 255]]) {
        if (query[key] !== undefined) {
            if (typeof query[key] !== "string" || !query[key].trim() || query[key].length > max)
                throw new api_error_1.ApiError(400, "Invalid " + key + " filter");
            qb.andWhere('translation."' + key + '" = :' + key, { [key]: query[key].trim() });
        }
    }
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        const search = "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%";
        qb.andWhere(new typeorm_1.Brackets(inner => {
            for (const key of ["store", "language", "route", "key", "value"])
                inner.orWhere('translation."' + key + '" ILIKE :search', { search });
        }));
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
        qb.andWhere('translation."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('translation."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "createdAt", sortOrder = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "DESC";
    if (!["store", "language", "route", "key", "value", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy('translation."' + sortBy + '"', sortOrder).addOrderBy("translation.id", "ASC");
    return { qb, page, limit };
}
class LanguageEditorService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateTranslation(input, !id);
            const repo = this.db.getRepository(language_translation_entity_1.LanguageTranslation);
            try {
                if (!id)
                    return yield repo.save(repo.create(dto));
                const result = yield repo.update(id, dto);
                if (!result.affected)
                    throw new api_error_1.ApiError(404, "Translation not found");
                const row = yield repo.findOneBy({ id });
                if (!row)
                    throw new api_error_1.ApiError(404, "Translation not found");
                return row;
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "A translation already exists for this store, language, route and key");
                throw error;
            }
        });
    }
    deleteMany(input) {
        return __awaiter(this, void 0, void 0, function* () {
            const { ids } = yield (0, exports.validateTranslationIds)(input);
            return this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(language_translation_entity_1.LanguageTranslation);
                const rows = yield repo.find({ where: { id: (0, typeorm_1.In)(ids) }, order: { id: "ASC" }, lock: { mode: "pessimistic_write" } });
                if (rows.length !== ids.length)
                    throw new api_error_1.ApiError(404, "One or more translations were not found; nothing deleted");
                yield repo.delete(ids);
                return { message: "Translations deleted successfully", deletedCount: ids.length };
            }));
        });
    }
}
exports.LanguageEditorService = LanguageEditorService;
