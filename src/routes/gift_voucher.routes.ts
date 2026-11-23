import { Router } from "express";
import { GiftVoucherController } from "../controllers/gift_voucher.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission, requireStaff } from "../middlewares/rbac.middleware";

const router = Router();

router.post("/apply", authenticate, GiftVoucherController.applyGiftVoucher);

router.post(
  "/",
  authenticate,
  checkPermission("gift_voucher", "create"),
  GiftVoucherController.createGiftVoucher,
);

// Voucher codes are spendable at checkout, so only staff may list or read them.
router.get(
  "/",
  authenticate,
  requireStaff,
  checkPermission("gift_voucher", "read"),
  GiftVoucherController.getGiftVouchers,
);

router.get(
  "/:id",
  authenticate,
  requireStaff,
  checkPermission("gift_voucher", "read"),
  GiftVoucherController.getGiftVoucherById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("gift_voucher", "update"),
  GiftVoucherController.updateGiftVoucher,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("gift_voucher", "delete"),
  GiftVoucherController.deleteGiftVoucher,
);

export default router;
