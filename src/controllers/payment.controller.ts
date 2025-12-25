import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus } from "../entities/order.entity";
import { Payment, PaymentMethod, PaymentStatus } from "../entities/payment.entity";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AuthorizeNetService } from "../services/authorize-net.service";
import {
  ProcessPaymentDto,
  RefundPaymentDto,
  CheckoutPaymentDto,
} from "../dto/payment.dto";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { Product } from "../entities/product.entity";
import { OrderItem } from "../entities/order-item.entity";

const orderRepository = AppDataSource.getRepository(Order);
const paymentRepository = AppDataSource.getRepository(Payment);
const cartRepository = AppDataSource.getRepository(Cart);
const cartItemRepository = AppDataSource.getRepository(CartItem);
const productRepository = AppDataSource.getRepository(Product);

export const PaymentController = {
  processPayment: async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user.id;
      // Backward-compatible path (existing: order-first payment)
      if (req.body && req.body.orderId) {
        // Transform and validate DTO
        const processPaymentDto = plainToInstance(ProcessPaymentDto, req.body);
        const errors = await validate(processPaymentDto, {
          whitelist: true,
          forbidUnknownValues: true,
          validationError: { target: false },
        });

        if (errors.length > 0) {
          res.status(400).json({ errors });
          return;
        }

        // Verify user owns the order
        const order = await orderRepository.findOne({
          where: { id: processPaymentDto.orderId, userId },
          relations: ["items"], // Load items to see the calculation
        });

        if (!order) {
          res.status(404).json({ message: "Order not found" });
          return;
        }

        if (order.paymentStatus === PaymentStatus.COMPLETED) {
          res.status(400).json({ message: "Order already paid" });
          return;
        }

        // Process payment based on existing order total
        const orderTotal =
          typeof order.total === "string" ? parseFloat(order.total) : order.total;

        if (isNaN(orderTotal) || orderTotal <= 0) {
          res.status(400).json({
            message: "Invalid order total",
            orderTotal: order.total,
          });
          return;
        }

        const payment = await AuthorizeNetService.createTransaction(
          processPaymentDto.orderId,
          {
            cardNumber: processPaymentDto.cardNumber,
            expirationDate: processPaymentDto.expirationDate,
            cardCode: processPaymentDto.cardCode,
            amount: orderTotal,
          }
        );

        const isSuccess = payment.status === "completed";
        res.status(isSuccess ? 200 : 400).json({
          success: isSuccess,
          payment,
          message: isSuccess
            ? "Payment processed successfully"
            : "Payment processing failed",
        });
        return;
      }

      // New path: pay-then-create (no pre-existing order)
      const checkoutDto = plainToInstance(CheckoutPaymentDto, req.body);
      const errors = await validate(checkoutDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Load user's cart
      const cartWhere = checkoutDto.cartId
        ? { id: checkoutDto.cartId, userId }
        : { userId, type: CartType.REGULAR };

      const cart = await cartRepository.findOne({
        where: cartWhere,
        relations: ["items", "items.product"],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        res.status(400).json({ message: "Cart is empty" });
        return;
      }

      // Build order items & compute totals (without persisting yet)
      const tempOrderItems: OrderItem[] = await Promise.all(
        cart.items.map(async (cartItem) => {
          const orderItem = new OrderItem();
          orderItem.productId = cartItem.productId;
          orderItem.productName = cartItem.product.title;
          orderItem.productImages = cartItem.product.images;
          orderItem.quantity = cartItem.quantity;

          const resolvedPrice =
            typeof cartItem.price === "string"
              ? parseFloat(cartItem.price)
              : cartItem.price ??
                (typeof cartItem.product.discountPrice === "string"
                  ? parseFloat(cartItem.product.discountPrice)
                  : typeof cartItem.product.discountPrice === "number"
                  ? cartItem.product.discountPrice
                  : typeof cartItem.product.price === "string"
                  ? parseFloat(cartItem.product.price)
                  : cartItem.product.price);

          if (
            resolvedPrice === null ||
            resolvedPrice === undefined ||
            isNaN(resolvedPrice) ||
            resolvedPrice <= 0
          ) {
            throw new Error(
              `Invalid product price for product ${cartItem.product.title}`
            );
          }

          orderItem.price = resolvedPrice;

          if (cartItem.product.discountPrice) {
            const discountedPrice =
              typeof cartItem.product.discountPrice === "string"
                ? parseFloat(cartItem.product.discountPrice)
                : cartItem.product.discountPrice;
            if (!isNaN(discountedPrice) && discountedPrice > 0) {
              orderItem.discountedPrice = discountedPrice;
            }
          }
          orderItem.calculateTotal();
          return orderItem;
        })
      );

      const subtotal = tempOrderItems.reduce((sum, item) => {
        const itemTotal =
          typeof item.total === "string" ? parseFloat(item.total) : item.total;
        return sum + (isNaN(itemTotal) ? 0 : itemTotal);
      }, 0);
      const tax = 0; // Tax disabled
      const shipping = subtotal > 500 ? 0 : 50;
      const total = subtotal + shipping;
      if (isNaN(total) || total <= 0) {
        res.status(400).json({ message: "Invalid cart total" });
        return;
      }

      // Generate an invoice number (reuse Order.generateOrderNumber logic)
      const tempOrderForNumber = new Order();
      tempOrderForNumber.generateOrderNumber();
      const invoiceNumber = tempOrderForNumber.orderNumber;

      // Charge via Authorize.Net without a saved order
      const chargeResult = await AuthorizeNetService.createTransactionForCheckout({
        userEmail: req.user.email,
        cardNumber: checkoutDto.cardNumber,
        expirationDate: checkoutDto.expirationDate,
        cardCode: checkoutDto.cardCode,
        amount: total,
        invoiceNumber,
        billingAddress: checkoutDto.billingAddress || checkoutDto.shippingAddress,
        shippingAddress: checkoutDto.shippingAddress,
      });

      if (chargeResult.status !== "completed") {
        res.status(400).json({
          success: false,
          message: chargeResult.failureMessage || "Payment processing failed",
          details: chargeResult.authorizeNetResponse,
        });
        return;
      }

      // Create order now that payment is successful
      const order = new Order();
      order.userId = userId;
      order.orderNumber = invoiceNumber; // ensure consistency with payment invoice
      order.shippingAddress = checkoutDto.shippingAddress as any;
      order.billingAddress =
        (checkoutDto.billingAddress as any) || (checkoutDto.shippingAddress as any);
      order.paymentMethod = checkoutDto.paymentMethod;
      order.notes = checkoutDto.notes;
      order.items = tempOrderItems;
      order.subtotal = subtotal;
      order.tax = tax;
      order.shipping = shipping;
      order.total = total;
      order.paymentStatus = PaymentStatus.COMPLETED;
      order.status = OrderStatus.CONFIRMED;
      order.transactionId = chargeResult.transactionId;

      await orderRepository.save(order);

      // Clear cart
      await cartItemRepository.delete({ cartId: cart.id });
      cart.total = 0 as any;
      cart.wholesaleTotal = 0 as any;
      cart.itemsCount = 0 as any;
      await cartRepository.save(cart);

      // Persist payment record linked to the newly created order
      const payment = paymentRepository.create({
        orderId: order.id,
        amount: total as any,
        currency: "USD",
        status: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.CREDIT_CARD,
        transactionId: chargeResult.transactionId,
        authCode: chargeResult.authCode,
        paymentDetails: chargeResult.paymentDetails as any,
        authorizeNetResponse: chargeResult.authorizeNetResponse,
      });
      await paymentRepository.save(payment);

      res.status(200).json({
        success: true,
        message: "Payment processed and order created successfully",
        order,
        payment,
      });
    } catch (error) {
      console.error("Payment processing error:", error);
      res.status(500).json({
        message: "Payment processing failed",
        error: error.message,
      });
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
        refundDto.amount
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
