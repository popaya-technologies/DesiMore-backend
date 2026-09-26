import { Router } from "express";
import { CouponController } from "../controllers/coupon.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("coupon", "create"),
  CouponController.createCoupon,
);

router.get("/", CouponController.getCoupons);

router.get("/:id", CouponController.getCouponById);

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
