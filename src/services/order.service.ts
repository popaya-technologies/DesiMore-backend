import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AppDataSource } from "../data-source";
import { Order, OrderStatus, PaymentStatus } from "../entities/order.entity";
import { OrderItem } from "../entities/order-item.entity";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { User } from "../entities/user.entity";
import { CreateOrderDto } from "../dto/order.dto";
import { ApiError } from "../utils/api-error";
import { cartRelations } from "./cart.service";
import { reserveCartInventory, releaseInventory } from "./inventory.service";
import { generateOrderNumber } from "../utils/reference-number.util";
import { roundMoney } from "./product-pricing.service";
export const createRetailOrder = async (userId: string, input: any) => {
  const dto = plainToInstance(CreateOrderDto, input);
  const errors = await validate(dto, {
    whitelist: true,
    forbidUnknownValues: true,
    validationError: { target: false, value: false },
  });
  if (errors.length || !dto.shippingAddress)
    throw new ApiError(400, "Invalid order data", errors);
  return AppDataSource.transaction(async (manager) => {
    await manager
      .getRepository(User)
      .findOneOrFail({
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });
    const cart = await manager
      .getRepository(Cart)
      .findOne({
        where: dto.cartId
          ? { id: dto.cartId, userId }
          : { userId, type: CartType.REGULAR },
        relations: cartRelations,
      });
    if (!cart?.items.length) throw new ApiError(400, "Cart is empty");
    const inventoryReservations = await reserveCartInventory(
      manager,
      cart,
      false,
    );
    const order = manager.getRepository(Order).create({
      userId,
      orderNumber: await generateOrderNumber(manager),
      shippingAddress: dto.shippingAddress,
      billingAddress: dto.billingAddress || dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes || null,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      inventoryReservations,
    });
    order.items = cart.items.map((item) =>
      manager.getRepository(OrderItem).create({
        productId: item.productId,
        productName: item.product.title,
        productImages: item.product.images,
        quantity: item.quantity,
        price: item.price,
        discountedPrice: null,
        total: roundMoney(Number(item.price) * item.quantity),
        selectedOptions: item.selectedOptions,
      }),
    );
    order.subtotal = roundMoney(
      order.items.reduce((sum, item) => sum + item.total, 0),
    );
    order.tax = 0;
    order.shipping =
      cart.items.some((i) => i.product.requiresShipping !== false) &&
      order.subtotal <= 500
        ? 50
        : 0;
    order.total = roundMoney(order.subtotal + order.shipping);
    await manager.getRepository(Order).save(order);
    await manager.getRepository(CartItem).delete({ cartId: cart.id });
    cart.items = [];
    cart.calculateTotal();
    await manager.getRepository(Cart).save(cart);
    return manager
      .getRepository(Order)
      .findOne({ where: { id: order.id }, relations: ["items"] });
  });
};
export const cancelRetailOrder = async (id: string, userId?: string) =>
  AppDataSource.transaction(async (manager) => {
    const query = manager
      .getRepository(Order)
      .createQueryBuilder("order")
      .addSelect("order.inventoryReservations")
      .where("order.id = :id", { id })
      .setLock("pessimistic_write");
    if (userId) query.andWhere("order.userId = :userId", { userId });
    const order = await query.getOne();
    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === OrderStatus.CANCELLED) {
      delete order.inventoryReservations;
      return order;
    }
    if (
      ![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status) ||
      [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING].includes(
        order.paymentStatus,
      )
    )
      throw new ApiError(
        400,
        "This order cannot be cancelled; paid orders require a refund",
      );
    await releaseInventory(manager, order.inventoryReservations || []);
    order.inventoryReservations = [];
    order.status = OrderStatus.CANCELLED;
    order.paymentStatus = PaymentStatus.CANCELLED;
    await manager.getRepository(Order).save(order);
    delete order.inventoryReservations;
    return order;
  });
