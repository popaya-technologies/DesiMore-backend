// routes/category.routes.ts
import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
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
  checkPermission("category", "create"),
  CategoryController.createCategory
);

router.get("/", CategoryController.getCategories);

// Batch import categories via XLSX/CSV, parentCategoryId provided separately (query or body)
router.post(
  "/imports",
  authenticate,
  checkPermission("category", "create"),
  upload.single("file"),
  CategoryController.importCategories
);

router.get("/:id", CategoryController.getCategoryById);
router.get("/:slug", CategoryController.getCategoryBySlug);

router.put(
  "/:id",
  authenticate,
  checkPermission("category", "update"),
  CategoryController.updateCategory
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("category", "delete"),
  CategoryController.deleteCategory
);

export default router;
