import { Router } from "express";
import { ParentCategoryController } from "../controllers/parent-category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("parent-category", "create"),
  ParentCategoryController.createParentCategory
);

router.get("/", ParentCategoryController.getParentCategories);
router.get("/:id/categories", ParentCategoryController.getCategoriesByParent);
router.get("/:id", ParentCategoryController.getParentCategoryById);

router.put(
  "/:id",
  authenticate,
  checkPermission("parent-category", "update"),
  ParentCategoryController.updateParentCategory
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("parent-category", "delete"),
  ParentCategoryController.deleteParentCategory
);

export default router;
