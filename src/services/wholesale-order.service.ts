import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { User } from "../entities/user.entity";
import {
  WholesaleOrderRequest,
  WholesaleOrderRequestStatus,
} from "../entities/wholesale-order-request.entity";
import { WholesaleOrderItem } from "../entities/wholesale-order-item.entity";
import { CreateWholesaleOrderRequestDto } from "../dto/wholesale-order.dto";
import { ApiError } from "../utils/api-error";
import { cartRelations } from "./cart.service";
import { reserveCartInventory, releaseInventory } from "./inventory.service";
import { generateWholesaleRequestNumber } from "../utils/reference-number.util";
import { roundMoney, freight } from "./product-pricing.service";
export const createWholesaleRequest = async (userId: string, input: any) => {
  const dto = plainToInstance(CreateWholesaleOrderRequestDto, input);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length || !dto.shippingAddress)
    throw new ApiError(400, "Invalid wholesale request", errors);
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
      true,
    );
    const request = manager.getRepository(WholesaleOrderRequest).create({
      userId,
      requestNumber: await generateWholesaleRequestNumber(manager),
      shippingAddress: dto.shippingAddress,
      billingAddress: dto.billingAddress || dto.shippingAddress,
      notes: dto.notes || null,
      status: WholesaleOrderRequestStatus.PENDING,
      inventoryReservations,
    });
    request.items = cart.items.map((item) => {
      const row = manager.getRepository(WholesaleOrderItem).create({
        productId: item.productId,
        productName: item.product.title,
        productImages: item.product.images,
        requestedBoxes: item.quantity,
        wholesaleOrderQuantity: item.product.wholesaleOrderQuantity,
        unitsPerCarton: item.product.unitsPerCarton,
        wholesalePrice: item.product.wholesalePrice,
        effectivePricePerCarton: item.price,
        selectedOptions: item.selectedOptions,
      });
      row.calculateTotals();
      return row;
    });
    request.subtotal = roundMoney(
      request.items.reduce((sum, item) => sum + item.total, 0),
    );
    request.discount = roundMoney(request.subtotal * 0.02);
    request.tax = 0;
    const discounted = Math.max(0, request.subtotal - request.discount);
    request.shipping = cart.items.some(
      (i) => i.product.wholesaleRequiresShipping !== false,
    )
      ? freight(discounted)
      : 0;
    request.total = roundMoney(discounted + request.shipping);
    await manager.getRepository(WholesaleOrderRequest).save(request);
    await manager.getRepository(CartItem).delete({ cartId: cart.id });
    cart.items = [];
    cart.calculateTotal();
    await manager.getRepository(Cart).save(cart);
    return manager
      .getRepository(WholesaleOrderRequest)
      .findOne({ where: { id: request.id }, relations: ["items"] });
  });
};
export const changeWholesaleStatus = async (
  id: string,
  status: WholesaleOrderRequestStatus,
  adminNotes?: string,
) =>
  AppDataSource.transaction(async (manager) => {
    const repo = manager.getRepository(WholesaleOrderRequest);
    const request = await repo
      .createQueryBuilder("request")
      .addSelect("request.inventoryReservations")
      .where("request.id = :id", { id })
      .setLock("pessimistic_write")
      .getOne();
    if (!request) throw new ApiError(404, "Wholesale request not found");
    const transitions = {
      pending: ["approved", "rejected"],
      approved: ["delivered", "rejected"],
      rejected: [],
      delivered: [],
    };
    if (
      request.status !== status &&
      !transitions[request.status].includes(status)
    )
      throw new ApiError(400, "Invalid wholesale status transition");
    if (
      status === WholesaleOrderRequestStatus.REJECTED &&
      request.status !== status
    ) {
      await releaseInventory(manager, request.inventoryReservations || []);
      request.inventoryReservations = [];
    }
    request.status = status;
    if (adminNotes !== undefined) request.adminNotes = adminNotes;
    await repo.save(request);
    return repo.findOne({ where: { id }, relations: ["items"] });
  });
