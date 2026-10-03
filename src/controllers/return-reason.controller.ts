import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import {
  CreateReturnReasonDto,
  UpdateReturnReasonDto,
} from "../dto/return-reason.dto";
import { ReturnReason } from "../entities/return-reason.entity";

export class ReturnReasonController {
  static async createReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ReturnReason);

      const dto = req.body as CreateReturnReasonDto;

      const existing = await repository.findOne({
        where: { name: dto.name.trim() },
      });

      if (existing) {
        res.status(409).json({
          message: "Return reason already exists",
        });
        return;
      }

      const returnReason = repository.create({
        name: dto.name.trim(),
      });

      const savedReturnReason = await repository.save(returnReason);

      res.status(201).json(savedReturnReason);
    } catch (error) {
      console.error("Create return reason error:", error);

      res.status(500).json({
        message: "Failed to create return reason",
      });
    }
  }

  static async getReturnReasons(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ReturnReason);

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

      const queryBuilder = repository
        .createQueryBuilder("returnReason")
        .orderBy("returnReason.createdAt", "ASC");

      if (search) {
        queryBuilder.andWhere(
          "returnReason.name ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [data, total] = await queryBuilder
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      res.json({
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Get return reasons error:", error);

      res.status(500).json({
        message: "Failed to get return reasons",
      });
    }
  }

  static async getReturnReasonById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ReturnReason);

      const returnReason = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      res.json(returnReason);
    } catch (error) {
      console.error(
        "Get return reason by id error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get return reason",
      });
    }
  }

  static async updateReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ReturnReason);

      const returnReason = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      const dto = req.body as UpdateReturnReasonDto;

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        const existing = await repository.findOne({
          where: { name },
        });

        if (
          existing &&
          existing.id !== returnReason.id
        ) {
          res.status(409).json({
            message: "Return reason already exists",
          });
          return;
        }

        returnReason.name = name;
      }

      const updatedReturnReason =
        await repository.save(returnReason);

      res.json(updatedReturnReason);
    } catch (error) {
      console.error("Update return reason error:", error);

      res.status(500).json({
        message: "Failed to update return reason",
      });
    }
  }

  static async deleteReturnReason(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(ReturnReason);

      const returnReason = await repository.findOne({
        where: {
          id: req.params.id,
        },
      });

      if (!returnReason) {
        res.status(404).json({
          message: "Return reason not found",
        });
        return;
      }

      await repository.remove(returnReason);

      res.json({
        message: "Return reason deleted successfully",
      });
    } catch (error) {
      console.error("Delete return reason error:", error);

      res.status(500).json({
        message: "Failed to delete return reason",
      });
    }
  }
}