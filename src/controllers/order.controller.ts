import { Request, Response } from "express";
import {
  createRetailOrder,
  cancelRetailOrder,
} from "../services/order.service";
import { respondError } from "../utils/api-error";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus, PaymentStatus } from "../entities/order.entity";
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateOrderTrackingDto,
} from "../dto/order.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { Between } from "typeorm";

const orderRepository = AppDataSource.getRepository(Order);

const buildDateRange = (from?: any, to?: any) => {
  if (!from && !to) return undefined;
  const fromStr = Array.isArray(from) ? from[0] : from;
  const toStr = Array.isArray(to) ? to[0] : to;

  let fromDate = fromStr ? new Date(fromStr) : undefined;
  let toDate = toStr ? new Date(toStr) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) fromDate = undefined;
  if (toDate && isNaN(toDate.getTime())) toDate = undefined;

  if (!fromDate && !toDate) return undefined;

  if (fromDate) {
    fromDate.setHours(0, 0, 0, 0);
  }
  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return Between(fromDate ?? new Date(0), toDate ?? new Date());
};

export const OrderController = {
  // Create order from cart
  createOrder: async (req: Request, res: Response) => {
    try {
      res.status(201).json(await createRetailOrder(req.user.id, req.body));
    } catch (error) {
      respondError(res, error);
    }
  },

  // Admin: Get all users' orders
  adminGetAllOrders: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, status, from, to } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = {};
      if (status) {
        where.status = status;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [orders, total] = await orderRepository.findAndCount({
        where,
        relations: ["items", "user"],
        order: { createdAt: "DESC" },
        skip,
        take: parseInt(limit as string),
      });

      res.status(200).json({
        orders,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Admin: Get a single order by ID (with items and user)
  adminGetOrderById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const order = await orderRepository.findOne({
        where: { id },
        relations: ["items", "user"],
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update tracking info (Admin only)
  updateOrderTracking: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto = plainToInstance(UpdateOrderTrackingDto, req.body);

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const order = await orderRepository.findOne({
        where: { id },
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      order.tracking = {
        carrier: updateDto.carrier,
        trackingNumber: updateDto.trackingNumber,
      };

      await orderRepository.save(order);

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get user's orders
  getUserOrders: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status, from, to } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = { userId };

      if (status) {
        where.status = status;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [orders, total] = await orderRepository.findAndCount({
        where,
        relations: ["items"],
        order: { createdAt: "DESC" },
        skip,
        take: parseInt(limit as string),
      });

      res.status(200).json({
        orders,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Get order by ID
  getOrder: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const order = await orderRepository.findOne({
        where: { id, userId },
        relations: ["items"],
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
      }

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update order status (Admin only)
  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto = plainToInstance(UpdateOrderStatusDto, req.body);

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const order = await orderRepository.findOne({
        where: { id },
        relations: ["items"],
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (updateDto.status === OrderStatus.CANCELLED) {
        try {
          res.json(await cancelRetailOrder(id));
        } catch (error) {
          respondError(res, error);
        }
        return;
      }
      if (
        order.status === OrderStatus.CANCELLED ||
        updateDto.status === OrderStatus.REFUNDED
      ) {
        res
          .status(400)
          .json({
            message:
              "Use the payment refund flow; cancelled orders cannot be reopened",
          });
        return;
      }
      order.status = updateDto.status;
      if (updateDto.notes) {
        order.notes = updateDto.notes;
      }

      await orderRepository.save(order);

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Update payment status
  updatePaymentStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto = plainToInstance(UpdatePaymentStatusDto, req.body);

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const order = await orderRepository.findOne({
        where: { id },
        relations: ["items"],
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      order.paymentStatus = updateDto.paymentStatus;
      if (updateDto.transactionId) {
        order.transactionId = updateDto.transactionId;
      }

      await orderRepository.save(order);

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Cancel order
  cancelOrder: async (req: Request, res: Response) => {
    try {
      res.json(await cancelRetailOrder(req.params.id, req.user.id));
    } catch (error) {
      respondError(res, error);
    }
  },
};
