import { Router } from "express";

import { StockStatusController } from "../controllers/stock-status.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("stock-status", "create"),
  StockStatusController.createStockStatus,
);

router.get(
  "/",
  authenticate,
  checkPermission("stock-status", "read"),
  StockStatusController.getStockStatuses,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("stock-status", "read"),
  StockStatusController.getStockStatusById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("stock-status", "update"),
  StockStatusController.updateStockStatus,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("stock-status", "delete"),
  StockStatusController.deleteStockStatus,
);

export default router;
