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
exports.changeWholesaleStatus = exports.createWholesaleRequest = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const user_entity_1 = require("../entities/user.entity");
const wholesale_order_request_entity_1 = require("../entities/wholesale-order-request.entity");
const wholesale_order_item_entity_1 = require("../entities/wholesale-order-item.entity");
const wholesale_order_dto_1 = require("../dto/wholesale-order.dto");
const api_error_1 = require("../utils/api-error");
const cart_service_1 = require("./cart.service");
const inventory_service_1 = require("./inventory.service");
const reference_number_util_1 = require("../utils/reference-number.util");
const product_pricing_service_1 = require("./product-pricing.service");
const createWholesaleRequest = (userId, input) => __awaiter(void 0, void 0, void 0, function* () {
    const dto = (0, class_transformer_1.plainToInstance)(wholesale_order_dto_1.CreateWholesaleOrderRequestDto, input);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    });
    if (errors.length || !dto.shippingAddress)
        throw new api_error_1.ApiError(400, "Invalid wholesale request", errors);
    return data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
        yield manager
            .getRepository(user_entity_1.User)
            .findOneOrFail({
            where: { id: userId },
            lock: { mode: "pessimistic_write" },
        });
        const cart = yield manager
            .getRepository(cart_entity_1.Cart)
            .findOne({
            where: dto.cartId
                ? { id: dto.cartId, userId }
                : { userId, type: cart_entity_1.CartType.REGULAR },
            relations: cart_service_1.cartRelations,
        });
        if (!(cart === null || cart === void 0 ? void 0 : cart.items.length))
            throw new api_error_1.ApiError(400, "Cart is empty");
        const inventoryReservations = yield (0, inventory_service_1.reserveCartInventory)(manager, cart, true);
        const request = manager.getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest).create({
            userId,
            requestNumber: yield (0, reference_number_util_1.generateWholesaleRequestNumber)(manager),
            shippingAddress: dto.shippingAddress,
            billingAddress: dto.billingAddress || dto.shippingAddress,
            notes: dto.notes || null,
            status: wholesale_order_request_entity_1.WholesaleOrderRequestStatus.PENDING,
            inventoryReservations,
        });
        request.items = cart.items.map((item) => {
            const row = manager.getRepository(wholesale_order_item_entity_1.WholesaleOrderItem).create({
                productId: item.productId,
                productName: item.product.title,
                productImages: item.product.images,
                requestedBoxes: item.quantity,
                wholesaleOrderQuantity: item.product.wholesaleOrderQuantity,
                unitsPerCarton: item.product.unitsPerCarton,
                wholesalePrice: item.product.wholesalePrice,
                effectivePricePerCarton: item.price,
                selectedOptions: item.selectedOptions,
            });
            row.calculateTotals();
            return row;
        });
        request.subtotal = (0, product_pricing_service_1.roundMoney)(request.items.reduce((sum, item) => sum + item.total, 0));
        request.discount = (0, product_pricing_service_1.roundMoney)(request.subtotal * 0.02);
        request.tax = 0;
        const discounted = Math.max(0, request.subtotal - request.discount);
        request.shipping = cart.items.some((i) => i.product.wholesaleRequiresShipping !== false)
            ? (0, product_pricing_service_1.freight)(discounted)
            : 0;
        request.total = (0, product_pricing_service_1.roundMoney)(discounted + request.shipping);
        yield manager.getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest).save(request);
        yield manager.getRepository(cart_item_entity_1.CartItem).delete({ cartId: cart.id });
        cart.items = [];
        cart.calculateTotal();
        yield manager.getRepository(cart_entity_1.Cart).save(cart);
        return manager
            .getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest)
            .findOne({ where: { id: request.id }, relations: ["items"] });
    }));
});
exports.createWholesaleRequest = createWholesaleRequest;
const changeWholesaleStatus = (id, status, adminNotes) => __awaiter(void 0, void 0, void 0, function* () {
    return data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
        const repo = manager.getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest);
        const request = yield repo
            .createQueryBuilder("request")
            .addSelect("request.inventoryReservations")
            .where("request.id = :id", { id })
            .setLock("pessimistic_write")
            .getOne();
        if (!request)
            throw new api_error_1.ApiError(404, "Wholesale request not found");
        const transitions = {
            pending: ["approved", "rejected"],
            approved: ["delivered", "rejected"],
            rejected: [],
            delivered: [],
        };
        if (request.status !== status &&
            !transitions[request.status].includes(status))
            throw new api_error_1.ApiError(400, "Invalid wholesale status transition");
        if (status === wholesale_order_request_entity_1.WholesaleOrderRequestStatus.REJECTED &&
            request.status !== status) {
            yield (0, inventory_service_1.releaseInventory)(manager, request.inventoryReservations || []);
            request.inventoryReservations = [];
        }
        request.status = status;
        if (adminNotes !== undefined)
            request.adminNotes = adminNotes;
        yield repo.save(request);
        return repo.findOne({ where: { id }, relations: ["items"] });
    }));
});
exports.changeWholesaleStatus = changeWholesaleStatus;
