"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/rbac.routes.ts
const express_1 = require("express");
const rbac_controller_1 = require("../controllers/rbac.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const rbac_middleware_1 = require("../middlewares/rbac.middleware");
const router = (0, express_1.Router)();
// Add RBAC routes (protected by admin role)
router.post("/roles", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("role", "create"), rbac_controller_1.RBACController.createRole);
router.get("/roles", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("role", "read"), rbac_controller_1.RBACController.getRoles);
router.post("/permissions", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("permission", "create"), rbac_controller_1.RBACController.createPermission);
router.get("/permissions", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("permission", "read"), rbac_controller_1.RBACController.getPermissions);
router.post("/assign-role", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("user-role", "create"), rbac_controller_1.RBACController.assignRoleToUser);
router.get("/users/:userId/roles", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("user-role", "read"), rbac_controller_1.RBACController.getUserRoles);
router.post("/assign-permission", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("role-permission", "create"), rbac_controller_1.RBACController.assignPermissionToRole);
router.get("/roles/:roleId/permissions", auth_middleware_1.authenticate, (0, rbac_middleware_1.checkPermission)("role-permission", "read"), rbac_controller_1.RBACController.getRolePermissions);
// Utility: super-admin only to grant delete-user permission to admin role
router.post("/admin/grant-delete-user", auth_middleware_1.authenticate, rbac_controller_1.RBACController.grantDeleteUserPermissionToAdmin);
exports.default = router;
