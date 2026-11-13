import { EntityManager } from "typeorm";
import { Cart } from "../entities/cart.entity";
import { GiftVoucher } from "../entities/gift_voucher.entity";
import { ApiError } from "../utils/api-error";
import { roundMoney } from "./product-pricing.service";

export type GiftVoucherCalculation = {
  voucherId: string;
  voucherCode: string;
  amount: number;
  discount: number;
  remainingBalance: number;
};

export const calculateGiftVoucher = async (
  manager: EntityManager,
  code: string,
  cart: Cart,
  existingDiscount = 0,
  lock = false,
): Promise<GiftVoucherCalculation> => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) throw new ApiError(400, "Enter a gift voucher code");

  const query = manager
    .getRepository(GiftVoucher)
    .createQueryBuilder("voucher")
    .where("UPPER(voucher.code) = :code", { code: normalizedCode });
  if (lock) query.setLock("pessimistic_write");
  const voucher = await query.getOne();
  if (!voucher) throw new ApiError(404, "Gift voucher code is invalid");
  if (!voucher.isActive) throw new ApiError(400, "Gift voucher is not active");

  const amount = roundMoney(Number(voucher.amount || 0));
  if (amount <= 0) throw new ApiError(400, "Gift voucher has no remaining balance");
  const subtotal = roundMoney(
    (cart.items || []).reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0,
    ),
  );
  if (subtotal <= 0) throw new ApiError(400, "Cart is empty");
  const payableSubtotal = roundMoney(Math.max(0, subtotal - existingDiscount));
  const discount = roundMoney(Math.min(amount, payableSubtotal));

  return {
    voucherId: voucher.id,
    voucherCode: voucher.code,
    amount,
    discount,
    remainingBalance: roundMoney(amount - discount),
  };
};
