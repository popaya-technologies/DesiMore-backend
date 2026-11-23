"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const coupon_controller_1 = require("../controllers/coupon.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
router.post("/apply", auth_middleware_1.authenticate, coupon_controller_1.CouponController.applyCoupon);
router.post("/", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("coupon", "create"), coupon_controller_1.CouponController.createCoupon);
// Coupon codes are redeemable at checkout, so only staff may list or read them.
router.get("/", auth_middleware_1.authenticate, rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("coupon", "read"), coupon_controller_1.CouponController.getCoupons);
router.get("/:id", auth_middleware_1.authenticate, rbac_middleware_1.requireStaff, (0, rbac_middleware_1.checkPermission)("coupon", "read"), coupon_controller_1.CouponController.getCouponById);
router.put("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("coupon", "update"), coupon_controller_1.CouponController.updateCoupon);
router.delete("/:id", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("coupon", "delete"), coupon_controller_1.CouponController.deleteCoupon);
exports.default = router;
