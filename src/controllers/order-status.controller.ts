import { Request, Response } from "express";
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
      const dto = req.body as CreateOrderStatusDto;

      const name = dto.name.trim();

      const existing = await repository.findOne({
        where: { name },
      });

      if (existing) {
        res.status(409).json({
          message: "Order status already exists",
        });
        return;
      }

      const orderStatus = repository.create({
        name,
      });

      const savedOrderStatus =
        await repository.save(orderStatus);

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

      const skip = (page - 1) * limit;

      const queryBuilder = repository
        .createQueryBuilder("orderStatus")
        .orderBy("orderStatus.name", "ASC")
        .addOrderBy(
          "orderStatus.createdAt",
          "DESC",
        )
        .skip(skip)
        .take(limit);

      if (search) {
        queryBuilder.where(
          "orderStatus.name ILIKE :search",
          {
            search: `%${search}%`,
          },
        );
      }

      const [orderStatuses, total] =
        await queryBuilder.getManyAndCount();

      res.status(200).json({
        data: orderStatuses,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
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

      const dto = req.body as UpdateOrderStatusDto;

      const orderStatus = await repository.findOne({
        where: { id },
      });

      if (!orderStatus) {
        res.status(404).json({
          message: "Order status not found",
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
          existing.id !== orderStatus.id
        ) {
          res.status(409).json({
            message: "Order status already exists",
          });
          return;
        }

        orderStatus.name = name;
      }

      const updatedOrderStatus =
        await repository.save(orderStatus);

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