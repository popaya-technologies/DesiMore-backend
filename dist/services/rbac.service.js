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
exports.RBACService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const permission_entity_1 = require("../entities/permission.entity");
const role_permission_entity_1 = require("../entities/role-permission.entity");
const role_entity_1 = require("../entities/role.entity");
const user_role_entity_1 = require("../entities/user-role.entity");
const user_entity_1 = require("../entities/user.entity");
const userRepository = data_source_1.AppDataSource.getRepository(user_entity_1.User);
const roleRepository = data_source_1.AppDataSource.getRepository(role_entity_1.Role);
const permissionRepository = data_source_1.AppDataSource.getRepository(permission_entity_1.Permission);
const rolePermissionRepository = data_source_1.AppDataSource.getRepository(role_permission_entity_1.RolePermission);
const userRoleRepository = data_source_1.AppDataSource.getRepository(user_role_entity_1.UserRole);
exports.RBACService = {
    //RoleManagement
    createRole: (name, description) => __awaiter(void 0, void 0, void 0, function* () {
        const role = new role_entity_1.Role();
        role.name = name;
        role.description = description || null;
        return yield roleRepository.save(role);
    }),
    getRoleById: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield roleRepository.findOne({ where: { id } });
    }),
    getRoleByName: (name) => __awaiter(void 0, void 0, void 0, function* () {
        return yield roleRepository.findOne({ where: { name } });
    }),
    getAllRoles: () => __awaiter(void 0, void 0, void 0, function* () {
        return yield roleRepository.find();
    }),
    updateRole: (id, updates) => __awaiter(void 0, void 0, void 0, function* () {
        yield roleRepository.update(id, updates);
        return yield roleRepository.findOne({ where: { id } });
    }),
    deleteRole: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield roleRepository.delete(id);
    }),
    //Permission Management
    createPermission: (name, resource, action, description, attributes) => __awaiter(void 0, void 0, void 0, function* () {
        const permission = new permission_entity_1.Permission();
        permission.name = name;
        permission.resource = resource;
        permission.action = action;
        permission.description = description || null;
        permission.attributes = attributes || null;
        return yield permissionRepository.save(permission);
    }),
    getPermissionById: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield permissionRepository.findOne({ where: { id } });
    }),
    getPermissionByName: (name) => __awaiter(void 0, void 0, void 0, function* () {
        return yield permissionRepository.findOne({ where: { name } });
    }),
    getAllPermissions: () => __awaiter(void 0, void 0, void 0, function* () {
        return yield permissionRepository.find();
    }),
    updatePermission: (id, updates) => __awaiter(void 0, void 0, void 0, function* () {
        yield permissionRepository.update(id, updates);
        return yield permissionRepository.findOne({ where: { id } });
    }),
    deletePermission: (id) => __awaiter(void 0, void 0, void 0, function* () {
        return yield permissionRepository.delete(id);
    }),
    //User-role Assignment
    assignRoleToUser: (userId, roleId) => __awaiter(void 0, void 0, void 0, function* () {
        const [user, role] = yield Promise.all([
            userRepository.findOne({ where: { id: userId } }),
            roleRepository.findOne({ where: { id: roleId } }),
        ]);
        if (!user) {
            throw new Error("User not found");
        }
        if (!role) {
            throw new Error("Role not found");
        }
        const userRole = new user_role_entity_1.UserRole();
        userRole.userId = userId;
        userRole.roleId = roleId;
        const savedUserRole = yield userRoleRepository.save(userRole);
        // Keep legacy user.userRole column in sync with the most recently assigned role
        user.userRole = role.name;
        yield userRepository.save(user);
        return savedUserRole;
    }),
    removeRolefromUser: (userId, roleId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield userRoleRepository.delete({ userId, roleId });
    }),
    getUserRoles: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield userRoleRepository.find({
            where: { userId },
            relations: ["role"],
        });
    }),
    //Role-Permission Assignment
    assignPermissionToRole: (roleId, permissionId) => __awaiter(void 0, void 0, void 0, function* () {
        const rolePermission = new role_permission_entity_1.RolePermission();
        rolePermission.roleId = roleId;
        rolePermission.permissionId = permissionId;
        return yield rolePermissionRepository.save(rolePermission);
    }),
    removeRolePermissionFromRole: (roleId, permissionId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield rolePermissionRepository.delete({ roleId, permissionId });
    }),
    getRolePermissions: (roleId) => __awaiter(void 0, void 0, void 0, function* () {
        return yield rolePermissionRepository.find({
            where: { roleId },
            relations: ["permission"],
        });
    }),
    //Permission Checking
    getUserPermissions: (userId) => __awaiter(void 0, void 0, void 0, function* () {
        const userRoles = yield userRoleRepository.find({
            where: { userId },
            relations: ["role"],
        });
        const roleIds = userRoles.map((ur) => ur.role.id);
        const rolePermissions = yield rolePermissionRepository.find({
            where: { roleId: (0, typeorm_1.In)(roleIds) },
            relations: ["permission"],
        });
        return rolePermissions.map((rp) => rp.permission);
    }),
    hasPermission: (userId, resource, action) => __awaiter(void 0, void 0, void 0, function* () {
        const permissions = yield exports.RBACService.getUserPermissions(userId);
        return permissions.some((p) => p.resource === resource && p.action === action);
    }),
};
