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
exports.CategoryController = void 0;
const data_source_1 = require("../data-source");
const category_entity_1 = require("../entities/category.entity");
const parent_category_entity_1 = require("../entities/parent-category.entity");
const category_dto_1 = require("../dto/category.dto");
const class_validator_1 = require("class-validator");
const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
const parentCategoryRepository = data_source_1.AppDataSource.getRepository(parent_category_entity_1.ParentCategory);
exports.CategoryController = {
    //Create Category (Admin only)
    createCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const categoryData = new category_dto_1.CreateCategoryDto();
            Object.assign(categoryData, req.body);
            const errors = yield (0, class_validator_1.validate)(categoryData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            let parentCategory = null;
            if (categoryData.parentCategoryId) {
                parentCategory = yield parentCategoryRepository.findOne({
                    where: { id: categoryData.parentCategoryId },
                });
                if (!parentCategory) {
                    res.status(404).json({ message: "Parent category not found" });
                    return;
                }
            }
            const category = categoryRepository.create(categoryData);
            category.parentCategory = parentCategory;
            yield categoryRepository.save(category);
            const createdCategory = yield categoryRepository.findOne({
                where: { id: category.id },
                relations: ["parentCategory"],
            });
            res.status(201).json(createdCategory !== null && createdCategory !== void 0 ? createdCategory : category);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    //Get all Categories (public)
    getCategories: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { active } = req.query;
            const query = categoryRepository
                .createQueryBuilder("category")
                .leftJoinAndSelect("category.parentCategory", "parentCategory");
            if (active === "true") {
                query.where("category.isActive = :isActive", { isActive: true });
            }
            query.orderBy("category.displayOrder", "ASC");
            const categories = yield query.getMany();
            res.status(200).json(categories);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Get Single Category with Products (Public)
    getCategoryBySlug: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const category = yield categoryRepository.findOne({
                where: { slug: req.params.slug },
                relations: ["products", "parentCategory"],
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            res.status(200).json(category);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getCategoryById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const category = yield categoryRepository.findOne({
                where: { id: req.params.id },
                relations: ["products", "parentCategory"],
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            res.status(200).json(category);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Update Category (Admin only)
    updateCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const category = yield categoryRepository.findOne({
                where: { id: req.params.id },
                relations: ["parentCategory"],
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            const updateData = new category_dto_1.UpdateCategoryDto();
            Object.assign(updateData, req.body);
            const errors = yield (0, class_validator_1.validate)(updateData);
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            let parentCategory = category.parentCategory;
            if (Object.prototype.hasOwnProperty.call(req.body, "parentCategoryId")) {
                const parentId = req.body.parentCategoryId;
                if (parentId === null || parentId === undefined || parentId === "") {
                    parentCategory = null;
                }
                else {
                    parentCategory = yield parentCategoryRepository.findOne({
                        where: { id: parentId },
                    });
                    if (!parentCategory) {
                        res.status(404).json({ message: "Parent category not found" });
                        return;
                    }
                }
            }
            else if (updateData.parentCategoryId) {
                parentCategory = yield parentCategoryRepository.findOne({
                    where: { id: updateData.parentCategoryId },
                });
                if (!parentCategory) {
                    res.status(404).json({ message: "Parent category not found" });
                    return;
                }
            }
            Object.assign(category, updateData);
            category.parentCategory = parentCategory;
            yield categoryRepository.save(category);
            const updatedCategory = yield categoryRepository.findOne({
                where: { id: category.id },
                relations: ["parentCategory"],
            });
            res.status(200).json(updatedCategory !== null && updatedCategory !== void 0 ? updatedCategory : category);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Delete Category (Admin only)
    deleteCategory: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const category = yield categoryRepository.findOne({
                where: { id: req.params.id },
                relations: ["products"],
            });
            if (!category) {
                res.status(404).json({ message: "Category not found" });
                return;
            }
            if (category.products && category.products.length > 0) {
                res.status(400).json({
                    message: "Cannot delete category with associated products",
                });
                return;
            }
            yield categoryRepository.remove(category);
            res.status(204).send();
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
