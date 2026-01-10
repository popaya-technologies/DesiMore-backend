"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const order_controller_1 = require("../controllers/order.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
// Admin order listing
router.get("/admin", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("order", "read"), order_controller_1.OrderController.adminGetAllOrders);
router.get("/admin/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("order", "read"), order_controller_1.OrderController.adminGetOrderById);
router.post("/", auth_middleware_1.authenticate, order_controller_1.OrderController.createOrder);
router.get("/", auth_middleware_1.authenticate, order_controller_1.OrderController.getUserOrders);
router.get("/:id", auth_middleware_1.authenticate, order_controller_1.OrderController.getOrder);
router.put("/:id/status", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("order", "update"), order_controller_1.OrderController.updateOrderStatus);
router.put("/:id/payment-status", auth_middleware_1.authenticate, order_controller_1.OrderController.updatePaymentStatus);
router.put("/:id/tracking", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("order", "update"), order_controller_1.OrderController.updateOrderTracking);
router.post("/:id/cancel", auth_middleware_1.authenticate, order_controller_1.OrderController.cancelOrder);
exports.default = router;
