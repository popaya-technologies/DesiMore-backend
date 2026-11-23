import { Router } from "express";
import { CouponController } from "../controllers/coupon.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/apply", authenticate, CouponController.applyCoupon);

router.post(
  "/",
  authenticate,
  checkPermission("coupon", "create"),
  CouponController.createCoupon,
);

// Coupon codes are redeemable at checkout, so only staff may list or read them.
router.get(
  "/",
  authenticate,
  requireStaff,
  checkPermission("coupon", "read"),
  CouponController.getCoupons,
);

router.get(
  "/:id",
  authenticate,
  requireStaff,
  checkPermission("coupon", "read"),
  CouponController.getCouponById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("coupon", "update"),
  CouponController.updateCoupon,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("coupon", "delete"),  
  CouponController.deleteCoupon,
);

export default router;
