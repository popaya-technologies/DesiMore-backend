"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/category.routes.ts
const express_1 = require("express");
const category_controller_1 = require("../controllers/category.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "create"), category_controller_1.CategoryController.createCategory);
router.get("/", category_controller_1.CategoryController.getCategories);
router.get("/:id", category_controller_1.CategoryController.getCategoryById);
router.get("/:slug", category_controller_1.CategoryController.getCategoryBySlug);
router.put("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "update"), category_controller_1.CategoryController.updateCategory);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("category", "delete"), category_controller_1.CategoryController.deleteCategory);
exports.default = router;
