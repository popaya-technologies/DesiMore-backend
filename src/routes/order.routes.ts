import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

// Admin order listing
router.get(
  "/admin",
  authenticate,
  checkPermission("order", "read"),
  OrderController.adminGetAllOrders
);
router.get(
  "/admin/:id",
  authenticate,
  checkPermission("order", "read"),
  OrderController.adminGetOrderById
);

router.post("/", authenticate, OrderController.createOrder);
router.get("/", authenticate, OrderController.getUserOrders);
router.get("/:id", authenticate, OrderController.getOrder);
router.put(
  "/:id/status",
  authenticate,
  checkPermission("order", "update"),
  OrderController.updateOrderStatus
);
router.put(
  "/:id/payment-status",
  authenticate,
  OrderController.updatePaymentStatus
);
router.put(
  "/:id/tracking",
  authenticate,
  checkPermission("order", "update"),
  OrderController.updateOrderTracking
);
router.post("/:id/cancel", authenticate, OrderController.cancelOrder);

export default router;
