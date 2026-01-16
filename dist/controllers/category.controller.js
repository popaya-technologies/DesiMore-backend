"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const XLSX = __importStar(require("xlsx"));
const categoryRepository = data_source_1.AppDataSource.getRepository(category_entity_1.Category);
const parentCategoryRepository = data_source_1.AppDataSource.getRepository(parent_category_entity_1.ParentCategory);
const toBool = (val) => {
    if (val === undefined || val === null || val === "")
        return undefined;
    if (typeof val === "boolean")
        return val;
    const normalized = String(val).trim().toLowerCase();
    if (["1", "true", "yes", "y"].includes(normalized))
        return true;
    if (["0", "false", "no", "n"].includes(normalized))
        return false;
    return undefined;
};
const toInt = (val) => {
    if (val === undefined || val === null || val === "")
        return undefined;
    const n = Number(val);
    return Number.isFinite(n) ? n : undefined;
};
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
    // Get all category names with ids (public)
    getCategoryNames: (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const categories = yield categoryRepository.find({
                select: ["id", "name"],
                order: { name: "ASC" },
            });
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
    // Import categories from uploaded XLSX/CSV; parentCategoryId supplied separately
    importCategories: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const parentCategoryId = req.body.parentCategoryId ||
                req.query.parentCategoryId ||
                null;
            const uploadedFile = req.file;
            if (!uploadedFile || !uploadedFile.buffer) {
                res.status(400).json({ message: "No file uploaded" });
                return;
            }
            let parentCategory = null;
            if (parentCategoryId) {
                parentCategory = yield parentCategoryRepository.findOne({
                    where: { id: parentCategoryId },
                });
                if (!parentCategory) {
                    res.status(400).json({ message: "Invalid parentCategoryId" });
                    return;
                }
            }
            const workbook = XLSX.read(uploadedFile.buffer, { type: "buffer" });
            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, {
                defval: "",
                raw: false,
                blankrows: false,
            });
            if (!rows || rows.length === 0) {
                res.status(400).json({ message: "No data found in file" });
                return;
            }
            let created = 0;
            let updated = 0;
            const errors = [];
            const createdCategories = [];
            const updatedCategories = [];
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const name = (_a = row.name) === null || _a === void 0 ? void 0 : _a.toString().trim();
                if (!name) {
                    errors.push({ row: i + 2, error: "Missing name" }); // +2 accounts for header row
                    continue;
                }
                const slug = ((_b = row.slug) === null || _b === void 0 ? void 0 : _b.toString().trim()) ||
                    name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                const isActive = toBool(row.isActive);
                const displayOrder = toInt(row.displayOrder);
                const baseData = {
                    name,
                    slug,
                    description: row.description || null,
                    image: row.image || null,
                    isActive: isActive !== undefined ? isActive : true,
                    displayOrder: displayOrder !== null && displayOrder !== void 0 ? displayOrder : 0,
                    metaTitle: row.metaTitle || null,
                    metaDescription: row.metaDescription || null,
                    metaKeyword: row.metaKeyword || null,
                };
                const existing = yield categoryRepository.findOne({
                    where: [{ slug }, { name }],
                });
                if (existing) {
                    Object.assign(existing, baseData);
                    existing.parentCategory = parentCategory;
                    yield categoryRepository.save(existing);
                    updated += 1;
                    updatedCategories.push({ name: existing.name, id: existing.id });
                }
                else {
                    const newCategory = categoryRepository.create(Object.assign(Object.assign({}, baseData), { parentCategory }));
                    yield categoryRepository.save(newCategory);
                    created += 1;
                    createdCategories.push({ name: newCategory.name, id: newCategory.id });
                }
            }
            res.status(200).json({
                message: "Import completed",
                created,
                updated,
                errors,
                createdCategories,
                updatedCategories,
            });
        }
        catch (error) {
            console.error("Category import error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
