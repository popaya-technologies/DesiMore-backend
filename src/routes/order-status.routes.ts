import { Router } from "express";
import { OrderStatusController } from "../controllers/order-status.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("order-status", "create"),
  OrderStatusController.createOrderStatus,
);

router.get(
  "/",
  authenticate,
  checkPermission("order-status", "read"),
  OrderStatusController.getOrderStatuses,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("order-status", "read"),
  OrderStatusController.getOrderStatusById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("order-status", "update"),
  OrderStatusController.updateOrderStatus,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("order-status", "delete"),
  OrderStatusController.deleteOrderStatus,
);

export default router;