"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Payment routes
router.post("/process", auth_middleware_1.authenticate, payment_controller_1.PaymentController.processPayment);
router.get("/status/:orderId", auth_middleware_1.authenticate, payment_controller_1.PaymentController.getPaymentStatus);
router.post("/refund/:paymentId", auth_middleware_1.authenticate, payment_controller_1.PaymentController.refundPayment);
router.get("/transaction/:transactionId", auth_middleware_1.authenticate, payment_controller_1.PaymentController.getTransactionDetails);
exports.default = router;
