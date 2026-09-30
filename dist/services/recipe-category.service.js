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
exports.RecipeCategoryService = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
const data_source_1 = require("../data-source");
const recipe_category_dto_1 = require("../dto/recipe-category.dto");
const recipe_category_entity_1 = require("../entities/recipe-category.entity");
const api_error_1 = require("../utils/api-error");
function cleanText(value, label) {
    const cleaned = value.trim();
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(cleaned)) {
        throw new api_error_1.ApiError(400, `${label} contains invalid characters`);
    }
    return cleaned;
}
function cleanImage(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value.trim() === "") {
        return null;
    }
    const image = value.trim();
    if (image.length > 2048) {
        throw new api_error_1.ApiError(400, "Image URL is too long");
    }
    if (!image.startsWith("http://") &&
        !image.startsWith("https://") &&
        !image.startsWith("/uploads/") &&
        !image.startsWith("/catalog/")) {
        throw new api_error_1.ApiError(400, "Invalid image URL");
    }
    if (/^https?:\/\/[^/]*@/i.test(image)) {
        throw new api_error_1.ApiError(400, "Invalid image URL");
    }
    return image;
}
function cleanSeoKeyword(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null || value.trim() === "") {
        return null;
    }
    const keyword = value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyword)) {
        throw new api_error_1.ApiError(400, "SEO keyword may contain only letters, numbers and hyphens");
    }
    return keyword;
}
function validateRecipeCategory(input, creating) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input ||
            typeof input !== "object" ||
            Array.isArray(input)) {
            throw new api_error_1.ApiError(400, "Request body must be an object");
        }
        const dto = creating
            ? (0, class_transformer_1.plainToInstance)(recipe_category_dto_1.CreateRecipeCategoryDto, input)
            : (0, class_transformer_1.plainToInstance)(recipe_category_dto_1.UpdateRecipeCategoryDto, input);
        const errors = yield (0, class_validator_1.validate)(dto, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
            const messages = errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); });
            throw new api_error_1.ApiError(400, messages.join(", ") ||
                "Invalid recipe category data");
        }
        if (dto.name !== undefined) {
            dto.name = cleanText(dto.name, "Recipe category name");
        }
        if (dto.metaTitle !== undefined) {
            dto.metaTitle = cleanText(dto.metaTitle, "Meta tag title");
        }
        if (dto.description !== undefined) {
            dto.description = (0, sanitize_html_1.default)(dto.description, {
                allowedTags: [
                    "p",
                    "br",
                    "strong",
                    "b",
                    "em",
                    "i",
                    "u",
                    "ul",
                    "ol",
                    "li",
                    "a",
                    "h1",
                    "h2",
                    "h3",
                    "blockquote",
                ],
                allowedAttributes: {
                    a: ["href", "target", "rel"],
                },
                allowedSchemes: ["http", "https"],
            });
        }
        if (dto.metaDescription !== undefined) {
            dto.metaDescription = cleanText(dto.metaDescription, "Meta tag description");
        }
        if (dto.metaKeywords !== undefined) {
            dto.metaKeywords = cleanText(dto.metaKeywords, "Meta tag keywords");
        }
        if (dto.image !== undefined) {
            dto.image = cleanImage(dto.image);
        }
        if (dto.seoKeyword !== undefined) {
            dto.seoKeyword = cleanSeoKeyword(dto.seoKeyword);
        }
        if (dto.columns !== undefined &&
            dto.columns < 1) {
            throw new api_error_1.ApiError(400, "Columns must be at least 1");
        }
        if (dto.sortOrder !== undefined &&
            dto.sortOrder < 0) {
            throw new api_error_1.ApiError(400, "Sort order cannot be negative");
        }
        return dto;
    });
}
class RecipeCategoryService {
    save(input, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dto = yield validateRecipeCategory(input, !id);
            return data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                const repository = manager.getRepository(recipe_category_entity_1.RecipeCategory);
                let category;
                if (id) {
                    const existing = yield repository.findOne({
                        where: { id },
                        lock: {
                            mode: "pessimistic_write",
                        },
                    });
                    if (!existing) {
                        throw new api_error_1.ApiError(404, "Recipe category not found");
                    }
                    category = existing;
                }
                else {
                    category = repository.create({
                        name: "",
                        metaTitle: "",
                    });
                }
                if (dto.parent !== undefined) {
                    if (dto.parent === id) {
                        throw new api_error_1.ApiError(400, "A recipe category cannot be its own parent");
                    }
                    if (dto.parent) {
                        const parent = yield repository.findOne({
                            where: {
                                id: dto.parent,
                            },
                        });
                        if (!parent) {
                            throw new api_error_1.ApiError(400, "Parent recipe category not found");
                        }
                    }
                }
                Object.assign(category, dto);
                try {
                    return yield repository.save(category);
                }
                catch (error) {
                    if (typeof error === "object" &&
                        error !== null &&
                        "code" in error &&
                        error.code ===
                            "23505") {
                        throw new api_error_1.ApiError(409, "Recipe category name or SEO keyword already exists");
                    }
                    throw error;
                }
            }));
        });
    }
}
exports.RecipeCategoryService = RecipeCategoryService;
