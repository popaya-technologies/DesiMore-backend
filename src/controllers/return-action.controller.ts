import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { ReturnAction } from "../entities/return-action.entity";
import {
  CreateReturnActionDto,
  UpdateReturnActionDto,
} from "../dto/return-action.dto";

export class ReturnActionController {
  static async createReturnAction(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnAction);

      const dto = req.body as CreateReturnActionDto;
      const name = dto.name.trim();

      const existing = await repository.findOne({
        where: { name },
      });

      if (existing) {
        res.status(409).json({
          message: "Return action already exists",
        });
        return;
      }

      const returnAction = repository.create({
        name,
      });

      const savedReturnAction =
        await repository.save(returnAction);

      res.status(201).json(savedReturnAction);
    } catch (error) {
      console.error(
        "Create return action error:",
        error,
      );

      res.status(500).json({
        message: "Failed to create return action",
      });
    }
  }

  static async getReturnActions(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnAction);

      const search =
        typeof req.query.search === "string"
          ? req.query.search.trim()
          : "";

      const page = Math.max(
        Number(req.query.page) || 1,
        1,
      );

      const limit = Math.max(
        Number(req.query.limit) || 10,
        1,
      );

      const skip = (page - 1) * limit;

      const queryBuilder = repository
        .createQueryBuilder("returnAction")
        .orderBy("returnAction.name", "ASC")
        .addOrderBy(
          "returnAction.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          "returnAction.name ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [returnActions, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: returnActions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(
            total / limit,
          ),
        },
      });
    } catch (error) {
      console.error(
        "Get return actions error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get return actions",
      });
    }
  }

  static async getReturnActionById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnAction);

      const { id } = req.params;

      const returnAction = await repository.findOne({
        where: { id },
      });

      if (!returnAction) {
        res.status(404).json({
          message: "Return action not found",
        });
        return;
      }

      res.status(200).json(returnAction);
    } catch (error) {
      console.error(
        "Get return action error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get return action",
      });
    }
  }

  static async updateReturnAction(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnAction);

      const { id } = req.params;

      const dto = req.body as UpdateReturnActionDto;

      const returnAction = await repository.findOne({
        where: { id },
      });

      if (!returnAction) {
        res.status(404).json({
          message: "Return action not found",
        });
        return;
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        const existing = await repository.findOne({
          where: { name },
        });

        if (
          existing &&
          existing.id !== returnAction.id
        ) {
          res.status(409).json({
            message: "Return action already exists",
          });
          return;
        }

        returnAction.name = name;
      }

      const updatedReturnAction =
        await repository.save(returnAction);

      res.status(200).json(updatedReturnAction);
    } catch (error) {
      console.error(
        "Update return action error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update return action",
      });
    }
  }

  static async deleteReturnAction(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(ReturnAction);

      const { id } = req.params;

      const returnAction = await repository.findOne({
        where: { id },
      });

      if (!returnAction) {
        res.status(404).json({
          message: "Return action not found",
        });
        return;
      }

      await repository.remove(returnAction);

      res.status(200).json({
        message: "Return action deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete return action error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete return action",
      });
    }
  }
}