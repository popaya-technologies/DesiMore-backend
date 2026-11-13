"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCoupon = void 0;
const coupon_entity_1 = require("../entities/coupon.entity");
const coupon_usage_entity_1 = require("../entities/coupon-usage.entity");
const api_error_1 = require("../utils/api-error");
const product_pricing_service_1 = require("./product-pricing.service");
const calculateCoupon = (manager_1, code_1, cart_1, userId_1, ...args_1) => __awaiter(void 0, [manager_1, code_1, cart_1, userId_1, ...args_1], void 0, function* (manager, code, cart, userId, lock = false) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode)
        throw new api_error_1.ApiError(400, "Enter a coupon code");
    const query = manager
        .getRepository(coupon_entity_1.Coupon)
        .createQueryBuilder("coupon")
        .where("UPPER(coupon.code) = :code", { code: normalizedCode });
    if (lock)
        query.setLock("pessimistic_write");
    const coupon = yield query.getOne();
    if (!coupon)
        throw new api_error_1.ApiError(404, "Coupon code is invalid");
    const today = new Date().toISOString().slice(0, 10);
    if (!coupon.isActive)
        throw new api_error_1.ApiError(400, "Coupon is not active");
    if (coupon.dateStart && today < coupon.dateStart)
        throw new api_error_1.ApiError(400, "Coupon is not active yet");
    if (coupon.dateEnd && today > coupon.dateEnd)
        throw new api_error_1.ApiError(400, "Coupon has expired");
    if (coupon.customerLogin && !userId)
        throw new api_error_1.ApiError(401, "You must log in to use this coupon");
    const usageRepository = manager.getRepository(coupon_usage_entity_1.CouponUsage);
    if (coupon.usesPerCoupon > 0 &&
        (yield usageRepository.countBy({ couponId: coupon.id })) >= coupon.usesPerCoupon)
        throw new api_error_1.ApiError(400, "Coupon usage limit has been reached");
    if (coupon.usesPerCustomer > 0 &&
        (yield usageRepository.countBy({ couponId: coupon.id, userId })) >=
            coupon.usesPerCustomer)
        throw new api_error_1.ApiError(400, "You have already used this coupon");
    const items = cart.items || [];
    const subtotal = (0, product_pricing_service_1.roundMoney)(items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
    const productIds = new Set(coupon.productIds || []);
    const categoryIds = new Set(coupon.categoryIds || []);
    const unrestricted = productIds.size === 0 && categoryIds.size === 0;
    const eligibleSubtotal = (0, product_pricing_service_1.roundMoney)(items.reduce((sum, item) => {
        var _a;
        const productEligible = productIds.has(item.productId);
        const categoryEligible = (((_a = item.product) === null || _a === void 0 ? void 0 : _a.categories) || []).some((category) => categoryIds.has(category.id));
        return unrestricted || productEligible || categoryEligible
            ? sum + Number(item.price) * item.quantity
            : sum;
    }, 0));
    if (eligibleSubtotal <= 0)
        throw new api_error_1.ApiError(400, "Coupon is not valid for the products in this cart");
    const value = Number(coupon.discount || 0);
    if (coupon.type === "Percentage" && value > 100)
        throw new api_error_1.ApiError(400, "Coupon percentage is invalid");
    const rawDiscount = coupon.type === "Fixed Amount"
        ? value
        : eligibleSubtotal * (value / 100);
    const discount = (0, product_pricing_service_1.roundMoney)(Math.min(subtotal, eligibleSubtotal, rawDiscount));
    return {
        couponId: coupon.id,
        couponCode: coupon.code,
        couponName: coupon.name,
        subtotal,
        eligibleSubtotal,
        discount,
        freeShipping: coupon.freeShipping,
        totalAfterDiscount: (0, product_pricing_service_1.roundMoney)(Math.max(0, subtotal - discount)),
    };
});
exports.calculateCoupon = calculateCoupon;
