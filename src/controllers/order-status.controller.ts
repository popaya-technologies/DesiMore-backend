import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { OrderStatus } from "../entities/order-status.entity";
import {
  CreateOrderStatusDto,
  UpdateOrderStatusDto,
} from "../dto/order-status.dto";

export class OrderStatusController {
  static async createOrderStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OrderStatus);
      const dto = plainToInstance(CreateOrderStatusDto, req.body);
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
      const code = dto.code.trim().toLowerCase();

      if (dto.isDefault && !dto.isActive) {
        res.status(400).json({ message: "The default order status must be enabled" });
        return;
      }

      const existing = await repository
        .createQueryBuilder("status")
        .where("LOWER(status.name) = LOWER(:name)", { name })
        .orWhere("LOWER(status.code) = LOWER(:code)", { code })
        .getOne();

      if (existing) {
        res.status(409).json({
          message: "An order status with this name or code already exists",
        });
        return;
      }

      const orderStatus = repository.create({
        name,
        code,
        color: dto.color.toLowerCase(),
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
        isSystem: false,
        isDefault: dto.isDefault,
      });

      const savedOrderStatus = await AppDataSource.transaction(async (manager) => {
        if (dto.isDefault) {
          await manager
            .getRepository(OrderStatus)
            .createQueryBuilder()
            .update(OrderStatus)
            .set({ isDefault: false })
            .execute();
        }
        return manager.getRepository(OrderStatus).save(orderStatus);
      });

      res.status(201).json(savedOrderStatus);
    } catch (error) {
      console.error(
        "Create order status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to create order status",
      });
    }
  }

  static async getOrderStatuses(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OrderStatus);

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

      const safeLimit = Math.min(limit, 100);
      const activeOnly = req.query.activeOnly === "true";

      const skip = (page - 1) * safeLimit;

      const queryBuilder = repository
        .createQueryBuilder("orderStatus")
        .orderBy("orderStatus.sortOrder", "ASC")
        .addOrderBy("orderStatus.name", "ASC")
        .skip(skip)
        .take(safeLimit);

      if (search) {
        queryBuilder.andWhere(
          "(orderStatus.name ILIKE :search OR orderStatus.code ILIKE :search)",
          {
            search: `%${search}%`,
          },
        );
      }

      if (activeOnly) {
        queryBuilder.andWhere("orderStatus.isActive = true");
      }

      const [orderStatuses, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: orderStatuses,
        meta: {
          total,
          page,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
        },
      });
    } catch (error) {
      console.error(
        "Get order statuses error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get order statuses",
      });
    }
  }

  static async getOrderStatusById(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OrderStatus);

      const { id } = req.params;

      const orderStatus = await repository.findOne({
        where: { id },
      });

      if (!orderStatus) {
        res.status(404).json({
          message: "Order status not found",
        });
        return;
      }

      res.status(200).json(orderStatus);
    } catch (error) {
      console.error(
        "Get order status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to get order status",
      });
    }
  }

  static async updateOrderStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OrderStatus);

      const { id } = req.params;

      const dto = plainToInstance(UpdateOrderStatusDto, req.body);
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

      const orderStatus = await repository.findOne({
        where: { id },
      });

      if (!orderStatus) {
        res.status(404).json({
          message: "Order status not found",
        });
        return;
      }

      const name = dto.name === undefined ? orderStatus.name : dto.name.trim();
      const code = dto.code === undefined
        ? orderStatus.code
        : dto.code.trim().toLowerCase();

      if (code !== orderStatus.code) {
        res.status(409).json({
          message: "Order status code cannot be changed after creation",
        });
        return;
      }

      const existing = await repository
        .createQueryBuilder("status")
        .where("status.id <> :id", { id: orderStatus.id })
        .andWhere(
          "(LOWER(status.name) = LOWER(:name) OR LOWER(status.code) = LOWER(:code))",
          { name, code },
        )
        .getOne();

      if (existing) {
        res.status(409).json({
          message: "An order status with this name or code already exists",
        });
        return;
      }

      const nextIsActive = dto.isActive ?? orderStatus.isActive;
      const nextIsDefault = dto.isDefault ?? orderStatus.isDefault;
      if (nextIsDefault && !nextIsActive) {
        res.status(400).json({ message: "The default order status must be enabled" });
        return;
      }
      if (orderStatus.isDefault && dto.isDefault === false) {
        res.status(409).json({
          message: "Choose another default status before removing this default",
        });
        return;
      }

      orderStatus.name = name;
      orderStatus.color = dto.color?.toLowerCase() ?? orderStatus.color;
      orderStatus.sortOrder = dto.sortOrder ?? orderStatus.sortOrder;
      orderStatus.isActive = nextIsActive;
      orderStatus.isDefault = nextIsDefault;

      const updatedOrderStatus = await AppDataSource.transaction(async (manager) => {
        if (dto.isDefault === true) {
          await manager
            .getRepository(OrderStatus)
            .createQueryBuilder()
            .update(OrderStatus)
            .set({ isDefault: false })
            .where("id <> :id", { id: orderStatus.id })
            .execute();
        }
        return manager.getRepository(OrderStatus).save(orderStatus);
      });

      res.status(200).json(updatedOrderStatus);
    } catch (error) {
      console.error(
        "Update order status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to update order status",
      });
    }
  }

  static async deleteOrderStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const repository = AppDataSource.getRepository(OrderStatus);

      const { id } = req.params;

      const orderStatus = await repository.findOne({
        where: { id },
      });

      if (!orderStatus) {
        res.status(404).json({
          message: "Order status not found",
        });
        return;
      }

      if (orderStatus.isDefault) {
        res.status(409).json({
          message: "The default order status cannot be deleted",
        });
        return;
      }

      if (orderStatus.isSystem) {
        res.status(409).json({
          message: "System order statuses cannot be deleted",
        });
        return;
      }

      await repository.remove(orderStatus);

      res.status(200).json({
        message: "Order status deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete order status error:",
        error,
      );

      res.status(500).json({
        message: "Failed to delete order status",
      });
    }
  }
}
