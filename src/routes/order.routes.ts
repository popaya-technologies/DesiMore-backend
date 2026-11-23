import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

// Admin order listing
router.get(
  "/admin",
  authenticate,
  requireStaff,
  checkPermission("order", "read"),
  OrderController.adminGetAllOrders,
);
router.get(
  "/admin/:id",
  authenticate,
  requireStaff,
  checkPermission("order", "read"),
  OrderController.adminGetOrderById,
);

router.post("/", authenticate, OrderController.createOrder);
router.get("/", authenticate, OrderController.getUserOrders);
router.get("/:id", authenticate, OrderController.getOrder);
router.put(
  "/:id/status",
  authenticate,
  requireStaff,
  checkPermission("order", "update"),
  OrderController.updateOrderStatus,
);
router.put(
  "/:id/payment-status",
  authenticate,
  requireStaff,
  checkPermission("order", "update"),
  OrderController.updatePaymentStatus,
);
router.put(
  "/:id/tracking",
  authenticate,
  requireStaff,
  checkPermission("order", "update"),
  OrderController.updateOrderTracking,
);
router.post("/:id/cancel", authenticate, OrderController.cancelOrder);

export default router;
