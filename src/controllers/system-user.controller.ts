import { Request, Response } from "express";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { SystemUser } from "../entities/system-user.entity";
import {
  CreateSystemUserDto,
  UpdateSystemUserDto,
} from "../dto/system-user.dto";

const systemUserRepository = AppDataSource.getRepository(SystemUser);

const USER_GROUPS = ["Administrator", "Demonstration"] as const;

type UserGroup = (typeof USER_GROUPS)[number];

const normalizeUserGroup = (value: string): UserGroup | null => {
  const group = value.trim();

  if (USER_GROUPS.includes(group as UserGroup)) {
    return group as UserGroup;
  }

  return null;
};

const buildResponse = (user: SystemUser) => {
  return {
    id: user.id,
    username: user.username,
    userGroup: user.userGroup,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    image: user.image ?? "",
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const SystemUserController = {
  // Create System User
  createSystemUser: async (req: Request, res: Response) => {
    try {
      const systemUserData = new CreateSystemUserDto();

      Object.assign(systemUserData, req.body);

      const errors = await validate(systemUserData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const userGroup = normalizeUserGroup(systemUserData.userGroup);

      if (!userGroup) {
        res.status(400).json({
          message:
            "Invalid User Group. Allowed values are Administrator and Demonstration.",
        });
        return;
      }

      if (
        systemUserData.password !==
        systemUserData.confirmPassword
      ) {
        res.status(400).json({
          message: "Password and Confirm Password do not match.",
        });
        return;
      }

      const username = systemUserData.username
        .trim()
        .toLowerCase();

      const email = systemUserData.email
        .trim()
        .toLowerCase();

      const existingUsername =
        await systemUserRepository.findOne({
          where: { username },
        });

      if (existingUsername) {
        res.status(409).json({
          message: "Username already exists.",
        });
        return;
      }

      const existingEmail =
        await systemUserRepository.findOne({
          where: { email },
        });

      if (existingEmail) {
        res.status(409).json({
          message: "E-Mail already exists.",
        });
        return;
      }

      const systemUser = systemUserRepository.create({
        username,
        userGroup,
        firstName: systemUserData.firstName.trim(),
        lastName: systemUserData.lastName.trim(),
        email,
        image: systemUserData.image?.trim() || null,
        isActive: systemUserData.isActive ?? true,
      });

      systemUser.setPassword(systemUserData.password);

      await systemUserRepository.save(systemUser);

      res.status(201).json(buildResponse(systemUser));
    } catch (error) {
      console.error(
        "Create system user error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get System Users
  getSystemUsers: async (req: Request, res: Response) => {
    try {
      const {
        username,
        status,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(
        parseInt(String(page), 10) || 1,
        1,
      );

      const take = Math.min(
        Math.max(parseInt(String(limit), 10) || 10, 1),
        100,
      );

      const skip = (currentPage - 1) * take;

      const query =
        systemUserRepository.createQueryBuilder("systemUser");

      // Username filter
      if (
        username &&
        String(username).trim()
      ) {
        query.andWhere(
          "systemUser.username ILIKE :username",
          {
            username: `%${String(username).trim()}%`,
          },
        );
      }

      // Status filter
      if (status && String(status).trim()) {
        const normalizedStatus = String(status)
          .trim()
          .toLowerCase();

        if (
          normalizedStatus === "enabled" ||
          normalizedStatus === "active" ||
          normalizedStatus === "true"
        ) {
          query.andWhere(
            "systemUser.isActive = :isActive",
            {
              isActive: true,
            },
          );
        }

        if (
          normalizedStatus === "disabled" ||
          normalizedStatus === "inactive" ||
          normalizedStatus === "false"
        ) {
          query.andWhere(
            "systemUser.isActive = :isActive",
            {
              isActive: false,
            },
          );
        }
      }

      query
        .orderBy(
          "systemUser.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(take);

      const [users, total] =
        await query.getManyAndCount();

      res.status(200).json({
        data: users.map(buildResponse),
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(
            total / take,
          ),
        },
      });
    } catch (error) {
      console.error(
        "Get system users error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get Single System User
  getSystemUserById: async (
    req: Request,
    res: Response,
  ) => {
    try {
      const systemUser =
        await systemUserRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUser) {
        res.status(404).json({
          message: "System User not found.",
        });
        return;
      }

      res.status(200).json(
        buildResponse(systemUser),
      );
    } catch (error) {
      console.error(
        "Get system user error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Update System User
  updateSystemUser: async (
    req: Request,
    res: Response,
  ) => {
    try {
      const systemUser =
        await systemUserRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUser) {
        res.status(404).json({
          message: "System User not found.",
        });
        return;
      }

      const updateData = new UpdateSystemUserDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const userGroup = normalizeUserGroup(
        updateData.userGroup,
      );

      if (!userGroup) {
        res.status(400).json({
          message:
            "Invalid User Group. Allowed values are Administrator and Demonstration.",
        });
        return;
      }

      if (
        updateData.password !== undefined ||
        updateData.confirmPassword !==
          undefined
      ) {
        if (
          !updateData.password ||
          !updateData.confirmPassword
        ) {
          res.status(400).json({
            message:
              "Both Password and Confirm Password are required when changing the password.",
          });
          return;
        }

        if (
          updateData.password !==
          updateData.confirmPassword
        ) {
          res.status(400).json({
            message:
              "Password and Confirm Password do not match.",
          });
          return;
        }
      }

      const username = updateData.username
        .trim()
        .toLowerCase();

      const email = updateData.email
        .trim()
        .toLowerCase();

      // Check username uniqueness
      const existingUsername =
        await systemUserRepository
          .createQueryBuilder("systemUser")
          .where(
            "LOWER(systemUser.username) = LOWER(:username)",
            { username },
          )
          .andWhere(
            "systemUser.id != :id",
            { id: systemUser.id },
          )
          .getOne();

      if (existingUsername) {
        res.status(409).json({
          message: "Username already exists.",
        });
        return;
      }

      // Check email uniqueness
      const existingEmail =
        await systemUserRepository
          .createQueryBuilder("systemUser")
          .where(
            "LOWER(systemUser.email) = LOWER(:email)",
            { email },
          )
          .andWhere(
            "systemUser.id != :id",
            { id: systemUser.id },
          )
          .getOne();

      if (existingEmail) {
        res.status(409).json({
          message: "E-Mail already exists.",
        });
        return;
      }

      systemUser.username = username;
      systemUser.userGroup = userGroup;
      systemUser.firstName =
        updateData.firstName.trim();
      systemUser.lastName =
        updateData.lastName.trim();
      systemUser.email = email;
      systemUser.image =
        updateData.image?.trim() || null;
      systemUser.isActive =
        updateData.isActive;

      if (updateData.password) {
        systemUser.setPassword(
          updateData.password,
        );
      }

      await systemUserRepository.save(
        systemUser,
      );

      res.status(200).json(
        buildResponse(systemUser),
      );
    } catch (error) {
      console.error(
        "Update system user error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Delete System User
  deleteSystemUser: async (
    req: Request,
    res: Response,
  ) => {
    try {
      const systemUser =
        await systemUserRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUser) {
        res.status(404).json({
          message: "System User not found.",
        });
        return;
      }

      await systemUserRepository.remove(
        systemUser,
      );

      res.status(200).json({
        message:
          "System User deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete system user error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};