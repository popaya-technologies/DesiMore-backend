import { Router } from "express";
import { VoucherThemeController } from "../controllers/voucher_theme.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("voucher_theme", "create"),
  VoucherThemeController.createVoucherTheme,
);

router.get("/", VoucherThemeController.getVoucherThemes);

router.get("/:id", VoucherThemeController.getVoucherThemeById);

router.put(
  "/:id",
  authenticate,
  checkPermission("voucher_theme", "update"),
  VoucherThemeController.updateVoucherTheme,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("voucher_theme", "delete"),
  VoucherThemeController.deleteVoucherTheme,
);

export default router;
