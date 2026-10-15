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
exports.calculateGiftVoucher = void 0;
const gift_voucher_entity_1 = require("../entities/gift_voucher.entity");
const api_error_1 = require("../utils/api-error");
const product_pricing_service_1 = require("./product-pricing.service");
const calculateGiftVoucher = (manager_1, code_1, cart_1, ...args_1) => __awaiter(void 0, [manager_1, code_1, cart_1, ...args_1], void 0, function* (manager, code, cart, existingDiscount = 0, lock = false) {
    const normalizedCode = String(code || "").trim().toUpperCase();
    if (!normalizedCode)
        throw new api_error_1.ApiError(400, "Enter a gift voucher code");
    const query = manager
        .getRepository(gift_voucher_entity_1.GiftVoucher)
        .createQueryBuilder("voucher")
        .where("UPPER(voucher.code) = :code", { code: normalizedCode });
    if (lock)
        query.setLock("pessimistic_write");
    const voucher = yield query.getOne();
    if (!voucher)
        throw new api_error_1.ApiError(404, "Gift voucher code is invalid");
    if (!voucher.isActive)
        throw new api_error_1.ApiError(400, "Gift voucher is not active");
    const amount = (0, product_pricing_service_1.roundMoney)(Number(voucher.amount || 0));
    if (amount <= 0)
        throw new api_error_1.ApiError(400, "Gift voucher has no remaining balance");
    const subtotal = (0, product_pricing_service_1.roundMoney)((cart.items || []).reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
    if (subtotal <= 0)
        throw new api_error_1.ApiError(400, "Cart is empty");
    const payableSubtotal = (0, product_pricing_service_1.roundMoney)(Math.max(0, subtotal - existingDiscount));
    const discount = (0, product_pricing_service_1.roundMoney)(Math.min(amount, payableSubtotal));
    return {
        voucherId: voucher.id,
        voucherCode: voucher.code,
        amount,
        discount,
        remainingBalance: (0, product_pricing_service_1.roundMoney)(amount - discount),
    };
});
exports.calculateGiftVoucher = calculateGiftVoucher;
