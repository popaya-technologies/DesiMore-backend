import { EntityManager } from "typeorm";
import { AppDataSource } from "../data-source";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { Product } from "../entities/product.entity";
import { User } from "../entities/user.entity";
import { ApiError } from "../utils/api-error";
import {
  quoteProduct,
  isWholesaler,
  selectionKey,
  effectivePrice,
  freight,
  roundMoney,
} from "./product-pricing.service";
import { SelectedOptionDto } from "../dto/selected-option.dto";
export const cartRelations = [
  "items",
  "items.product",
  "items.product.options",
  "items.product.discounts",
];
export const cartSummary = (cart: Cart) => ({
  ...cart,
  wholesaleSummary: {
    subtotal: Number(cart.wholesaleSubtotal),
    discount: Number(cart.wholesaleDiscount),
    shipping: Number(cart.wholesaleShipping),
    tax: 0,
    total: Number(cart.wholesaleTotal),
  },
});
export const calculateCart = (cart: Cart) => {
  cart.calculateTotal();
  cart.wholesaleSubtotal = roundMoney(
    cart.items.reduce(
      (sum, item) =>
        sum +
        (item.product.wholesalePrice == null
          ? 0
          : effectivePrice(item.product, item.quantity, true) +
            (item.selectedOptions || []).reduce(
              (n, o) => n + Number(o.priceAdjustment || 0),
              0,
            )) *
          item.quantity,
      0,
    ),
  );
  cart.wholesaleDiscount = roundMoney(cart.wholesaleSubtotal * 0.02);
  const discounted = Math.max(
    0,
    cart.wholesaleSubtotal - cart.wholesaleDiscount,
  );
  cart.wholesaleShipping = cart.items.some(
    (i) => i.product.wholesaleRequiresShipping !== false,
  )
    ? freight(discounted)
    : 0;
  cart.wholesaleTotal = roundMoney(discounted + cart.wholesaleShipping);
};
export const loadCart = async (
  manager: EntityManager,
  userId: string,
  type: CartType,
  create = true,
) => {
  // Serializes cart creation and mutations for a user.
  await manager
    .getRepository(User)
    .findOneOrFail({
      where: { id: userId },
      lock: { mode: "pessimistic_write" },
    });
  const repo = manager.getRepository(Cart);
  let cart = await repo.findOne({
    where: { userId, type },
    relations: cartRelations,
  });
  if (!cart && create)
    cart = await repo.save(repo.create({ userId, type, items: [] }));
  if (!cart) throw new ApiError(404, "Cart not found");
  return cart;
};
export const repriceCart = (cart: Cart, wholesale: boolean) => {
  const totals = new Map<string, number>();
  const quotes = new Map<CartItem, ReturnType<typeof quoteProduct>>();
  const optionTotals = new Map<string, number>();
  for (const item of cart.items) {
    totals.set(
      item.productId,
      (totals.get(item.productId) || 0) + item.quantity,
    );
    for (const selection of item.selectedOptions || [])
      for (const id of selection.valueIds || [])
        optionTotals.set(id, (optionTotals.get(id) || 0) + item.quantity);
  }
  for (const item of cart.items) {
    const result = quoteProduct(
      item.product,
      item.quantity,
      item.selectedOptions || [],
      wholesale,
    );
    const available = Number(
      wholesale ? item.product.wholesaleQuantity : item.product.quantity,
    );
    if (
      (wholesale || item.product.subtractStock !== false) &&
      totals.get(item.productId) > available
    )
      throw new ApiError(400, "Combined cart quantity exceeds stock");
    for (const option of item.product.options || [])
      for (const value of option.values)
        if (
          value.subtractStock &&
          (optionTotals.get(value.id) || 0) > value.quantity
        )
          throw new ApiError(400, "Combined option quantity exceeds stock");
    quotes.set(item, result);
  }
  for (const [item, result] of quotes) {
    item.price = result.price;
    item.selectedOptions = result.selectedOptions;
  }
  calculateCart(cart);
  if (
    [cart.total, cart.wholesaleTotal].some(
      (value) => !Number.isFinite(Number(value)) || Number(value) > 99999999.99,
    )
  )
    throw new ApiError(400, "Cart total exceeds the supported limit");
};
export const addCartItem = async (
  user: any,
  productId: string,
  quantity: number,
  selectedOptions: SelectedOptionDto[] = [],
  buyNow = false,
) =>
  AppDataSource.transaction(async (manager) => {
    const cart = await loadCart(
      manager,
      user.id,
      buyNow ? CartType.BUY_NOW : CartType.REGULAR,
    );
    const product = await manager
      .getRepository(Product)
      .findOne({
        where: { id: productId },
        relations: ["options", "discounts"],
      });
    if (!product) throw new ApiError(404, "Product not found");
    if (buyNow) {
      await manager.getRepository(CartItem).delete({ cartId: cart.id });
      cart.items = [];
    }
    const existing = cart.items.find(
      (i) =>
        i.productId === productId &&
        selectionKey(i.selectedOptions) === selectionKey(selectedOptions),
    );
    if (existing) existing.quantity += quantity;
    else
      cart.items.push(
        manager
          .getRepository(CartItem)
          .create({
            cartId: cart.id,
            productId,
            product,
            quantity,
            selectedOptions,
          }),
      );
    repriceCart(cart, isWholesaler(user));
    await manager.getRepository(Cart).save(cart);
    return cartSummary(cart);
  });
