import { Request, Response, NextFunction } from "express";
import { RBACService } from "../services/rbac.service";

// Shopper roles carry some of the same permissions as staff (e.g. order:read for
// their own orders), so staff-only routes must also reject them explicitly.
const SHOPPER_ROLES = new Set(["user", "customer", "wholesaler"]);

export const requireStaff = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  if (
    req.user.accountType !== "system-user" &&
    SHOPPER_ROLES.has(String(req.user.userRole))
  ) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  next();
};

// Product read permission also belongs to shoppers; editor metadata needs a write permission.
export const checkAnyPermission =
  (resource: string, actions: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    if (
      req.user.userRole === "su" ||
      req.user.permissions?.some(
        (p) => p.resource === resource && actions.includes(p.action),
      )
    ) {
      next();
      return;
    }
    res.status(403).json({ message: "Forbidden" });
  };

// Passes when the user holds `action` on at least one of `resources`.
export const checkPermissionOnAny = (resources: string[], action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      if (req.user.userRole === "su") {
        next();
        return;
      }
      if (req.user.accountType === "system-user") {
        const isReadAction = action === "read" || action === "read-all";
        const granted = isReadAction
          ? req.user.accessPermissions
          : req.user.modifyPermissions;
        if (resources.some((r) => granted?.includes(r))) {
          next();
          return;
        }
        res.status(403).json({ message: "Forbidden" });
        return;
      }
      for (const resource of resources) {
        if (await RBACService.hasPermission(req.user.id, resource, action)) {
          next();
          return;
        }
      }
      res.status(403).json({ message: "Forbidden" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const checkPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      // Super admin bypass
      if (req.user.userRole === "su") {
        next();
        return;
      }

      if (req.user.accountType === "system-user") {
        const isReadAction = action === "read" || action === "read-all";
        const allowed = isReadAction
          ? req.user.accessPermissions?.includes(resource)
          : req.user.modifyPermissions?.includes(resource);

        if (!allowed) {
          res.status(403).json({ message: "Forbidden" });
          return;
        }

        next();
        return;
      }

      const hasPermission = await RBACService.hasPermission(
        req.user.id,
        resource,
        action,
      );

      if (!hasPermission) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
      return;
    }
  };
};
