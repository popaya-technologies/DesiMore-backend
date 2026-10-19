import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";
import { RBACService } from "../services/rbac.service";
import { SystemUser } from "../entities/system-user.entity";

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const userRepository = AppDataSource.getRepository(User);
const systemUserRepository = AppDataSource.getRepository(SystemUser);

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ message: "Access token missing" });
      return;
    }

    const decoded = verifyAccessToken(accessToken);

    if (decoded.accountType === "system-user") {
      const systemUser = await systemUserRepository.findOne({
        where: { id: decoded.userId, isActive: true },
        relations: { userGroup: true },
      });

      if (!systemUser) {
        res.status(401).json({ message: "System user not found or disabled" });
        return;
      }

      const accessPermissions = systemUser.userGroup?.accessPermissions ?? [];
      const modifyPermissions = systemUser.userGroup?.modifyPermissions ?? [];

      req.user = {
        ...systemUser,
        accountType: "system-user",
        userRole: "system-user",
        accessPermissions,
        modifyPermissions,
        permissions: [
          ...accessPermissions.map((resource) => ({ resource, action: "read" })),
          ...modifyPermissions.flatMap((resource) =>
            ["create", "update", "delete"].map((action) => ({ resource, action })),
          ),
        ],
      };

      next();
      return;
    }

    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      select: [
        "id",
        "firstname",
        "lastname",
        "username",
        "email",
        "phone",
        "avatar",
        "userRole",
      ],
    });

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Get user roles and permissions
    const userRoles = await RBACService.getUserRoles(user.id);
    const permissions = await RBACService.getUserPermissions(user.id);

    // Use type assertion to add roles and permissions
    req.user = {
      ...user,
      accountType: "user",
      roles: userRoles.map((ur) => ur.role),
      permissions: permissions,
    };

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid access token" });
    return;
  }
};
