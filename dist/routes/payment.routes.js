"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payment_controller_1 = require("../controllers/payment.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
// Payment routes
router.post("/process", auth_middleware_1.authenticate, payment_controller_1.PaymentController.processPayment);
router.get("/status/:orderId", auth_middleware_1.authenticate, payment_controller_1.PaymentController.getPaymentStatus);
router.post("/refund/:paymentId", auth_middleware_1.authenticate, 
// Refunds are a store decision: staff with order edit access only.
rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("order", "update"), payment_controller_1.PaymentController.refundPayment);
router.get("/transaction/:transactionId", auth_middleware_1.authenticate, 
// Gateway transaction details belong to the store: staff with order read access only.
rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("order", "read"), payment_controller_1.PaymentController.getTransactionDetails);
exports.default = router;
