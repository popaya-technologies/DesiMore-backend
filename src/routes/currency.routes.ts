import { Router } from "express";
import { CurrencyController } from "../controllers/currency.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("currency", "create"),
  CurrencyController.createCurrency,
);

router.get(
  "/",
  authenticate,
  checkPermission("currency", "read"),
  CurrencyController.getCurrencies,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("currency", "read"),
  CurrencyController.getCurrencyById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("currency", "update"),
  CurrencyController.updateCurrency,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("currency", "delete"),
  CurrencyController.deleteCurrency,
);

export default router;