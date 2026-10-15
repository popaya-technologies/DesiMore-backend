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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pageResponse = void 0;
exports.validatePageInput = validatePageInput;
exports.pageQuery = pageQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const data_source_1 = require("../data-source");
const page_entity_1 = require("../entities/page.entity");
const page_dto_1 = require("../dto/page.dto");
const api_error_1 = require("../utils/api-error");
function validatePageInput(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Page must be a nonempty object");
        const dto = (0, class_transformer_1.plainToInstance)(page_dto_1.UpdatePageDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid page data", errors);
        if (creating && (!dto.title || !dto.slug))
            throw new api_error_1.ApiError(400, "title and slug are required");
        if (dto.title !== undefined)
            dto.title = dto.title.trim();
        if (dto.description !== undefined)
            dto.description = (0, sanitize_html_1.default)(dto.description, {
                allowedTags: [...sanitize_html_1.default.defaults.allowedTags, "img"],
                allowedAttributes: Object.assign(Object.assign({}, sanitize_html_1.default.defaults.allowedAttributes), { img: ["src", "alt", "width", "height"] }),
                allowedSchemes: ["http", "https", "mailto"], allowProtocolRelative: false,
            });
        if (dto.media !== undefined)
            dto.media = dto.media.map(value => {
                const url = value.trim();
                let valid = false;
                if (!/[\s\\\u0000-\u001f\u007f]/.test(url)) {
                    valid = url.startsWith("/uploads/") || url.startsWith("/catalog/");
                    try {
                        const parsed = new URL(url);
                        valid = ["http:", "https:"].includes(parsed.protocol) && !!parsed.hostname && !parsed.username && !parsed.password;
                    }
                    catch (_a) { }
                }
                if (!valid)
                    throw new api_error_1.ApiError(400, "Media must be HTTP(S), /uploads/ or /catalog/ image URLs");
                return url;
            });
        return dto;
    });
}
const pageResponse = (page) => (Object.assign({}, page));
exports.pageResponse = pageResponse;
function integer(value, fallback, max, key) {
    if (value === undefined)
        return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
        throw new api_error_1.ApiError(400, "Invalid " + key);
    return Number(value);
}
function pageQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "date", "startDate", "endDate", "isActive", "page", "limit", "sortBy", "sortOrder", "format", "bottom"];
    if (Object.keys(query).some(key => !allowed.includes(key)))
        throw new api_error_1.ApiError(400, "Unknown page query parameter");
    const page = integer(query.page, 1, 1000000, "page");
    const limit = integer(query.limit, 10, 100, "limit");
    const qb = data_source_1.AppDataSource.getRepository(page_entity_1.Page).createQueryBuilder("page");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        // Literal search: SQL LIKE wildcards in user input do not broaden the match.
        qb.andWhere("(page.title ILIKE :search OR page.slug ILIKE :search)", {
            search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
        });
    }
    if (query.bottom !== undefined) {
        if (!page_entity_1.PAGE_PLACEMENTS.includes(query.bottom))
            throw new api_error_1.ApiError(400, "Invalid bottom");
        qb.andWhere("page.bottom = :bottom", { bottom: query.bottom });
    }
    if (query.isActive !== undefined) {
        if (!["true", "false"].includes(query.isActive))
            throw new api_error_1.ApiError(400, "Invalid isActive");
        qb.andWhere("page.isActive = :active", { active: query.isActive === "true" });
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
        qb.andWhere('page."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('page."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "createdAt", sortOrder = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "DESC";
    if (!["title", "slug", "sortOrder", "isActive", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
        throw new api_error_1.ApiError(400, "Invalid page sorting");
    qb.orderBy("page." + sortBy, sortOrder).addOrderBy("page.id", "ASC");
    return { qb, page, limit };
}
