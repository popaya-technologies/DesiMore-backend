import { Router } from "express";
import { GiftVoucherController } from "../controllers/gift_voucher.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("gift_voucher", "create"),
  GiftVoucherController.createGiftVoucher,
);

router.get("/", GiftVoucherController.getGiftVouchers);

router.get("/:id", GiftVoucherController.getGiftVoucherById);

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
