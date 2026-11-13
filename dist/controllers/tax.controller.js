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
exports.TaxController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const tax_dto_1 = require("../dto/tax.dto");
const api_error_1 = require("../utils/api-error");
const cart_service_1 = require("../services/cart.service");
const tax_service_1 = require("../services/tax.service");
exports.TaxController = {
    // Tax for the customer's cart and the address entered at checkout.
    quote: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const dto = (0, class_transformer_1.plainToInstance)(tax_dto_1.TaxQuoteDto, req.body);
            // Full checkout addresses may be sent; fields other than country/state are ignored.
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                validationError: { target: false, value: false },
            });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid tax request", errors);
            const cart = yield data_source_1.AppDataSource.getRepository(cart_entity_1.Cart).findOne({
                where: { id: dto.cartId, userId: req.user.id },
                relations: cart_service_1.cartRelations,
            });
            if (!cart)
                throw new api_error_1.ApiError(404, "Cart not found");
            const tax = yield (0, tax_service_1.calculateTax)((0, tax_service_1.cartTaxItems)(cart), {
                shipping: dto.shippingAddress,
                payment: dto.paymentAddress,
            });
            res.json({
                cartId: cart.id,
                taxes: tax.lines,
                taxTotal: tax.total,
            });
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
