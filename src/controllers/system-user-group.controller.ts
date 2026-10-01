import { Request, Response } from "express";
import { validate } from "class-validator";

import { AppDataSource } from "../data-source";
import { SystemUserGroup } from "../entities/system-user-group.entity";
import {
  CreateSystemUserGroupDto,
  UpdateSystemUserGroupDto,
} from "../dto/system-user-group.dto";

const systemUserGroupRepository =
  AppDataSource.getRepository(SystemUserGroup);

const buildResponse = (systemUserGroup: SystemUserGroup) => {
  return {
    id: systemUserGroup.id,
    name: systemUserGroup.name,
    createdAt: systemUserGroup.createdAt,
    updatedAt: systemUserGroup.updatedAt,
  };
};

export const SystemUserGroupController = {
  // Create System User Group
  createSystemUserGroup: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const systemUserGroupData =
        new CreateSystemUserGroupDto();

      Object.assign(systemUserGroupData, req.body);

      const errors = await validate(systemUserGroupData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const name = systemUserGroupData.name.trim();

      const existingGroup =
        await systemUserGroupRepository.findOne({
          where: { name },
        });

      if (existingGroup) {
        res.status(409).json({
          message: "System user group already exists.",
        });
        return;
      }

      const systemUserGroup =
        systemUserGroupRepository.create({
          name,
        });

      await systemUserGroupRepository.save(systemUserGroup);

      res
        .status(201)
        .json(buildResponse(systemUserGroup));
    } catch (error) {
      console.error(
        "Create system user group error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get System User Groups
  getSystemUserGroups: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const {
        search,
        page = "1",
        limit = "10",
      } = req.query;

      const currentPage = Math.max(
        parseInt(String(page), 10) || 1,
        1,
      );

      const take = Math.min(
        Math.max(
          parseInt(String(limit), 10) || 10,
          1,
        ),
        100,
      );

      const skip = (currentPage - 1) * take;

      const query =
        systemUserGroupRepository.createQueryBuilder(
          "systemUserGroup",
        );

      if (search && String(search).trim()) {
        query.andWhere(
          "systemUserGroup.name ILIKE :search",
          {
            search: `%${String(search).trim()}%`,
          },
        );
      }

      query
        .orderBy(
          "systemUserGroup.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(take);

      const [systemUserGroups, total] =
        await query.getManyAndCount();

      res.status(200).json({
        data: systemUserGroups.map(buildResponse),
        meta: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error(
        "Get system user groups error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Get Single System User Group
  getSystemUserGroupById: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const systemUserGroup =
        await systemUserGroupRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUserGroup) {
        res.status(404).json({
          message: "System User Group not found.",
        });
        return;
      }

      res.status(200).json(
        buildResponse(systemUserGroup),
      );
    } catch (error) {
      console.error(
        "Get system user group error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Update System User Group
  updateSystemUserGroup: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const systemUserGroup =
        await systemUserGroupRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUserGroup) {
        res.status(404).json({
          message: "System User Group not found.",
        });
        return;
      }

      const updateData =
        new UpdateSystemUserGroupDto();

      Object.assign(updateData, req.body);

      const errors = await validate(updateData);

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      if (updateData.name !== undefined) {
        const name = updateData.name.trim();

        const existingGroup =
          await systemUserGroupRepository
            .createQueryBuilder("systemUserGroup")
            .where(
              "LOWER(systemUserGroup.name) = LOWER(:name)",
              { name },
            )
            .andWhere(
              "systemUserGroup.id != :id",
              { id: systemUserGroup.id },
            )
            .getOne();

        if (existingGroup) {
          res.status(409).json({
            message:
              "System user group already exists.",
          });
          return;
        }

        systemUserGroup.name = name;
      }

      await systemUserGroupRepository.save(
        systemUserGroup,
      );

      res.status(200).json(
        buildResponse(systemUserGroup),
      );
    } catch (error) {
      console.error(
        "Update system user group error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },

  // Delete System User Group
  deleteSystemUserGroup: async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    try {
      const systemUserGroup =
        await systemUserGroupRepository.findOne({
          where: {
            id: req.params.id,
          },
        });

      if (!systemUserGroup) {
        res.status(404).json({
          message: "System User Group not found.",
        });
        return;
      }

      await systemUserGroupRepository.remove(
        systemUserGroup,
      );

      res.status(200).json({
        message:
          "System User Group deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete system user group error:",
        error,
      );

      res.status(500).json({
        message: "Internal server error",
      });
    }
  },
};