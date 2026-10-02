import { Router } from "express";
import { SystemLanguageController } from "../controllers/system-language.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("system-language", "create"),
  SystemLanguageController.createSystemLanguage,
);

router.get(
  "/",
  authenticate,
  checkPermission("system-language", "read"),
  SystemLanguageController.getSystemLanguages,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("system-language", "read"),
  SystemLanguageController.getSystemLanguageById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("system-language", "update"),
  SystemLanguageController.updateSystemLanguage,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("system-language", "delete"),
  SystemLanguageController.deleteSystemLanguage,
);

export default router;
