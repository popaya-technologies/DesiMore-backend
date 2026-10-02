import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { StockStatus } from "../entities/stock-status.entity";
import {
  CreateStockStatusDto,
  UpdateStockStatusDto,
} from "../dto/stock-status.dto";

export class StockStatusController {
  static async createStockStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

      const dto = req.body as CreateStockStatusDto;

      const name = dto.name.trim();

      const existing = await repository.findOne({
        where: { name },
      });

      if (existing) {
        res.status(409).json({
          message: "Stock status already exists",
        });
        return;
      }

      const stockStatus = repository.create({
        name,
      });

      const savedStockStatus =
        await repository.save(stockStatus);

      res.status(201).json(savedStockStatus);
    } catch (error) {
      console.error(
        "Create stock status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to create stock status",
      });
    }
  }

  static async getStockStatuses(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

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
        .createQueryBuilder("stockStatus")
        .orderBy("stockStatus.name", "ASC")
        .addOrderBy(
          "stockStatus.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          "stockStatus.name ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [stockStatuses, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: stockStatuses,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error(
        "Get stock statuses error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get stock statuses",
      });
    }
  }

  static async getStockStatusById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

      const { id } = req.params;

      const stockStatus =
        await repository.findOne({
          where: { id },
        });

      if (!stockStatus) {
        res.status(404).json({
          message: "Stock status not found",
        });
        return;
      }

      res.status(200).json(stockStatus);
    } catch (error) {
      console.error(
        "Get stock status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get stock status",
      });
    }
  }

  static async updateStockStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

      const { id } = req.params;

      const dto = req.body as UpdateStockStatusDto;

      const stockStatus =
        await repository.findOne({
          where: { id },
        });

      if (!stockStatus) {
        res.status(404).json({
          message: "Stock status not found",
        });
        return;
      }

      if (dto.name !== undefined) {
        const name = dto.name.trim();

        const existing =
          await repository.findOne({
            where: { name },
          });

        if (
          existing &&
          existing.id !== stockStatus.id
        ) {
          res.status(409).json({
            message: "Stock status already exists",
          });
          return;
        }

        stockStatus.name = name;
      }

      const updatedStockStatus =
        await repository.save(stockStatus);

      res.status(200).json(updatedStockStatus);
    } catch (error) {
      console.error(
        "Update stock status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update stock status",
      });
    }
  }

  static async deleteStockStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

      const { id } = req.params;

      const stockStatus =
        await repository.findOne({
          where: { id },
        });

      if (!stockStatus) {
        res.status(404).json({
          message: "Stock status not found",
        });
        return;
      }

      await repository.remove(stockStatus);

      res.status(200).json({
        message: "Stock status deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete stock status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete stock status",
      });
    }
  }
}