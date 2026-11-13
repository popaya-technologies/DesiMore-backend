import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { Cart } from "../entities/cart.entity";
import { TaxQuoteDto } from "../dto/tax.dto";
import { ApiError, respondError } from "../utils/api-error";
import { cartRelations } from "../services/cart.service";
import { calculateTax, cartTaxItems } from "../services/tax.service";

export const TaxController = {
  // Tax for the customer's cart and the address entered at checkout.
  quote: async (req: Request, res: Response) => {
    try {
      const dto = plainToInstance(TaxQuoteDto, req.body);
      // Full checkout addresses may be sent; fields other than country/state are ignored.
      const errors = await validate(dto, {
        whitelist: true,
        validationError: { target: false, value: false },
      });
      if (errors.length) throw new ApiError(400, "Invalid tax request", errors);

      const cart = await AppDataSource.getRepository(Cart).findOne({
        where: { id: dto.cartId, userId: req.user.id },
        relations: cartRelations,
      });
      if (!cart) throw new ApiError(404, "Cart not found");

      const tax = await calculateTax(cartTaxItems(cart), {
        shipping: dto.shippingAddress,
        payment: dto.paymentAddress,
      });

      res.json({
        cartId: cart.id,
        taxes: tax.lines,
        taxTotal: tax.total,
      });
    } catch (error) {
      respondError(res, error);
    }
  },
};
