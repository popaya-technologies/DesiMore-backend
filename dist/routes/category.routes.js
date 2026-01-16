"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/category.routes.ts
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "create"), category_controller_1.CategoryController.createCategory);
router.get("/", category_controller_1.CategoryController.getCategories);
// Batch import categories via XLSX/CSV, parentCategoryId provided separately (query or body)
router.post("/imports", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "create"), upload.single("file"), category_controller_1.CategoryController.importCategories);
router.get("/:id", category_controller_1.CategoryController.getCategoryById);
router.get("/:slug", category_controller_1.CategoryController.getCategoryBySlug);
router.put("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "update"), category_controller_1.CategoryController.updateCategory);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "delete"), category_controller_1.CategoryController.deleteCategory);
exports.default = router;
