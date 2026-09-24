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
exports.CartController = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const cart_dto_1 = require("../dto/cart.dto");
const api_error_1 = require("../utils/api-error");
const cart_service_1 = require("../services/cart.service");
const product_pricing_service_1 = require("../services/product-pricing.service");
const cartType = (value) => {
    if (value === undefined || value === cart_entity_1.CartType.REGULAR)
        return cart_entity_1.CartType.REGULAR;
    if (value === cart_entity_1.CartType.BUY_NOW)
        return cart_entity_1.CartType.BUY_NOW;
    throw new api_error_1.ApiError(400, "Invalid cart type");
};
const validated = (type, body) => __awaiter(void 0, void 0, void 0, function* () {
    const dto = (0, class_transformer_1.plainToInstance)(type, body);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    });
    if (errors.length)
        throw new api_error_1.ApiError(400, "Invalid cart data", errors);
    return dto;
});
const add = (buyNow) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dto = yield validated(cart_dto_1.AddToCartDto, req.body);
        res.json(yield (0, cart_service_1.addCartItem)(req.user, dto.productId, dto.quantity, dto.selectedOptions, buyNow));
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
const mutate = (operation) => (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dto = operation === "update"
            ? yield validated(cart_dto_1.UpdateCartItemDto, req.body)
            : null;
        const result = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
            const cart = yield (0, cart_service_1.loadCart)(manager, req.user.id, cartType(req.query.type), false);
            const item = cart.items.find((i) => i.id === req.params.itemId);
            if (operation !== "clear" && !item)
                throw new api_error_1.ApiError(404, "Item not found in cart");
            if (operation === "clear") {
                yield manager.getRepository(cart_item_entity_1.CartItem).delete({ cartId: cart.id });
                cart.items = [];
            }
            else if (operation === "remove" || dto.quantity === 0) {
                yield manager.getRepository(cart_item_entity_1.CartItem).delete(item.id);
                cart.items = cart.items.filter((i) => i.id !== item.id);
            }
            else
                item.quantity = dto.quantity;
            if (operation === "update" && dto.quantity > 0)
                (0, cart_service_1.repriceCart)(cart, (0, product_pricing_service_1.isWholesaler)(req.user));
            else
                (0, cart_service_1.calculateCart)(cart);
            yield manager.getRepository(cart_entity_1.Cart).save(cart);
            return (0, cart_service_1.cartSummary)(cart);
        }));
        res.json(result);
    }
    catch (error) {
        (0, api_error_1.respondError)(res, error);
    }
});
exports.CartController = {
    getCart: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const result = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
                const cart = yield (0, cart_service_1.loadCart)(manager, req.user.id, cartType(req.query.type));
                // Allow the user to inspect/remove unavailable items; checkout always revalidates.
                let validationErrors = [];
                try {
                    (0, cart_service_1.repriceCart)(cart, (0, product_pricing_service_1.isWholesaler)(req.user));
                }
                catch (error) {
                    if (!(error instanceof api_error_1.ApiError))
                        throw error;
                    validationErrors = [error.message];
                    (0, cart_service_1.calculateCart)(cart);
                }
                yield manager.getRepository(cart_entity_1.Cart).save(cart);
                return Object.assign(Object.assign({}, (0, cart_service_1.cartSummary)(cart)), { validationErrors });
            }));
            res.json(result);
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    addToCart: add(false),
    createBuyNowCart: add(true),
    updateCartItem: mutate("update"),
    removeCartItem: mutate("remove"),
    clearCart: mutate("clear"),
};
