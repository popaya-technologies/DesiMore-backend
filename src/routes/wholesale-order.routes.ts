import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";
import { WholesaleOrderController } from "../controllers/wholesale-order.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("wholesale-order-request", "create"),
  WholesaleOrderController.createWholesaleOrderRequest
);

router.get(
  "/mine",
  authenticate,
  checkPermission("wholesale-order-request", "read"),
  WholesaleOrderController.getMyRequests
);

router.get(
  "/",
  authenticate,
  checkPermission("wholesale-order-request", "read-all"),
  WholesaleOrderController.getAllRequests
);

router.get("/:id", authenticate, WholesaleOrderController.getRequestById);

router.patch(
  "/:id/status",
  authenticate,
  checkPermission("wholesale-order-request", "update"),
  WholesaleOrderController.updateRequestStatus
);

export default router;
