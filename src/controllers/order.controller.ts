import { Request, Response } from "express";
import {
  createRetailOrder,
  cancelRetailOrder,
} from "../services/order.service";
import { respondError } from "../utils/api-error";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus, PaymentStatus } from "../entities/order.entity";
import { OrderStatus as OrderStatusSetting } from "../entities/order-status.entity";
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateOrderTrackingDto,
} from "../dto/order.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { Between } from "typeorm";
import { OrderHistory } from "../entities/cancelled-order.entity";
import { sendEmail } from "../utils/email";

const orderRepository = AppDataSource.getRepository(Order);

const actorDetails = (user: any) => ({
  createdBy: user?.id ?? null,
  createdByName:
    [user?.firstName ?? user?.firstname, user?.lastName ?? user?.lastname]
      .filter(Boolean)
      .join(" ") || user?.username || user?.email || "Unknown",
  createdByAccountType: user?.accountType ?? "user",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );

async function notifyStatusChange(order: Order, statusName: string, comment: string) {
  const recipient = order.shippingAddress?.email;
  if (!recipient) throw new Error("Order has no customer email address");
  await sendEmail({
    to: recipient,
    subject: `Order ${order.orderNumber} status: ${statusName}`,
    html: `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> status is now ${escapeHtml(statusName)}.</p>${comment ? `<p>${escapeHtml(comment).replace(/\n/g, "<br>")}</p>` : ""}`,
  });
}

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

      const history = await AppDataSource.getRepository(OrderHistory).find({
        where: { orderId: order.id },
        order: { createdAt: "DESC", id: "DESC" },
      });

      res.status(200).json({ ...order, history });
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

      const selectedStatus = await AppDataSource.getRepository(OrderStatusSetting).findOne({
        where: { code: updateDto.status, isActive: true },
      });

      if (!selectedStatus) {
        res.status(400).json({ message: "Select an enabled order status" });
        return;
      }

      if (order.status === updateDto.status) {
        res.status(409).json({ message: "The order already has this status" });
        return;
      }

      const previousStatus = order.status;
      const comment = updateDto.notes?.trim() ?? "";
      const audit = actorDetails(req.user);
      let updatedOrder: Order;
      let historyEntry: OrderHistory;

      if (updateDto.status === OrderStatus.CANCELLED) {
        try {
          updatedOrder = await cancelRetailOrder(id);
          historyEntry = await AppDataSource.getRepository(OrderHistory).save(
            AppDataSource.getRepository(OrderHistory).create({
              orderId: id,
              previousStatus,
              status: updateDto.status,
              comment,
              customerNotified: false,
              override: false,
              carrierName: updatedOrder.tracking?.carrier ?? null,
              trackingNumber: updatedOrder.tracking?.trackingNumber ?? null,
              ...audit,
            }),
          );
        } catch (error) {
          respondError(res, error);
          return;
        }
      } else if (
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
      } else {
        const result = await AppDataSource.transaction(async (manager) => {
          order.status = updateDto.status as OrderStatus;
          if (comment) order.notes = comment;
          const savedOrder = await manager.getRepository(Order).save(order);
          const historyRepository = manager.getRepository(OrderHistory);
          const savedHistory = await historyRepository.save(
            historyRepository.create({
              orderId: order.id,
              previousStatus,
              status: updateDto.status,
              comment,
              customerNotified: false,
              override: false,
              carrierName: order.tracking?.carrier ?? null,
              trackingNumber: order.tracking?.trackingNumber ?? null,
              ...audit,
            }),
          );
          return { savedOrder, savedHistory };
        });
        updatedOrder = result.savedOrder;
        historyEntry = result.savedHistory;
      }

      let notification: "not_requested" | "sent" | "failed" = "not_requested";
      if (updateDto.notifyCustomer) {
        try {
          await notifyStatusChange(updatedOrder, selectedStatus.name, comment);
          await AppDataSource.getRepository(OrderHistory).update(historyEntry.id, {
            customerNotified: true,
          });
          historyEntry.customerNotified = true;
          notification = "sent";
        } catch (error) {
          console.error("Order status notification error:", error);
          notification = "failed";
        }
      }

      res.status(200).json({ ...updatedOrder, historyEntry, notification });
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
