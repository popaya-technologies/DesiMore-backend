// routes/rbac.routes.ts
import { Router } from "express";
import { RBACController } from "../controllers/rbac.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { checkPermission } from "../middlewares/rbac.middleware";

const router = Router();

// Add RBAC routes (protected by admin role)
router.post(
  "/roles",
  authenticate,
  checkPermission("role", "create"),
  RBACController.createRole
);
router.get(
  "/roles",
  authenticate,
  checkPermission("role", "read"),
  RBACController.getRoles
);
router.post(
  "/permissions",
  authenticate,
  checkPermission("permission", "create"),
  RBACController.createPermission
);
router.get(
  "/permissions",
  authenticate,
  checkPermission("permission", "read"),
  RBACController.getPermissions
);
router.post(
  "/assign-role",
  authenticate,
  checkPermission("user-role", "create"),
  RBACController.assignRoleToUser
);
router.get(
  "/users/:userId/roles",
  authenticate,
  checkPermission("user-role", "read"),
  RBACController.getUserRoles
);
router.post(
  "/assign-permission",
  authenticate,
  checkPermission("role-permission", "create"),
  RBACController.assignPermissionToRole
);
router.get(
  "/roles/:roleId/permissions",
  authenticate,
  checkPermission("role-permission", "read"),
  RBACController.getRolePermissions
);

// Utility: super-admin only to grant delete-user permission to admin role
router.post(
  "/admin/grant-delete-user",
  authenticate,
  RBACController.grantDeleteUserPermissionToAdmin
);

export default router;
