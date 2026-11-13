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
exports.ShippingController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const shipping_dto_1 = require("../dto/shipping.dto");
const api_error_1 = require("../utils/api-error");
const product_pricing_service_1 = require("../services/product-pricing.service");
const cart_service_1 = require("../services/cart.service");
const shipping_service_1 = require("../services/shipping.service");
const shipping_quote_service_1 = require("../services/shipping-quote.service");
const validated = (type, body) => __awaiter(void 0, void 0, void 0, function* () {
    const dto = (0, class_transformer_1.plainToInstance)(type, body);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    });
    if (errors.length)
        throw new api_error_1.ApiError(400, "Invalid shipping request", errors);
    return dto;
});
const loadRetailCart = (req, cartId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if ((0, product_pricing_service_1.isWholesaler)(req.user))
        throw new api_error_1.ApiError(403, "Retail shipping is not available for wholesale customers");
    const cart = yield data_source_1.AppDataSource.getRepository(cart_entity_1.Cart).findOne({
        where: { id: cartId, userId: req.user.id },
        relations: cart_service_1.cartRelations,
    });
    if (!cart)
        throw new api_error_1.ApiError(404, "Cart not found");
    if (!((_a = cart.items) === null || _a === void 0 ? void 0 : _a.length))
        throw new api_error_1.ApiError(400, "Cart is empty");
    return cart;
});
const validateUsShippingAddress = (address) => {
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
        throw new api_error_1.ApiError(400, "Shipping address is incomplete");
    if (address.country.trim().toUpperCase() !== "US")
        throw new api_error_1.ApiError(400, "Mock UPS shipping is currently available only in the United States");
    if (!/^\d{5}(?:-\d{4})?$/.test(address.zipCode.trim()))
        throw new api_error_1.ApiError(400, "Invalid United States ZIP code");
};
const quoteResponse = (cart) => {
    const shippingRequired = (0, shipping_service_1.retailCartRequiresShipping)(cart);
    const weight = (0, shipping_service_1.calculateRetailShippingWeight)(cart);
    if (shippingRequired && weight <= 0)
        throw new api_error_1.ApiError(400, "Shipping weight is unavailable for this cart");
    return {
        cartId: cart.id,
        shippingRequired,
        weight,
        unit: "lb",
        shippingMethods: shippingRequired ? (0, shipping_quote_service_1.getMockShippingQuotes)(weight) : [],
    };
};
exports.ShippingController = {
    quote: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield validated(shipping_dto_1.ShippingQuoteDto, req.body);
            validateUsShippingAddress(dto.shippingAddress);
            res.json(quoteResponse(yield loadRetailCart(req, dto.cartId)));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    select: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = yield validated(shipping_dto_1.SelectShippingDto, req.body);
            validateUsShippingAddress(dto.shippingAddress);
            const cart = yield loadRetailCart(req, dto.cartId);
            const result = quoteResponse(cart);
            res.json(Object.assign(Object.assign({}, result), { selectedShippingMethod: (0, shipping_quote_service_1.getMockShippingQuote)(result.weight, dto.shippingCode) }));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
