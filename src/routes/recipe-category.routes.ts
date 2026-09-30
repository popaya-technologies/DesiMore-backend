import { Router } from "express";

import { RecipeCategoryController } from "../controllers/recipe-category.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.get(
  "/",
  authenticate,
  checkPermission("recipe_category", "read"),
  RecipeCategoryController.list,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("recipe_category", "read"),
  RecipeCategoryController.get,
);

router.post(
  "/",
  authenticate,
  checkPermission("recipe_category", "create"),
  RecipeCategoryController.create,
);

router.patch(
  "/:id",
  authenticate,
  checkPermission("recipe_category", "update"),
  RecipeCategoryController.update,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("recipe_category", "delete"),
  RecipeCategoryController.remove,
);

export default router;