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
import {
  calculateRetailShippingWeight,
  retailCartRequiresShipping,
} from "./shipping.service";
import { getMockShippingQuote } from "./shipping-quote.service";
import { calculateCoupon } from "./coupon.service";
import { CouponUsage } from "../entities/coupon-usage.entity";
import { GiftVoucher } from "../entities/gift_voucher.entity";
import { OrderStatus as OrderStatusSetting } from "../entities/order-status.entity";
import { calculateGiftVoucher } from "./gift-voucher.service";
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
    const defaultOrderStatus = await manager.getRepository(OrderStatusSetting).findOne({
      where: { isDefault: true, isActive: true },
    });
    const order = manager.getRepository(Order).create({
      userId,
      orderNumber: await generateOrderNumber(manager),
      shippingAddress: dto.shippingAddress,
      billingAddress: dto.billingAddress || dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      notes: dto.notes || null,
      status: (defaultOrderStatus?.code ?? OrderStatus.PENDING) as OrderStatus,
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
    const coupon = dto.couponCode
      ? await calculateCoupon(manager, dto.couponCode, cart, userId, true)
      : null;
    order.couponCode = coupon?.couponCode || null;
    order.discount = coupon?.discount || 0;
    const giftVoucher = dto.giftVoucherCode
      ? await calculateGiftVoucher(
          manager,
          dto.giftVoucherCode,
          cart,
          order.discount,
          true,
        )
      : null;
    order.giftVoucherCode = giftVoucher?.voucherCode || null;
    order.giftVoucherAmount = giftVoucher?.discount || 0;
    const shippingRequired = retailCartRequiresShipping(cart);
    if (shippingRequired && !dto.shippingCode)
      throw new ApiError(400, "A shipping method is required");
    const shippingWeight = calculateRetailShippingWeight(cart);
    if (shippingRequired && shippingWeight <= 0)
      throw new ApiError(400, "Shipping weight is unavailable for this cart");
    order.shipping = shippingRequired && !coupon?.freeShipping
      ? getMockShippingQuote(shippingWeight, dto.shippingCode).price
      : 0;
    order.total = roundMoney(
      Math.max(
        0,
        order.subtotal - order.discount - order.giftVoucherAmount,
      ) + order.shipping,
    );
    await manager.getRepository(Order).save(order);
    if (giftVoucher) {
      const voucher = await manager.getRepository(GiftVoucher).findOneByOrFail({
        id: giftVoucher.voucherId,
      });
      voucher.amount = giftVoucher.remainingBalance;
      voucher.isActive = giftVoucher.remainingBalance > 0;
      await manager.getRepository(GiftVoucher).save(voucher);
    }
    if (coupon) {
      await manager.getRepository(CouponUsage).save(
        manager.getRepository(CouponUsage).create({
          couponId: coupon.couponId,
          userId,
          orderId: order.id,
          discount: coupon.discount,
        }),
      );
    }
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
    if (order.giftVoucherCode && Number(order.giftVoucherAmount) > 0) {
      const voucher = await manager
        .getRepository(GiftVoucher)
        .createQueryBuilder("voucher")
        .where("UPPER(voucher.code) = :code", {
          code: order.giftVoucherCode.toUpperCase(),
        })
        .setLock("pessimistic_write")
        .getOne();
      if (voucher) {
        voucher.amount = roundMoney(
          Number(voucher.amount) + Number(order.giftVoucherAmount),
        );
        voucher.isActive = true;
        await manager.getRepository(GiftVoucher).save(voucher);
      }
    }
    order.inventoryReservations = [];
    order.status = OrderStatus.CANCELLED;
    order.paymentStatus = PaymentStatus.CANCELLED;
    await manager.getRepository(Order).save(order);
    delete order.inventoryReservations;
    return order;
  });
