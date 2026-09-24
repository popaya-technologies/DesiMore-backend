// routes/product.routes.ts
import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  checkPermission,
  checkAnyPermission,
} from "../middlewares/rbac.middleware";
import multer from "multer";
import { isUUID } from "class-validator";

const router = Router();
router.param("id", (_req, res, next, id) => {
  if (!isUUID(id)) {
    res.status(400).json({ message: "Invalid product/category ID" });
    return;
  }
  next();
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/",
  authenticate,
  checkPermission("product", "create"),
  ProductController.createProduct,
);

// Batch import products via XLSX/CSV
router.post(
  "/imports",
  authenticate,
  checkPermission("product", "create"),
  upload.single("file"),
  ProductController.importProducts,
);

router.get(
  "/form-options",
  authenticate,
  checkAnyPermission("product", ["create", "update"]),
  ProductController.getFormOptions,
);
router.get(
  "/:id/edit",
  authenticate,
  checkAnyPermission("product", ["create", "update"]),
  ProductController.getProductForEdit,
);
router.get("/", ProductController.getProducts);
router.get("/search", ProductController.searchProducts);
router.get(
  "/categories/:slug/products",
  ProductController.getProductsByCategory,
);
router.get("/categories/id/:id", ProductController.getProductsByCategoryId);
router.get("/:id/related", ProductController.getRelatedProducts);
router.get("/:id", ProductController.getProductById);

router.patch(
  "/:id",
  authenticate,
  checkPermission("product", "update"),
  ProductController.updateProduct,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("product", "delete"),
  ProductController.deleteProduct,
);

router.use((error: any, _req: any, res: any, _next: any) => {
  res
    .status(error instanceof multer.MulterError ? 400 : 500)
    .json({
      message:
        error instanceof multer.MulterError
          ? error.message
          : "Internal server error",
    });
});
export default router;
