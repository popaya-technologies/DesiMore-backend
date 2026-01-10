"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/product.routes.ts
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "create"), product_controller_1.ProductController.createProduct);
router.get("/", product_controller_1.ProductController.getProducts);
router.get("/categories/:slug/products", product_controller_1.ProductController.getProductsByCategory);
router.get("/categories/id/:id", product_controller_1.ProductController.getProductsByCategoryId);
router.get("/:id/related", product_controller_1.ProductController.getRelatedProducts);
router.get("/:id", product_controller_1.ProductController.getProductById);
router.patch("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "update"), product_controller_1.ProductController.updateProduct);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "delete"), product_controller_1.ProductController.deleteProduct);
exports.default = router;
