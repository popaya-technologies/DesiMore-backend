import { Router } from "express";
import { BrandController } from "../controllers/brand.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("brand", "create"),
  BrandController.createBrand
);

router.get("/", BrandController.getBrands);
router.get("/:id", BrandController.getBrandById);

router.put(
  "/:id",
  authenticate,
  checkPermission("brand", "update"),
  BrandController.updateBrand
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("brand", "delete"),
  BrandController.deleteBrand
);

export default router;

