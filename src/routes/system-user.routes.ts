import { Router } from "express";
import { SystemUserController } from "../controllers/system-user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("system-user", "create"),
  SystemUserController.createSystemUser,
);

router.get(
  "/",
  authenticate,
  checkPermission("system-user", "read"),
  SystemUserController.getSystemUsers,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("system-user", "read"),
  SystemUserController.getSystemUserById,
);

router.patch(
  "/:id",
  authenticate,
  checkPermission("system-user", "update"),
  SystemUserController.updateSystemUser,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("system-user", "delete"),
  SystemUserController.deleteSystemUser,
);

export default router;
