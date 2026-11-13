import { EntityManager } from "typeorm";
import { Cart } from "../entities/cart.entity";
import { Coupon } from "../entities/coupon.entity";
import { CouponUsage } from "../entities/coupon-usage.entity";
import { ApiError } from "../utils/api-error";
import { roundMoney } from "./product-pricing.service";

export type CouponCalculation = {
  couponId: string;
  couponCode: string;
  couponName: string;
  subtotal: number;
  eligibleSubtotal: number;
  discount: number;
  freeShipping: boolean;
  totalAfterDiscount: number;
};

export const calculateCoupon = async (
  manager: EntityManager,
  code: string,
  cart: Cart,
  userId: string,
  lock = false,
): Promise<CouponCalculation> => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) throw new ApiError(400, "Enter a coupon code");

  const query = manager
    .getRepository(Coupon)
    .createQueryBuilder("coupon")
    .where("UPPER(coupon.code) = :code", { code: normalizedCode });
  if (lock) query.setLock("pessimistic_write");
  const coupon = await query.getOne();
  if (!coupon) throw new ApiError(404, "Coupon code is invalid");

  const today = new Date().toISOString().slice(0, 10);
  if (!coupon.isActive) throw new ApiError(400, "Coupon is not active");
  if (coupon.dateStart && today < coupon.dateStart)
    throw new ApiError(400, "Coupon is not active yet");
  if (coupon.dateEnd && today > coupon.dateEnd)
    throw new ApiError(400, "Coupon has expired");
  if (coupon.customerLogin && !userId)
    throw new ApiError(401, "You must log in to use this coupon");

  const usageRepository = manager.getRepository(CouponUsage);
  if (
    coupon.usesPerCoupon > 0 &&
    (await usageRepository.countBy({ couponId: coupon.id })) >= coupon.usesPerCoupon
  )
    throw new ApiError(400, "Coupon usage limit has been reached");
  if (
    coupon.usesPerCustomer > 0 &&
    (await usageRepository.countBy({ couponId: coupon.id, userId })) >=
      coupon.usesPerCustomer
  )
    throw new ApiError(400, "You have already used this coupon");

  const items = cart.items || [];
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
  );
  const productIds = new Set(coupon.productIds || []);
  const categoryIds = new Set(coupon.categoryIds || []);
  const unrestricted = productIds.size === 0 && categoryIds.size === 0;
  const eligibleSubtotal = roundMoney(
    items.reduce((sum, item) => {
      const productEligible = productIds.has(item.productId);
      const categoryEligible = (item.product?.categories || []).some((category) =>
        categoryIds.has(category.id),
      );
      return unrestricted || productEligible || categoryEligible
        ? sum + Number(item.price) * item.quantity
        : sum;
    }, 0),
  );
  if (eligibleSubtotal <= 0)
    throw new ApiError(400, "Coupon is not valid for the products in this cart");

  const value = Number(coupon.discount || 0);
  if (coupon.type === "Percentage" && value > 100)
    throw new ApiError(400, "Coupon percentage is invalid");
  const rawDiscount =
    coupon.type === "Fixed Amount"
      ? value
      : eligibleSubtotal * (value / 100);
  const discount = roundMoney(Math.min(subtotal, eligibleSubtotal, rawDiscount));

  return {
    couponId: coupon.id,
    couponCode: coupon.code,
    couponName: coupon.name,
    subtotal,
    eligibleSubtotal,
    discount,
    freeShipping: coupon.freeShipping,
    totalAfterDiscount: roundMoney(Math.max(0, subtotal - discount)),
  };
};
