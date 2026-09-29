import { Router } from "express";
import { ProductReturnController } from "../controllers/product-return.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("product_return", "create"),
  ProductReturnController.createProductReturn,
);

router.get("/", ProductReturnController.getProductReturns);

router.get("/:id", ProductReturnController.getProductReturnById);

router.put(
  "/:id",
  authenticate,
  checkPermission("product_return", "update"),
  ProductReturnController.updateProductReturn,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("product_return", "delete"),
  ProductReturnController.deleteProductReturn,
);

export default router;
