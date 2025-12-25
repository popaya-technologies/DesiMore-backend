  import { Request, Response } from "express";
  import { RBACService } from "../services/rbac.service";
  import { checkPermission } from "../middlewares/rbac.middleware";

  export const RBACController = {
  // Role endpoints
  createRole: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, description } = req.body;
      const role = await RBACService.createRole(name, description);
      res.status(201).json(role);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getRoles: async (req: Request, res: Response): Promise<void> => {
    try {
      const roles = await RBACService.getAllRoles();
      res.status(200).json(roles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Permission endpoints
  createPermission: async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, resource, action, description, attributes } = req.body;
      const permission = await RBACService.createPermission(
        name,
        resource,
        action,
        description,
        attributes
      );
      res.status(201).json(permission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getPermissions: async (req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await RBACService.getAllPermissions();
      res.status(200).json(permissions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // User-Role assignment
  assignRoleToUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, roleId } = req.body;
      const userRole = await RBACService.assignRoleToUser(userId, roleId);
      res.status(201).json(userRole);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getUserRoles: async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userRoles = await RBACService.getUserRoles(userId);
      res.status(200).json(userRoles);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Role-Permission assignment
  assignPermissionToRole: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { roleId, permissionId } = req.body;
      const rolePermission = await RBACService.assignPermissionToRole(
        roleId,
        permissionId
      );
      res.status(201).json(rolePermission);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getRolePermissions: async (req: Request, res: Response): Promise<void> => {
    try {
      const { roleId } = req.params;
      const rolePermissions = await RBACService.getRolePermissions(roleId);
      res.status(200).json(rolePermissions);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Utility: Grant delete-user permission to admin role without rerunning seed
  grantDeleteUserPermissionToAdmin: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      if (req.user?.userRole !== "su") {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      const adminRole = await RBACService.getRoleByName("admin");
      if (!adminRole) {
        res.status(404).json({ message: "Admin role not found" });
        return;
      }

      let permission = await RBACService.getPermissionByName("delete-user");
      if (!permission) {
        permission = await RBACService.createPermission(
          "delete-user",
          "user",
          "delete",
          "Permission to delete users"
        );
      }

      await RBACService.assignPermissionToRole(adminRole.id, permission.id);

      res.status(200).json({
        message: "delete-user permission assigned to admin role",
        roleId: adminRole.id,
        permissionId: permission.id,
      });
    } catch (error) {
      console.error("Grant delete-user to admin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
