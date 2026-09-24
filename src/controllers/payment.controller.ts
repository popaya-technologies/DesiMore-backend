import { Request, Response } from "express";
import { createRetailOrder } from "../services/order.service";
import { ApiError, respondError } from "../utils/api-error";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus } from "../entities/order.entity";
import { Payment, PaymentStatus } from "../entities/payment.entity";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AuthorizeNetService } from "../services/authorize-net.service";
import {
  ProcessPaymentDto,
  RefundPaymentDto,
  CheckoutPaymentDto,
} from "../dto/payment.dto";

const orderRepository = AppDataSource.getRepository(Order);
const paymentRepository = AppDataSource.getRepository(Payment);

export const PaymentController = {
  processPayment: async (req: Request, res: Response): Promise<void> => {
    let orderId: string | undefined = req.body?.orderId;
    try {
      const dto: any = orderId
        ? plainToInstance(ProcessPaymentDto, req.body)
        : plainToInstance(CheckoutPaymentDto, req.body);
      const errors = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
      });
      if (errors.length)
        throw new ApiError(400, "Invalid payment data", errors);
      let order: Order;
      if (orderId) {
        order = await orderRepository.findOne({
          where: { id: orderId, userId: req.user.id },
        });
        if (!order) throw new ApiError(404, "Order not found");
      } else {
        // Persist the pending order and reserve stock before contacting the gateway.
        // A declined/unknown charge can be retried/reconciled against this order ID.
        order = await createRetailOrder(req.user.id, dto);
        orderId = order.id;
      }
      if ([OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(order.status))
        throw new ApiError(400, "Order cannot be paid");
      if (
        [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING].includes(
          order.paymentStatus,
        )
      )
        throw new ApiError(409, "Payment already completed or processing");
      const payment = await AuthorizeNetService.createTransaction(order.id, {
        cardNumber: dto.cardNumber,
        expirationDate: dto.expirationDate,
        cardCode: dto.cardCode,
        amount: Number(order.total),
      });
      const updated = await orderRepository.findOne({
        where: { id: order.id },
        relations: ["items"],
      });
      const success = payment.status === PaymentStatus.COMPLETED;
      res
        .status(success ? 200 : 400)
        .json({
          success,
          order: updated,
          orderId,
          payment,
          message: success
            ? "Payment processed successfully"
            : "Payment failed; retry using orderId",
        });
    } catch (error) {
      if (orderId) res.setHeader("X-Order-Id", orderId);
      if (!(error instanceof ApiError) && orderId) {
        console.error("Payment processing error", error);
        res
          .status(502)
          .json({
            message:
              "Payment could not be confirmed. Check this order before retrying.",
            orderId,
          });
      } else respondError(res, error);
    }
  },

  getPaymentStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const payment = await paymentRepository.findOne({
        where: { orderId },
        relations: ["order"],
      });

      if (!payment || payment.order.userId !== userId) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }

      res.status(200).json(payment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  refundPayment: async (req: Request, res: Response): Promise<void> => {
    try {
      const { paymentId } = req.params;

      // Transform and validate DTO
      const refundDto = plainToInstance(RefundPaymentDto, req.body);
      const errors = await validate(refundDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const payment = await paymentRepository.findOne({
        where: { id: paymentId },
        relations: ["order"],
      });

      if (!payment) {
        res.status(404).json({ message: "Payment not found" });
        return;
      }

      // Check if user owns the payment or is admin
      if (payment.order.userId !== req.user.id && req.user.userRole !== "su") {
        res.status(403).json({ message: "Access denied" });
        return;
      }

      const refundedPayment = await AuthorizeNetService.refundTransaction(
        paymentId,
        refundDto.amount,
      );

      res.status(200).json({
        success: true,
        payment: refundedPayment,
        message: "Refund processed successfully",
      });
    } catch (error) {
      console.error("Refund error:", error);
      res.status(500).json({
        message: "Refund failed",
        error: error.message,
      });
    }
  },

  getTransactionDetails: async (req: Request, res: Response): Promise<void> => {
    try {
      const { transactionId } = req.params;

      const transactionDetails =
        await AuthorizeNetService.getTransactionDetails(transactionId);

      res.status(200).json(transactionDetails);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
