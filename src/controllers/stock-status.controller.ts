import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { StockStatus } from "../entities/stock-status.entity";
import {
  CreateStockStatusDto,
  UpdateStockStatusDto,
} from "../dto/stock-status.dto";
import { Product } from "../entities/product.entity";

export class StockStatusController {
  static async createStockStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository =
        AppDataSource.getRepository(StockStatus);

      const dto = plainToInstance(CreateStockStatusDto, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.flatMap((error) => Object.values(error.constraints ?? {})),
        });
        return;
      }

      const name = dto.name.trim();

      const existing = await repository
        .createQueryBuilder("stockStatus")
        .where("LOWER(stockStatus.name) = LOWER(:name)", { name })
        .getOne();

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

      const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

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

      const dto = plainToInstance(UpdateStockStatusDto, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.flatMap((error) => Object.values(error.constraints ?? {})),
        });
        return;
      }

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

        const existing = await repository
          .createQueryBuilder("stockStatus")
          .where("LOWER(stockStatus.name) = LOWER(:name)", { name })
          .getOne();

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

      const productsUsingStatus = await AppDataSource.getRepository(Product).count({
        where: { stockStatusId: stockStatus.id },
      });

      if (productsUsingStatus > 0) {
        res.status(409).json({
          message: `This stock status is assigned to ${productsUsingStatus} product${productsUsingStatus === 1 ? "" : "s"}`,
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
