import { In } from "typeorm";
import { AppDataSource } from "../data-source";
import { Permission } from "../entities/permission.entity";
import { RolePermission } from "../entities/role-permission.entity";
import { Role } from "../entities/role.entity";
import { UserRole } from "../entities/user-role.entity";
import { User } from "../entities/user.entity";

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const permissionRepository = AppDataSource.getRepository(Permission);
const rolePermissionRepository = AppDataSource.getRepository(RolePermission);
const userRoleRepository = AppDataSource.getRepository(UserRole);

export const RBACService = {
  //RoleManagement
  createRole: async (name: string, description?: string) => {
    const role = new Role();
    role.name = name;
    role.description = description || null;

    return await roleRepository.save(role);
  },

  getRoleById: async (id: string) => {
    return await roleRepository.findOne({ where: { id } });
  },

  getRoleByName: async (name: string) => {
    return await roleRepository.findOne({ where: { name } });
  },

  getAllRoles: async () => {
    return await roleRepository.find();
  },

  updateRole: async (id: string, updates: Partial<Role>) => {
    await roleRepository.update(id, updates);
    return await roleRepository.findOne({ where: { id } });
  },

  deleteRole: async (id: string) => {
    return await roleRepository.delete(id);
  },

  //Permission Management
  createPermission: async (
    name: string,
    resource: string,
    action: string,
    description?: string,
    attributes?: string[]
  ) => {
    const permission = new Permission();
    permission.name = name;
    permission.resource = resource;
    permission.action = action;
    permission.description = description || null;
    permission.attributes = attributes || null;

    return await permissionRepository.save(permission);
  },

  getPermissionById: async (id: string) => {
    return await permissionRepository.findOne({ where: { id } });
  },

  getPermissionByName: async (name: string) => {
    return await permissionRepository.findOne({ where: { name } });
  },

  getAllPermissions: async () => {
    return await permissionRepository.find();
  },

  updatePermission: async (id: string, updates: Partial<Permission>) => {
    await permissionRepository.update(id, updates);
    return await permissionRepository.findOne({ where: { id } });
  },

  deletePermission: async (id: string) => {
    return await permissionRepository.delete(id);
  },

  //User-role Assignment
  assignRoleToUser: async (userId: string, roleId: string) => {
    const [user, role] = await Promise.all([
      userRepository.findOne({ where: { id: userId } }),
      roleRepository.findOne({ where: { id: roleId } }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }
    if (!role) {
      throw new Error("Role not found");
    }

    const userRole = new UserRole();
    userRole.userId = userId;
    userRole.roleId = roleId;

    const savedUserRole = await userRoleRepository.save(userRole);

    // Keep legacy user.userRole column in sync with the most recently assigned role
    user.userRole = role.name;
    await userRepository.save(user);

    return savedUserRole;
  },

  removeRolefromUser: async (userId: string, roleId: string) => {
    return await userRoleRepository.delete({ userId, roleId });
  },

  getUserRoles: async (userId: string) => {
    return await userRoleRepository.find({
      where: { userId },
      relations: ["role"],
    });
  },

  //Role-Permission Assignment
  assignPermissionToRole: async (roleId: string, permissionId: string) => {
    const rolePermission = new RolePermission();
    rolePermission.roleId = roleId;
    rolePermission.permissionId = permissionId;

    return await rolePermissionRepository.save(rolePermission);
  },

  removeRolePermissionFromRole: async (
    roleId: string,
    permissionId: string
  ) => {
    return await rolePermissionRepository.delete({ roleId, permissionId });
  },

  getRolePermissions: async (roleId: string) => {
    return await rolePermissionRepository.find({
      where: { roleId },
      relations: ["permission"],
    });
  },

  //Permission Checking

  getUserPermissions: async (userId: string) => {
    const userRoles = await userRoleRepository.find({
      where: { userId },
      relations: ["role"],
    });

    const roleIds = userRoles.map((ur) => ur.role.id);

    const rolePermissions = await rolePermissionRepository.find({
      where: { roleId: In(roleIds) },
      relations: ["permission"],
    });

    return rolePermissions.map((rp) => rp.permission);
  },

  hasPermission: async (userId: string, resource: string, action: string) => {
    const permissions = await RBACService.getUserPermissions(userId);
    return permissions.some(
      (p) => p.resource === resource && p.action === action
    );
  },
};
