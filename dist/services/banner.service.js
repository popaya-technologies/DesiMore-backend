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
exports.validateBannerInput = validateBannerInput;
exports.bannerResponse = bannerResponse;
exports.bannerQuery = bannerQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const banner_entity_1 = require("../entities/banner.entity");
const banner_dto_1 = require("../dto/banner.dto");
const api_error_1 = require("../utils/api-error");
function safeUrl(value, image) {
    if (/[\s\\\u0000-\u001f\u007f]/.test(value))
        return false;
    if (value.startsWith("/") && !value.startsWith("//"))
        return !image || value.startsWith("/uploads/") || value.startsWith("/catalog/");
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
    }
    catch (_a) {
        return false;
    }
}
function validateBannerInput(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Banner must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(banner_dto_1.CreateBannerDto, input) : (0, class_transformer_1.plainToInstance)(banner_dto_1.UpdateBannerDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true,
            validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid banner data", errors);
        if (dto.name !== undefined)
            dto.name = dto.name.trim();
        if (dto.slides !== undefined) {
            dto.slides = dto.slides.map(slide => {
                var _a, _b, _c;
                const image = slide.image.trim();
                const link = ((_a = slide.link) !== null && _a !== void 0 ? _a : "").trim();
                if (!safeUrl(image, true))
                    throw new api_error_1.ApiError(400, "Slide image must be HTTP(S), /uploads/ or /catalog/");
                if (link && !safeUrl(link, false))
                    throw new api_error_1.ApiError(400, "Slide link must be HTTP(S) or a site-relative path");
                return { title: ((_b = slide.title) !== null && _b !== void 0 ? _b : "").trim(), link, image, sortOrder: (_c = slide.sortOrder) !== null && _c !== void 0 ? _c : 0 };
            });
        }
        return dto;
    });
}
function bannerResponse(banner) {
    return Object.assign(Object.assign({}, banner), { slides: [...banner.slides].sort((a, b) => a.sortOrder - b.sortOrder), slideCount: banner.slides.length });
}
function integer(value, fallback, max, key) {
    if (value === undefined)
        return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || Number(value) > max)
        throw new api_error_1.ApiError(400, "Invalid " + key);
    return Number(value);
}
function bannerQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "date", "startDate", "endDate", "isActive", "page", "limit", "sortBy", "sortOrder", "format"];
    if (Object.keys(query).some(key => !allowed.includes(key)))
        throw new api_error_1.ApiError(400, "Unknown banner query parameter");
    const page = integer(query.page, 1, 1000000, "page");
    const limit = integer(query.limit, 10, 100, "limit");
    const qb = data_source_1.AppDataSource.getRepository(banner_entity_1.Banner).createQueryBuilder("banner");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        // Literal search: SQL LIKE wildcards in user input do not broaden the match.
        qb.andWhere("banner.name ILIKE :search", {
            search: "%" + query.search.trim().replace(/[\\%_]/g, "\\$&") + "%",
        });
    }
    if (query.isActive !== undefined) {
        if (!["true", "false"].includes(query.isActive))
            throw new api_error_1.ApiError(400, "Invalid isActive");
        qb.andWhere("banner.isActive = :active", { active: query.isActive === "true" });
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
        qb.andWhere('banner."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('banner."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "createdAt", sortOrder = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "DESC";
    if (!["name", "isActive", "createdAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
        throw new api_error_1.ApiError(400, "Invalid banner sorting");
    qb.orderBy("banner." + sortBy, sortOrder).addOrderBy("banner.id", "ASC");
    return { qb, page, limit };
}
