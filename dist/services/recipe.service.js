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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
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
const recipe_category_entity_1 = require("../entities/recipe-category.entity");
const seo_url_entity_1 = require("../entities/seo-url.entity");
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
            if (dto.seoKeyword && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dto.seoKeyword))
                throw new api_error_1.ApiError(400, "SEO keyword must contain lowercase letters, numbers and single hyphens only");
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
        if (dto.categoryIds !== undefined)
            dto.categoryIds = [...new Set(dto.categoryIds)];
        if (dto.relatedProducts !== undefined) {
            dto.relatedProducts = [...new Set(dto.relatedProducts.map(value => cleanText(value, "relatedProducts")).filter(Boolean))];
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
                    // Lock only the recipe row. PostgreSQL cannot apply FOR UPDATE to the
                    // nullable side of the LEFT JOIN generated when relations are loaded.
                    const existing = id ? yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } }) : null;
                    if (id && !existing)
                        throw new api_error_1.ApiError(404, "Recipe not found");
                    const recipe = existing !== null && existing !== void 0 ? existing : repo.create({
                        description: "", metaDescription: "", metaKeywords: "", sortOrder: 0, isActive: true,
                        image: null, additionalImages: [], categories: [], relatedProducts: [],
                        seoKeyword: null,
                    });
                    const { categoryIds } = dto, fields = __rest(dto, ["categoryIds"]);
                    Object.assign(recipe, fields);
                    if (categoryIds !== undefined) {
                        const categories = categoryIds.length
                            ? yield manager.getRepository(recipe_category_entity_1.RecipeCategory).findByIds(categoryIds)
                            : [];
                        if (categories.length !== categoryIds.length)
                            throw new api_error_1.ApiError(400, "One or more recipe categories do not exist");
                        recipe.categories = categories;
                    }
                    recipe.additionalImages = [...((_a = recipe.additionalImages) !== null && _a !== void 0 ? _a : [])].sort((a, b) => a.sortOrder - b.sortOrder);
                    if (!recipe.seoKeyword) {
                        recipe.seoKeyword = recipe.name
                            .normalize("NFKD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "") || "recipe";
                    }
                    const saved = yield repo.save(recipe);
                    const seoRepo = manager.getRepository(seo_url_entity_1.SeoUrl);
                    const query = `recipe_id=${saved.id}`;
                    const mapping = yield seoRepo.findOne({
                        where: { query, store: "Default", language: "English" },
                    });
                    const conflict = yield seoRepo.findOne({
                        where: { keyword: saved.seoKeyword, store: "Default", language: "English" },
                    });
                    if (conflict && conflict.id !== (mapping === null || mapping === void 0 ? void 0 : mapping.id))
                        throw new api_error_1.ApiError(409, "This SEO keyword is already used by another resource");
                    yield seoRepo.save(mapping
                        ? Object.assign(mapping, { keyword: saved.seoKeyword })
                        : seoRepo.create({
                            query,
                            keyword: saved.seoKeyword,
                            store: "Default",
                            language: "English",
                        }));
                    return saved;
                }));
            }
            catch (error) {
                if (error.code === "23505")
                    throw new api_error_1.ApiError(409, "Recipe name or SEO keyword already exists");
                throw error;
            }
        });
    }
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.db.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repo = manager.getRepository(recipe_entity_1.Recipe);
                const recipe = yield repo.findOne({ where: { id }, lock: { mode: "pessimistic_write" } });
                if (!recipe)
                    throw new api_error_1.ApiError(404, "Recipe not found");
                yield manager.getRepository(seo_url_entity_1.SeoUrl).delete({
                    query: `recipe_id=${id}`,
                    store: "Default",
                    language: "English",
                });
                yield repo.remove(recipe);
                return { message: "Recipe deleted successfully" };
            }));
        });
    }
}
exports.RecipeService = RecipeService;
function recipeQuery(query) {
    var _a, _b, _c, _d;
    const allowed = ["search", "categoryId", "isActive", "date", "startDate", "endDate", "page", "limit", "sortBy", "sortOrder", "format"];
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
    const qb = data_source_1.AppDataSource.getRepository(recipe_entity_1.Recipe).createQueryBuilder("recipe")
        .leftJoinAndSelect("recipe.categories", "category")
        .distinct(true);
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
    if (query.categoryId !== undefined) {
        if (typeof query.categoryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.categoryId))
            throw new api_error_1.ApiError(400, "Invalid recipe category ID");
        qb.andWhere("category.id = :categoryId", { categoryId: query.categoryId });
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
    const sortColumns = {
        name: "recipe.name",
        sortOrder: "recipe.sortOrder",
        isActive: "recipe.isActive",
        createdAt: "recipe.createdAt",
    };
    qb.orderBy(sortColumns[String(sortBy)], direction).addOrderBy("recipe.id", "ASC");
    return { qb, page, limit };
}
