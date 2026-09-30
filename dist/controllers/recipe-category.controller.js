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
exports.RecipeCategoryController = void 0;
const data_source_1 = require("../data-source");
const recipe_category_entity_1 = require("../entities/recipe-category.entity");
const recipe_category_service_1 = require("../services/recipe-category.service");
const api_error_1 = require("../utils/api-error");
const handle = (action) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield action(req, res);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.RecipeCategoryController = {
    create: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const category = yield new recipe_category_service_1.RecipeCategoryService().save(req.body);
        res.status(201).json(category);
    })),
    update: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const category = yield new recipe_category_service_1.RecipeCategoryService().save(req.body, String(req.params.id));
        res.json(category);
    })),
    get: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const category = yield data_source_1.AppDataSource.getRepository(recipe_category_entity_1.RecipeCategory).findOneBy({
            id: String(req.params.id),
        });
        if (!category) {
            throw new api_error_1.ApiError(404, "Recipe category not found");
        }
        res.json(category);
    })),
    list: handle((_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const repository = data_source_1.AppDataSource.getRepository(recipe_category_entity_1.RecipeCategory);
        const categories = yield repository.find({
            order: {
                sortOrder: "ASC",
                name: "ASC",
            },
        });
        res.json({
            data: categories,
            meta: {
                total: categories.length,
                page: 1,
                limit: categories.length,
                totalPages: categories.length ? 1 : 0,
            },
        });
    })),
    remove: handle((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const repository = data_source_1.AppDataSource.getRepository(recipe_category_entity_1.RecipeCategory);
        const result = yield repository.delete(String(req.params.id));
        if (!result.affected) {
            throw new api_error_1.ApiError(404, "Recipe category not found");
        }
        res.json({
            message: "Recipe category deleted successfully",
        });
    })),
};
