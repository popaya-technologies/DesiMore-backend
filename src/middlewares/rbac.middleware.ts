import { Request, Response, NextFunction } from "express";
import { RBACService } from "../services/rbac.service";

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

      const hasPermission = await RBACService.hasPermission(
        req.user.id,
        resource,
        action
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
