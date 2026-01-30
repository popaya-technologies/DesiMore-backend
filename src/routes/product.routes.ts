// routes/product.routes.ts
import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import multer from "multer";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
  "/",
  authenticate,
  checkPermission("product", "create"),
  ProductController.createProduct
);

// Batch import products via XLSX/CSV
router.post(
  "/imports",
  authenticate,
  checkPermission("product", "create"),
  upload.single("file"),
  ProductController.importProducts
);

router.get("/", ProductController.getProducts);
router.get("/search", ProductController.searchProducts);
router.get(
  "/categories/:slug/products",
  ProductController.getProductsByCategory
);
router.get("/categories/id/:id", ProductController.getProductsByCategoryId);
router.get("/:id/related", ProductController.getRelatedProducts);
router.get("/:id", ProductController.getProductById);

router.patch(
  "/:id",
  authenticate,
  checkPermission("product", "update"),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("product", "delete"),
  ProductController.deleteProduct
);

export default router;
