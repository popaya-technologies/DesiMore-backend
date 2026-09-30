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
exports.RecipeService = void 0;
exports.validateRecipe = validateRecipe;
exports.recipeQuery = recipeQuery;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const data_source_1 = require("../data-source");
const recipe_dto_1 = require("../dto/recipe.dto");
const recipe_entity_1 = require("../entities/recipe.entity");
const api_error_1 = require("../utils/api-error");
const cleanText = (value, label) => {
    const result = value.trim();
    if (/\p{Cc}/u.test(result))
        throw new api_error_1.ApiError(400, `${label} cannot contain control characters`);
    return result;
};
const cleanImage = (value) => {
    if (value === null || value === "")
        return null;
    if (typeof value !== "string" || value.length > 2048)
        throw new api_error_1.ApiError(400, "Invalid image");
    const image = value.trim();
    if (!/^(https?:\/\/|\/uploads\/|\/catalog\/)/i.test(image) || /^https?:\/\/[^/]*@/i.test(image))
        throw new api_error_1.ApiError(400, "Image must be an HTTP(S), /uploads/, or /catalog/ path");
    return image;
};
function validateRecipe(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input) || !Object.keys(input).length)
            throw new api_error_1.ApiError(400, "Recipe must be a nonempty object");
        const dto = creating ? (0, class_transformer_1.plainToInstance)(recipe_dto_1.CreateRecipeDto, input) : (0, class_transformer_1.plainToInstance)(recipe_dto_1.UpdateRecipeDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, {
            whitelist: true,
            forbidNonWhitelisted: true,
            validationError: { target: false, value: false },
        });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid recipe data", errors);
        for (const key of ["name", "metaTitle"])
            if (dto[key] !== undefined)
                dto[key] = cleanText(dto[key], key);
        if (dto.seoKeyword !== undefined) {
            dto.seoKeyword = dto.seoKeyword === null || dto.seoKeyword.trim() === "" ? null : cleanText(dto.seoKeyword, "seoKeyword");
            if (dto.seoKeyword && !/^[A-Za-z0-9_-]+$/.test(dto.seoKeyword))
                throw new api_error_1.ApiError(400, "SEO keyword may contain only letters, numbers, hyphens and underscores");
        }
        if (dto.description !== undefined)
            dto.description = (0, sanitize_html_1.default)(dto.description);
        if (dto.image !== undefined)
            dto.image = cleanImage(dto.image);
        if (dto.additionalImages !== undefined)
            dto.additionalImages = dto.additionalImages.map(row => {
                var _a;
                return ({
                    image: cleanImage(row.image),
                    sortOrder: (_a = row.sortOrder) !== null && _a !== void 0 ? _a : 0,
                });
            });
        for (const key of ["categories", "relatedProducts"]) {
            if (dto[key] !== undefined) {
                dto[key] = [...new Set(dto[key].map(value => cleanText(value, key)).filter(Boolean))];
            }
        }
        return dto;
    });
}
class RecipeService {
    constructor(db = data_source_1.AppDataSource) {
        this.db = db;
    }
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateRecipe(input, !id);
            try {
                return yield this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const repo = manager.getRepository(recipe_entity_1.Recipe);
                    const existing = id ? yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
                    if (id && !existing)
                        throw new api_error_1.ApiError(404, "Recipe not found");
                    const recipe = existing !== null && existing !== void 0 ? existing : repo.create({
                        description: "", metaDescription: "", metaKeywords: "", sortOrder: 0, isActive: true,
                        image: null, additionalImages: [], categories: [], relatedProducts: [],
                        seoKeyword: null,
                    });
                    Object.assign(recipe, dto);
                    recipe.additionalImages = [...((_a = recipe.additionalImages) !== null && _a !== void 0 ? _a : [])].sort((a, b) => a.sortOrder - b.sortOrder);
                    return yield repo.save(recipe);
                }));
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Recipe name or SEO keyword already exists");
                throw error;
            }
        });
    }
}
exports.RecipeService = RecipeService;
function recipeQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "isActive", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
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
    const qb = data_source_1.AppDataSource.getRepository(recipe_entity_1.Recipe).createQueryBuilder("recipe");
    if (query.search !== undefined) {
        if (typeof query.search !== "string" || query.search.length > 255)
            throw new api_error_1.ApiError(400, "Invalid search");
        qb.andWhere("recipe.name ILIKE :search", { search: `%${query.search.trim().replace(/[\\%_]/g, "\\$&")}%` });
    }
    if (query.isActive !== undefined) {
        if (query.isActive !== "true" && query.isActive !== "false")
            throw new api_error_1.ApiError(400, "isActive must be true or false");
        qb.andWhere('recipe."isActive" = :isActive', { isActive: query.isActive === "true" });
    }
    if (query.date !== undefined && (query.startDate !== undefined || query.endDate !== undefined))
        throw new api_error_1.ApiError(400, "Use date or startDate/endDate");
    const start = (_a = query.date) !== null && _a !== void 0 ? _a : query.startDate, end = (_b = query.date) !== null && _b !== void 0 ? _b : query.endDate;
    for (const date of [start, end])
        if (date !== undefined && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(0, class_validator_1.isDateString)(date, { strict: true })))
            throw new api_error_1.ApiError(400, "Dates must use YYYY-MM-DD");
    if (start && end && String(start) > String(end))
        throw new api_error_1.ApiError(400, "endDate must not precede startDate");
    if (start)
        qb.andWhere('recipe."createdAt" >= CAST(:start AS date)', { start });
    if (end)
        qb.andWhere('recipe."createdAt" < CAST(:end AS date) + INTERVAL \'1 day\'', { end });
    const sortBy = (_c = query.sortBy) !== null && _c !== void 0 ? _c : "sortOrder", direction = (_d = query.sortOrder) !== null && _d !== void 0 ? _d : "ASC";
    if (!['name', 'sortOrder', 'isActive', 'createdAt'].includes(String(sortBy)) || !['ASC', 'DESC'].includes(String(direction)))
        throw new api_error_1.ApiError(400, "Invalid sorting");
    qb.orderBy(`recipe."${sortBy}"`, direction).addOrderBy("recipe.id", "ASC");
    return { qb, page, limit };
}
