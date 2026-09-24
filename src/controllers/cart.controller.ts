import { Request, Response } from "express";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { AppDataSource } from "../data-source";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { AddToCartDto, UpdateCartItemDto } from "../dto/cart.dto";
import { ApiError, respondError } from "../utils/api-error";
import {
  addCartItem,
  loadCart,
  repriceCart,
  calculateCart,
  cartSummary,
} from "../services/cart.service";
import { isWholesaler } from "../services/product-pricing.service";
const cartType = (value: any) => {
  if (value === undefined || value === CartType.REGULAR)
    return CartType.REGULAR;
  if (value === CartType.BUY_NOW) return CartType.BUY_NOW;
  throw new ApiError(400, "Invalid cart type");
};
const validated = async <T extends object>(type: new () => T, body: any) => {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length) throw new ApiError(400, "Invalid cart data", errors);
  return dto;
};
const add = (buyNow: boolean) => async (req: Request, res: Response) => {
  try {
    const dto = await validated(AddToCartDto, req.body);
    res.json(
      await addCartItem(
        req.user,
        dto.productId,
        dto.quantity,
        dto.selectedOptions,
        buyNow,
      ),
    );
  } catch (error) {
    respondError(res, error);
  }
};
const mutate =
  (operation: "update" | "remove" | "clear") =>
  async (req: Request, res: Response) => {
    try {
      const dto =
        operation === "update"
          ? await validated(UpdateCartItemDto, req.body)
          : null;
      const result = await AppDataSource.transaction(async (manager) => {
        const cart = await loadCart(
          manager,
          req.user.id,
          cartType(req.query.type),
          false,
        );
        const item = cart.items.find((i) => i.id === req.params.itemId);
        if (operation !== "clear" && !item)
          throw new ApiError(404, "Item not found in cart");
        if (operation === "clear") {
          await manager.getRepository(CartItem).delete({ cartId: cart.id });
          cart.items = [];
        } else if (operation === "remove" || dto.quantity === 0) {
          await manager.getRepository(CartItem).delete(item.id);
          cart.items = cart.items.filter((i) => i.id !== item.id);
        } else item.quantity = dto.quantity;
        if (operation === "update" && dto.quantity > 0)
          repriceCart(cart, isWholesaler(req.user));
        else calculateCart(cart);
        await manager.getRepository(Cart).save(cart);
        return cartSummary(cart);
      });
      res.json(result);
    } catch (error) {
      respondError(res, error);
    }
  };
export const CartController = {
  getCart: async (req: Request, res: Response) => {
    try {
      const result = await AppDataSource.transaction(async (manager) => {
        const cart = await loadCart(
          manager,
          req.user.id,
          cartType(req.query.type),
        );
        // Allow the user to inspect/remove unavailable items; checkout always revalidates.
        let validationErrors: string[] = [];
        try {
          repriceCart(cart, isWholesaler(req.user));
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
          validationErrors = [error.message];
          calculateCart(cart);
        }
        await manager.getRepository(Cart).save(cart);
        return { ...cartSummary(cart), validationErrors };
      });
      res.json(result);
    } catch (error) {
      respondError(res, error);
    }
  },
  addToCart: add(false),
  createBuyNowCart: add(true),
  updateCartItem: mutate("update"),
  removeCartItem: mutate("remove"),
  clearCart: mutate("clear"),
};
