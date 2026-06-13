import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/user.entity";
import { UpdateProfileDto } from "../dto/auth.dto";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import * as bcrypt from "bcryptjs";
import { sendPasswordResetOtp } from "../utils/email";
import { clearTokens, setTokens } from "../utils/helper";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { RBACService } from "../services/rbac.service";

const userRepository = AppDataSource.getRepository(User);

const profileSelect: Array<keyof User> = [
  "id",
  "firstname",
  "lastname",
  "fullname",
  "username",
  "email",
  "phone",
  "avatar",
  "userRole",
  "createdAt",
  "updatedAt",
];

export const AuthController = {
  register: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, firstname, lastname, email, phone, password } =
        req.body;

      // Check if username or email already exists
      const existingUser = await userRepository.findOne({
        where: [{ username }, { email }, { phone }],
      });

      if (existingUser) {
        res.status(400).json({
          message: "Username, email or phone number already in use",
        });
        return;
      }

      // Create user entity
      const user = new User();
      user.userRole = "user";
      user.avatar = "";
      user.username = username;
      user.firstname = firstname;
      user.lastname = lastname;
      user.email = email;
      user.phone = phone;
      user.setPassword(password);

      await userRepository.save(user);

      // Return user data without sensitive information
      const { password: _, refreshToken, ...userResponse } = user;

      res.status(201).json(userResponse);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  registerWholesaler: async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, firstname, lastname, email, phone, password } =
        req.body;

      // Check if username, email, or phone already exists
      const existingUser = await userRepository.findOne({
        where: [{ username }, { email }, { phone }],
      });

      if (existingUser) {
        res.status(400).json({
          message: "Username, email or phone number already in use",
        });
        return;
      }

      // Ensure wholesaler role exists in RBAC
      const wholesalerRole = await RBACService.getRoleByName("wholesaler");
      if (!wholesalerRole) {
        res.status(500).json({
          message: "Wholesaler role is not configured",
        });
        return;
      }

      // Create user with wholesaler role
      const user = new User();
      user.userRole = "wholesaler";
      user.avatar = "";
      user.username = username;
      user.firstname = firstname;
      user.lastname = lastname;
      user.email = email;
      user.phone = phone;
      user.setPassword(password);

      await userRepository.save(user);

      // Link RBAC role (also syncs user.userRole)
      await RBACService.assignRoleToUser(user.id, wholesalerRole.id);

      const { password: _, refreshToken, ...userResponse } = user;

      res.status(201).json(userResponse);
    } catch (error) {
      console.error("Wholesaler registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  login: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // ← ADD THIS
    try {
      const { email, password } = req.body;

      const user = await userRepository.findOne({
        where: { email },
        select: [
          "id",
          "firstname",
          "lastname",
          "email",
          "password",
          "refreshToken",
          "avatar",
          "userRole",
        ],
      });

      if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const { accessToken, refreshToken } = setTokens(res, user.id, user.email);

      user.refreshToken = refreshToken;
      await userRepository.save(user);

      res.status(200).json({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        avatar: user.avatar,
        userRole: user.userRole,
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const { refreshToken } = req.cookies;
      if (refreshToken) {
        const decoded = verifyRefreshToken(refreshToken);
        const user = await userRepository.findOne({
          where: { id: decoded.userId },
        });

        if (user) {
          user.refreshToken = null;
          await userRepository.save(user);
        }
      }

      clearTokens(res);
      res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  refreshToken: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const { refreshToken } = req.cookies;
      if (!refreshToken) {
        res.status(400).json({
          message: "Refresh token missing",
        });
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
      });

      if (!user || user.refreshToken !== refreshToken) {
        res.status(400).json({
          message: "Invalid refresh token",
        });
        return;
      }

      const { accessToken, refreshToken: newRefreshToken } = setTokens(
        res,
        user.id,
        user.email
      );

      user.refreshToken = newRefreshToken;
      await userRepository.save(user);

      res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  requestPasswordReset: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const { email } = req.body;
      const emailNormalized = String(email ?? "").trim().toLowerCase();

      const user = await userRepository
        .createQueryBuilder("user")
        .where("LOWER(user.email) = :email", { email: emailNormalized })
        .getOne();
      if (!user) {
        res.status(400).json({
          message: "If this email exists, we've sent a reset link",
        });
        return;
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpiry = otpExpiry;
      await userRepository.save(user);

      await sendPasswordResetOtp(user.email, otp);

      res.status(200).json({
        message: "Password reset OTP sent to your email",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  resetPassword: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const { email, otp, newPassword } = req.body;
      const emailNormalized = String(email ?? "").trim().toLowerCase();
      // Load hidden OTP fields (select: false) explicitly
      const user = await userRepository
        .createQueryBuilder("user")
        .addSelect(["user.resetPasswordOtp", "user.resetPasswordOtpExpiry"])
        .where("LOWER(user.email) = :email", { email: emailNormalized })
        .getOne();

      if (!user) {
        res.status(404).json({
          message: "User not found",
        });
        return;
      }

      const providedOtp = String(otp ?? "").trim();
      const now = Date.now();
      const expiryTime = user.resetPasswordOtpExpiry
        ? new Date(user.resetPasswordOtpExpiry).getTime()
        : 0;
      if (
        !user.resetPasswordOtp ||
        user.resetPasswordOtp !== providedOtp ||
        !user.resetPasswordOtpExpiry ||
        expiryTime < now
      ) {
        res.status(400).json({
          message: "Invalid or expired OTP",
        });
        return;
      }

      user.setPassword(newPassword);
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpiry = null;
      user.refreshToken = null;

      await userRepository.save(user);

      res.status(200).json({
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getAllUsers: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const role =
        typeof req.query.role === "string"
          ? req.query.role.trim().toLowerCase()
          : typeof req.query.userRole === "string"
          ? req.query.userRole.trim().toLowerCase()
          : "";

      const users = await userRepository.find({
        where: role ? { userRole: role } : undefined,
        select: [
          "id",
          "firstname",
          "lastname",
          "email",
          "avatar",
          "userRole",
          "createdAt",
          "updatedAt",
        ],
        order: {
          createdAt: "DESC",
        },
      });

      res.status(200).json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  getMe: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const user = await userRepository.findOne({
        where: { id: req.user.id },
        select: profileSelect,
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const userRoles = await RBACService.getUserRoles(user.id);
      const permissions = await RBACService.getUserPermissions(user.id);

      res.status(200).json({
        user: {
          ...user,
          roles: userRoles.map((userRole) => userRole.role),
          permissions,
        },
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateMe: async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const updateDto = plainToInstance(UpdateProfileDto, req.body);
      const errors = await validate(updateDto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const allowedFields: Array<keyof UpdateProfileDto> = [
        "firstname",
        "lastname",
        "username",
        "email",
        "phone",
        "avatar",
      ];

      const hasUpdates = allowedFields.some(
        (field) => updateDto[field] !== undefined
      );

      if (!hasUpdates) {
        res.status(400).json({
          message: "At least one profile field is required",
        });
        return;
      }

      const user = await userRepository.findOne({
        where: { id: req.user.id },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const normalizedUsername =
        updateDto.username !== undefined
          ? updateDto.username.trim().toLowerCase()
          : undefined;
      const normalizedEmail =
        updateDto.email !== undefined
          ? updateDto.email.trim().toLowerCase()
          : undefined;
      const normalizedPhone =
        updateDto.phone !== undefined ? updateDto.phone.trim() : undefined;

      if (normalizedUsername && normalizedUsername !== user.username) {
        const existingUser = await userRepository.findOne({
          where: { username: normalizedUsername },
          select: ["id"],
        });

        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({ message: "Username already in use" });
          return;
        }
      }

      if (normalizedEmail && normalizedEmail !== user.email) {
        const existingUser = await userRepository
          .createQueryBuilder("user")
          .select(["user.id"])
          .where("LOWER(user.email) = :email", { email: normalizedEmail })
          .getOne();

        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({ message: "Email already in use" });
          return;
        }
      }

      if (normalizedPhone && normalizedPhone !== user.phone) {
        const existingUser = await userRepository.findOne({
          where: { phone: normalizedPhone },
          select: ["id"],
        });

        if (existingUser && existingUser.id !== user.id) {
          res.status(400).json({ message: "Phone number already in use" });
          return;
        }
      }

      if (updateDto.firstname !== undefined) {
        user.firstname = updateDto.firstname.trim();
      }
      if (updateDto.lastname !== undefined) {
        user.lastname = updateDto.lastname.trim();
      }
      if (normalizedUsername !== undefined) {
        user.username = normalizedUsername;
      }
      if (normalizedEmail !== undefined) {
        user.email = normalizedEmail;
      }
      if (normalizedPhone !== undefined) {
        user.phone = normalizedPhone;
      }
      if (updateDto.avatar !== undefined) {
        user.avatar = updateDto.avatar.trim() || null;
      }

      await userRepository.save(user);

      const updatedUser = await userRepository.findOne({
        where: { id: user.id },
        select: profileSelect,
      });

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getUserById: async (req: Request, res: Response): Promise<void> => {
    // ← ADD THIS
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          message: "User ID is required",
        });
        return;
      }

      const user = await userRepository.findOne({
        where: { id },
        select: [
          "id",
          "username",
          "firstname",
          "lastname",
          "email",
          "phone",
          "avatar",
          "userRole",
          "createdAt",
          "updatedAt",
        ],
      });

      if (!user) {
        res.status(404).json({
          message: "User not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  deleteUser: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ message: "User ID is required" });
        return;
      }

      const user = await userRepository.findOne({ where: { id } });
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      await userRepository.delete(id);

      res.status(200).json({
        message: "User deleted successfully",
        data: { id },
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};
