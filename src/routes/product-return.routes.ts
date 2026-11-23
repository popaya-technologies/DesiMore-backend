import { Router } from "express";
import { ProductReturnController } from "../controllers/product-return.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("product_return", "create"),
  ProductReturnController.createProductReturn,
);

// Returns hold customer names, emails and phones, so only staff may read them.
router.get(
  "/",
  authenticate,
  requireStaff,
  checkPermission("product_return", "read"),
  ProductReturnController.getProductReturns,
);

router.get(
  "/:id",
  authenticate,
  requireStaff,
  checkPermission("product_return", "read"),
  ProductReturnController.getProductReturnById,
);

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
