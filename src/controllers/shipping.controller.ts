import { Request, Response } from "express";
import type { authenticate as _authenticateType } from "../middlewares/auth.middleware";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Cart } from "../entities/cart.entity";
import { ShippingQuoteDto, SelectShippingDto } from "../dto/shipping.dto";
import { ApiError, respondError } from "../utils/api-error";
import { isWholesaler } from "../services/product-pricing.service";
import { cartRelations } from "../services/cart.service";
import {
  calculateRetailShippingWeight,
  retailCartRequiresShipping,
} from "../services/shipping.service";
import {
  getMockShippingQuote,
  getMockShippingQuotes,
} from "../services/shipping-quote.service";

const validated = async <T extends object>(type: new () => T, body: unknown) => {
  const dto = plainToInstance(type, body);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  });
  if (errors.length) throw new ApiError(400, "Invalid shipping request", errors);
  return dto;
};

const loadRetailCart = async (req: Request, cartId: string) => {
  if (isWholesaler(req.user))
    throw new ApiError(403, "Retail shipping is not available for wholesale customers");
  const cart = await AppDataSource.getRepository(Cart).findOne({
    where: { id: cartId, userId: req.user.id },
    relations: cartRelations,
  });
  if (!cart) throw new ApiError(404, "Cart not found");
  if (!cart.items?.length) throw new ApiError(400, "Cart is empty");
  return cart;
};

const validateUsShippingAddress = (address: ShippingQuoteDto["shippingAddress"]) => {
  const required = [
    address.firstName,
    address.lastName,
    address.email,
    address.phone,
    address.address,
    address.city,
    address.state,
    address.country,
    address.zipCode,
  ];
  if (required.some((value) => !String(value || "").trim()))
    throw new ApiError(400, "Shipping address is incomplete");
  if (address.country.trim().toUpperCase() !== "US")
    throw new ApiError(400, "Mock UPS shipping is currently available only in the United States");
  if (!/^\d{5}(?:-\d{4})?$/.test(address.zipCode.trim()))
    throw new ApiError(400, "Invalid United States ZIP code");
};

const quoteResponse = (cart: Cart) => {
  const shippingRequired = retailCartRequiresShipping(cart);
  const weight = calculateRetailShippingWeight(cart);
  if (shippingRequired && weight <= 0)
    throw new ApiError(400, "Shipping weight is unavailable for this cart");
  return {
    cartId: cart.id,
    shippingRequired,
    weight,
    unit: "lb",
    shippingMethods: shippingRequired ? getMockShippingQuotes(weight) : [],
  };
};

export const ShippingController = {
  quote: async (req: Request, res: Response) => {
    try {
      const dto = await validated(ShippingQuoteDto, req.body);
      validateUsShippingAddress(dto.shippingAddress);
      res.json(quoteResponse(await loadRetailCart(req, dto.cartId)));
    } catch (error) {
      respondError(res, error);
    }
  },
  select: async (req: Request, res: Response) => {
    try {
      const dto = await validated(SelectShippingDto, req.body);
      validateUsShippingAddress(dto.shippingAddress);
      const cart = await loadRetailCart(req, dto.cartId);
      const result = quoteResponse(cart);
      res.json({
        ...result,
        selectedShippingMethod: getMockShippingQuote(result.weight, dto.shippingCode),
      });
    } catch (error) {
      respondError(res, error);
    }
  },
};
