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
exports.ParentCategoryController = void 0;
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const parent_category_entity_1 = require("../entities/parent-category.entity");
const category_entity_1 = require("../entities/category.entity");
const parent_category_dto_1 = require("../dto/parent-category.dto");
const parentCategoryRepository = data_source_1.AppDataSource.getRepository(parent_category_entity_1.ParentCategory);
const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
exports.ParentCategoryController = {
    createParentCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = new parent_category_dto_1.CreateParentCategoryDto();
            Object.assign(dto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const parentCategory = parentCategoryRepository.create(dto);
            yield parentCategoryRepository.save(parentCategory);
            res.status(201).json(parentCategory);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getParentCategories: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const parentCategories = yield parentCategoryRepository.find({
                order: { name: "ASC" },
            });
            res.status(200).json(parentCategories);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getParentCategoryById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const parentCategory = yield parentCategoryRepository.findOne({
                where: { id: req.params.id },
                relations: ["categories"],
            });
            if (!parentCategory) {
                res.status(404).json({ message: "Parent category not found" });
                return;
            }
            res.status(200).json(parentCategory);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getCategoriesByParent: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const parentCategory = yield parentCategoryRepository.findOne({
                where: { id: req.params.id },
            });
            if (!parentCategory) {
                res.status(404).json({ message: "Parent category not found" });
                return;
            }
            const categories = yield categoryRepository.find({
                where: { parentCategoryId: parentCategory.id },
                relations: ["parentCategory"],
                order: { displayOrder: "ASC", name: "ASC" },
            });
            res.status(200).json({
                parentCategory,
                categories,
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    updateParentCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const parentCategory = yield parentCategoryRepository.findOne({
                where: { id: req.params.id },
            });
            if (!parentCategory) {
                res.status(404).json({ message: "Parent category not found" });
                return;
            }
            const dto = new parent_category_dto_1.UpdateParentCategoryDto();
            Object.assign(dto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            Object.assign(parentCategory, dto);
            yield parentCategoryRepository.save(parentCategory);
            res.status(200).json(parentCategory);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    deleteParentCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const parentCategory = yield parentCategoryRepository.findOne({
                where: { id: req.params.id },
                relations: ["categories"],
            });
            if (!parentCategory) {
                res.status(404).json({ message: "Parent category not found" });
                return;
            }
            if ((_a = parentCategory.categories) === null || _a === void 0 ? void 0 : _a.length) {
                res.status(400).json({
                    message: "Cannot delete parent category with associated categories",
                });
                return;
            }
            yield parentCategoryRepository.remove(parentCategory);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
