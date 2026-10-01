import { Router } from "express";

import { SystemUserGroupController } from "../controllers/system-user-group.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkPermission("system-user-group", "create"),
  SystemUserGroupController.createSystemUserGroup,
);

router.get(
  "/",
  authenticate,
  checkPermission("system-user-group", "read"),
  SystemUserGroupController.getSystemUserGroups,
);

router.get(
  "/:id",
  authenticate,
  checkPermission("system-user-group", "read"),
  SystemUserGroupController.getSystemUserGroupById,
);

router.put(
  "/:id",
  authenticate,
  checkPermission("system-user-group", "update"),
  SystemUserGroupController.updateSystemUserGroup,
);

router.delete(
  "/:id",
  authenticate,
  checkPermission("system-user-group", "delete"),
  SystemUserGroupController.deleteSystemUserGroup,
);

export default router;
