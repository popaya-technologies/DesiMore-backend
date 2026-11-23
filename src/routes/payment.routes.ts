import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

// Payment routes
router.post("/process", authenticate, PaymentController.processPayment);
router.get(
  "/status/:orderId",
  authenticate,
  PaymentController.getPaymentStatus
);
router.post(
  "/refund/:paymentId",
  authenticate,
  // Refunds are a store decision: staff with order edit access only.
  requireStaff,
  checkPermission("order", "update"),
  PaymentController.refundPayment
);
router.get(
  "/transaction/:transactionId",
  authenticate,
  // Gateway transaction details belong to the store: staff with order read access only.
  requireStaff,
  checkPermission("order", "read"),
  PaymentController.getTransactionDetails
);

export default router;
