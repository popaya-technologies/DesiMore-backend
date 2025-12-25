import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";
import { RBACService } from "../services/rbac.service";

// Extend the Request interface
declare global {
  namespace Express {
    interface Request {
      user?: User & { roles?: any[]; permissions?: any[] };
    }
  }
}

const userRepository = AppDataSource.getRepository(User);

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      res.status(401).json({ message: "Access token missing" });
      return;
    }

    const decoded = verifyAccessToken(accessToken);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      select: ["id", "firstname", "lastname", "email", "avatar"],
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
      roles: userRoles.map((ur) => ur.role),
      permissions: permissions,
    } as User & { roles: any[]; permissions: any[] };

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid access token" });
    return;
  }
};
