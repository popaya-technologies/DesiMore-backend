import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller";
import { authenticate } from "../middlewares/auth.middleware";

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
  PaymentController.refundPayment
);
router.get(
  "/transaction/:transactionId",
  authenticate,
  PaymentController.getTransactionDetails
);

export default router;
