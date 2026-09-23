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
exports.addCartItem = exports.repriceCart = exports.loadCart = exports.calculateCart = exports.cartSummary = exports.cartRelations = void 0;
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const product_entity_1 = require("../entities/product.entity");
const user_entity_1 = require("../entities/user.entity");
const api_error_1 = require("../utils/api-error");
const product_pricing_service_1 = require("./product-pricing.service");
exports.cartRelations = [
    "items",
    "items.product",
    "items.product.options",
    "items.product.discounts",
];
const cartSummary = (cart) => (Object.assign(Object.assign({}, cart), { wholesaleSummary: {
        subtotal: Number(cart.wholesaleSubtotal),
        discount: Number(cart.wholesaleDiscount),
        shipping: Number(cart.wholesaleShipping),
        tax: 0,
        total: Number(cart.wholesaleTotal),
    } }));
exports.cartSummary = cartSummary;
const calculateCart = (cart) => {
    cart.calculateTotal();
    cart.wholesaleSubtotal = (0, product_pricing_service_1.roundMoney)(cart.items.reduce((sum, item) => sum +
        (item.product.wholesalePrice == null
            ? 0
            : (0, product_pricing_service_1.effectivePrice)(item.product, item.quantity, true) +
                (item.selectedOptions || []).reduce((n, o) => n + Number(o.priceAdjustment || 0), 0)) *
            item.quantity, 0));
    cart.wholesaleDiscount = (0, product_pricing_service_1.roundMoney)(cart.wholesaleSubtotal * 0.02);
    const discounted = Math.max(0, cart.wholesaleSubtotal - cart.wholesaleDiscount);
    cart.wholesaleShipping = cart.items.some((i) => i.product.wholesaleRequiresShipping !== false)
        ? (0, product_pricing_service_1.freight)(discounted)
        : 0;
    cart.wholesaleTotal = (0, product_pricing_service_1.roundMoney)(discounted + cart.wholesaleShipping);
};
exports.calculateCart = calculateCart;
const loadCart = (manager_1, userId_1, type_1, ...args_1) => __awaiter(void 0, [manager_1, userId_1, type_1, ...args_1], void 0, function* (manager, userId, type, create = true) {
    // Serializes cart creation and mutations for a user.
    yield manager
        .getRepository(user_entity_1.User)
        .findOneOrFail({
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
    });
    const repo = manager.getRepository(cart_entity_1.Cart);
    let cart = yield repo.findOne({
        where: { userId, type },
        relations: exports.cartRelations,
    });
    if (!cart && create)
        cart = yield repo.save(repo.create({ userId, type, items: [] }));
    if (!cart)
        throw new api_error_1.ApiError(404, "Cart not found");
    return cart;
});
exports.loadCart = loadCart;
const repriceCart = (cart, wholesale) => {
    const totals = new Map();
    const quotes = new Map();
    const optionTotals = new Map();
    for (const item of cart.items) {
        totals.set(item.productId, (totals.get(item.productId) || 0) + item.quantity);
        for (const selection of item.selectedOptions || [])
            for (const id of selection.valueIds || [])
                optionTotals.set(id, (optionTotals.get(id) || 0) + item.quantity);
    }
    for (const item of cart.items) {
        const result = (0, product_pricing_service_1.quoteProduct)(item.product, item.quantity, item.selectedOptions || [], wholesale);
        const available = Number(wholesale ? item.product.wholesaleQuantity : item.product.quantity);
        if ((wholesale || item.product.subtractStock !== false) &&
            totals.get(item.productId) > available)
            throw new api_error_1.ApiError(400, "Combined cart quantity exceeds stock");
        for (const option of item.product.options || [])
            for (const value of option.values)
                if (value.subtractStock &&
                    (optionTotals.get(value.id) || 0) > value.quantity)
                    throw new api_error_1.ApiError(400, "Combined option quantity exceeds stock");
        quotes.set(item, result);
    }
    for (const [item, result] of quotes) {
        item.price = result.price;
        item.selectedOptions = result.selectedOptions;
    }
    (0, exports.calculateCart)(cart);
    if ([cart.total, cart.wholesaleTotal].some((value) => !Number.isFinite(Number(value)) || Number(value) > 99999999.99))
        throw new api_error_1.ApiError(400, "Cart total exceeds the supported limit");
};
exports.repriceCart = repriceCart;
const addCartItem = (user_1, productId_1, quantity_1, ...args_1) => __awaiter(void 0, [user_1, productId_1, quantity_1, ...args_1], void 0, function* (user, productId, quantity, selectedOptions = [], buyNow = false) {
    return data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
        const cart = yield (0, exports.loadCart)(manager, user.id, buyNow ? cart_entity_1.CartType.BUY_NOW : cart_entity_1.CartType.REGULAR);
        const product = yield manager
            .getRepository(product_entity_1.Product)
            .findOne({
            where: { id: productId },
            relations: ["options", "discounts"],
        });
        if (!product)
            throw new api_error_1.ApiError(404, "Product not found");
        if (buyNow) {
            yield manager.getRepository(cart_item_entity_1.CartItem).delete({ cartId: cart.id });
            cart.items = [];
        }
        const existing = cart.items.find((i) => i.productId === productId &&
            (0, product_pricing_service_1.selectionKey)(i.selectedOptions) === (0, product_pricing_service_1.selectionKey)(selectedOptions));
        if (existing)
            existing.quantity += quantity;
        else
            cart.items.push(manager
                .getRepository(cart_item_entity_1.CartItem)
                .create({
                cartId: cart.id,
                productId,
                product,
                quantity,
                selectedOptions,
            }));
        (0, exports.repriceCart)(cart, (0, product_pricing_service_1.isWholesaler)(user));
        yield manager.getRepository(cart_entity_1.Cart).save(cart);
        return (0, exports.cartSummary)(cart);
    }));
});
exports.addCartItem = addCartItem;
