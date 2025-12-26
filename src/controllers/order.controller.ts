import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus, PaymentStatus } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { Product } from "../entities/product.entity";
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from "../dto/order.dto";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { generateOrderNumber } from "../utils/reference-number.util";

const orderRepository = AppDataSource.getRepository(Order);
const orderItemRepository = AppDataSource.getRepository(OrderItem);
const cartRepository = AppDataSource.getRepository(Cart);
const cartItemRepository = AppDataSource.getRepository(CartItem);
const productRepository = AppDataSource.getRepository(Product);

export const OrderController = {
  // Create order from cart
  createOrder: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      // Transform plain body to DTO instance so nested validation works
      const createOrderDto = plainToInstance(CreateOrderDto, req.body);

      const errors = await validate(createOrderDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });
      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      // Get user's cart with items
      const cartWhere = createOrderDto.cartId
        ? { id: createOrderDto.cartId, userId }
        : { userId, type: CartType.REGULAR };

      const cart = await cartRepository.findOne({
        where: cartWhere,
        relations: ["items", "items.product"],
      });

      if (!cart || cart.items.length === 0) {
        res.status(400).json({ message: "Cart is empty" });
        return;
      }

      // Create order
      const order = new Order();
      order.userId = userId;
      order.orderNumber = await generateOrderNumber();
      order.shippingAddress = createOrderDto.shippingAddress;
      order.billingAddress =
        createOrderDto.billingAddress || createOrderDto.shippingAddress;
      order.paymentMethod = createOrderDto.paymentMethod;
      order.notes = createOrderDto.notes;

      // Create order items from cart items
      order.items = await Promise.all(
        cart.items.map(async (cartItem) => {
          const orderItem = new OrderItem();
          orderItem.productId = cartItem.productId;
          orderItem.productName = cartItem.product.title;
          orderItem.productImages = cartItem.product.images;
          orderItem.quantity = cartItem.quantity;
          // Debug cart item product prices
          console.log(
            `Cart item product price: ${
              cartItem.product.price
            } (type: ${typeof cartItem.product.price})`
          );
          console.log(
            `Cart item product discountPrice: ${
              cartItem.product.discountPrice
            } (type: ${typeof cartItem.product.discountPrice})`
          );

          // Handle decimal values from TypeORM (they come as strings)
          const productPrice =
            typeof cartItem.product.price === "string"
              ? parseFloat(cartItem.product.price)
              : cartItem.product.price;

          if (isNaN(productPrice) || productPrice <= 0) {
            console.error(
              `Invalid product price: ${cartItem.product.price} for product ${cartItem.product.id}`
            );
            throw new Error(
              `Invalid product price for product ${cartItem.product.title}`
            );
          }

          orderItem.price = productPrice;

          // Handle discounted price
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

      // Calculate order totals - ensure all values are numbers
      order.subtotal = order.items.reduce((sum, item) => {
        const itemTotal =
          typeof item.total === "string" ? parseFloat(item.total) : item.total;
        console.log(`Item total: ${itemTotal}, isNaN: ${isNaN(itemTotal)}`);
        return sum + (isNaN(itemTotal) ? 0 : itemTotal);
      }, 0);

      console.log(`Order subtotal: ${order.subtotal}`);

      order.tax = 0; // Tax disabled
      order.shipping = order.subtotal > 500 ? 0 : 50; // Free shipping above 500
      order.total = order.subtotal + order.shipping;

      console.log(
        `Order total: ${order.total}, subtotal: ${order.subtotal}, tax: ${order.tax}, shipping: ${order.shipping}`
      );

      // Save order
      await orderRepository.save(order);

      // Clear cart after successful order creation
      await cartItemRepository.delete({ cartId: cart.id });
      cart.total = 0;
      cart.wholesaleTotal = 0;
      cart.itemsCount = 0;
      await cartRepository.save(cart);

      //  created order
      const createdOrder = await orderRepository.findOne({
        where: { id: order.id },
        relations: ["items"],
      });

      res.status(201).json(createdOrder);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  // Admin: Get all users' orders
  adminGetAllOrders: async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, status } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = {};
      if (status) {
        where.status = status;
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

  // Get user's orders
  getUserOrders: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const where: any = { userId };

      if (status) {
        where.status = status;
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
      const { id } = req.params;
      const userId = req.user.id;

      const order = await orderRepository.findOne({
        where: { id, userId },
        relations: ["items"],
      });

      if (!order) {
        res.status(404).json({ message: "Order not found" });
        return;
      }

      if (
        ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(
          order.status as OrderStatus
        )
      ) {
        res
          .status(400)
          .json({ message: "Order cannot be cancelled at this stage" });
        return;
      }

      order.status = OrderStatus.CANCELLED;
      order.paymentStatus = PaymentStatus.REFUNDED;

      await orderRepository.save(order);

      res.status(200).json(order);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
