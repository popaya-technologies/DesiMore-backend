"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RBACController = void 0;
const rbac_service_1 = require("../services/rbac.service");
exports.RBACController = {
    // Role endpoints
    createRole: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, description } = req.body;
            const role = yield rbac_service_1.RBACService.createRole(name, description);
            res.status(201).json(role);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getRoles: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const roles = yield rbac_service_1.RBACService.getAllRoles();
            res.status(200).json(roles);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Permission endpoints
    createPermission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { name, resource, action, description, attributes } = req.body;
            const permission = yield rbac_service_1.RBACService.createPermission(name, resource, action, description, attributes);
            res.status(201).json(permission);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getPermissions: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const permissions = yield rbac_service_1.RBACService.getAllPermissions();
            res.status(200).json(permissions);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // User-Role assignment
    assignRoleToUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { userId, roleId } = req.body;
            const userRole = yield rbac_service_1.RBACService.assignRoleToUser(userId, roleId);
            res.status(201).json(userRole);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getUserRoles: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { userId } = req.params;
            const userRoles = yield rbac_service_1.RBACService.getUserRoles(userId);
            res.status(200).json(userRoles);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Role-Permission assignment
    assignPermissionToRole: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { roleId, permissionId } = req.body;
            const rolePermission = yield rbac_service_1.RBACService.assignPermissionToRole(roleId, permissionId);
            res.status(201).json(rolePermission);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getRolePermissions: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { roleId } = req.params;
            const rolePermissions = yield rbac_service_1.RBACService.getRolePermissions(roleId);
            res.status(200).json(rolePermissions);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Utility: Grant delete-user permission to admin role without rerunning seed
    grantDeleteUserPermissionToAdmin: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.userRole) !== "su") {
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            const adminRole = yield rbac_service_1.RBACService.getRoleByName("admin");
            if (!adminRole) {
                res.status(404).json({ message: "Admin role not found" });
                return;
            }
            let permission = yield rbac_service_1.RBACService.getPermissionByName("delete-user");
            if (!permission) {
                permission = yield rbac_service_1.RBACService.createPermission("delete-user", "user", "delete", "Permission to delete users");
            }
            yield rbac_service_1.RBACService.assignPermissionToRole(adminRole.id, permission.id);
            res.status(200).json({
                message: "delete-user permission assigned to admin role",
                roleId: adminRole.id,
                permissionId: permission.id,
            });
        }
        catch (error) {
            console.error("Grant delete-user to admin error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
