"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/product.routes.ts
const express_1 = require("express");
const product_controller_1 = require("../controllers/product.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const multer_1 = __importDefault(require("multer"));
const class_validator_1 = require("class-validator");
const router = (0, express_1.Router)();
router.param("id", (_req, res, next, id) => {
    if (!(0, class_validator_1.isUUID)(id)) {
        res.status(400).json({ message: "Invalid product/category ID" });
        return;
    }
    next();
});
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "create"), product_controller_1.ProductController.createProduct);
// Batch import products via XLSX/CSV
router.post("/imports", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "create"), upload.single("file"), product_controller_1.ProductController.importProducts);
router.get("/form-options", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkAnyPermission)("product", ["create", "update"]), product_controller_1.ProductController.getFormOptions);
router.get("/:id/edit", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkAnyPermission)("product", ["create", "update"]), product_controller_1.ProductController.getProductForEdit);
router.get("/", product_controller_1.ProductController.getProducts);
router.get("/search", product_controller_1.ProductController.searchProducts);
router.get("/categories/:slug/products", product_controller_1.ProductController.getProductsByCategory);
router.get("/categories/id/:id", product_controller_1.ProductController.getProductsByCategoryId);
router.get("/:id/related", product_controller_1.ProductController.getRelatedProducts);
router.get("/:id", product_controller_1.ProductController.getProductById);
router.patch("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "update"), product_controller_1.ProductController.updateProduct);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("product", "delete"), product_controller_1.ProductController.deleteProduct);
router.use((error, _req, res, _next) => {
    res
        .status(error instanceof multer_1.default.MulterError ? 400 : 500)
        .json({
        message: error instanceof multer_1.default.MulterError
            ? error.message
            : "Internal server error",
    });
});
exports.default = router;
