// routes/category.routes.ts
import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("category", "create"),
  CategoryController.createCategory
);

router.get("/", CategoryController.getCategories);
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
