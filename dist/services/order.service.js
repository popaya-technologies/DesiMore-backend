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
exports.cancelRetailOrder = exports.createRetailOrder = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const order_item_entity_1 = require("../entities/order-item.entity");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const user_entity_1 = require("../entities/user.entity");
const order_dto_1 = require("../dto/order.dto");
const api_error_1 = require("../utils/api-error");
const cart_service_1 = require("./cart.service");
const inventory_service_1 = require("./inventory.service");
const reference_number_util_1 = require("../utils/reference-number.util");
const product_pricing_service_1 = require("./product-pricing.service");
const createRetailOrder = (userId, input) => __awaiter(void 0, void 0, void 0, function* () {
    const dto = (0, class_transformer_1.plainToInstance)(order_dto_1.CreateOrderDto, input);
    const errors = yield (0, class_validator_1.validate)(dto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false, value: false },
    });
    if (errors.length || !dto.shippingAddress)
        throw new api_error_1.ApiError(400, "Invalid order data", errors);
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
        const inventoryReservations = yield (0, inventory_service_1.reserveCartInventory)(manager, cart, false);
        const order = manager.getRepository(order_entity_1.Order).create({
            userId,
            orderNumber: yield (0, reference_number_util_1.generateOrderNumber)(manager),
            shippingAddress: dto.shippingAddress,
            billingAddress: dto.billingAddress || dto.shippingAddress,
            paymentMethod: dto.paymentMethod,
            notes: dto.notes || null,
            status: order_entity_1.OrderStatus.PENDING,
            paymentStatus: order_entity_1.PaymentStatus.PENDING,
            inventoryReservations,
        });
        order.items = cart.items.map((item) => manager.getRepository(order_item_entity_1.OrderItem).create({
            productId: item.productId,
            productName: item.product.title,
            productImages: item.product.images,
            quantity: item.quantity,
            price: item.price,
            discountedPrice: null,
            total: (0, product_pricing_service_1.roundMoney)(Number(item.price) * item.quantity),
            selectedOptions: item.selectedOptions,
        }));
        order.subtotal = (0, product_pricing_service_1.roundMoney)(order.items.reduce((sum, item) => sum + item.total, 0));
        order.tax = 0;
        order.shipping =
            cart.items.some((i) => i.product.requiresShipping !== false) &&
                order.subtotal <= 500
                ? 50
                : 0;
        order.total = (0, product_pricing_service_1.roundMoney)(order.subtotal + order.shipping);
        yield manager.getRepository(order_entity_1.Order).save(order);
        yield manager.getRepository(cart_item_entity_1.CartItem).delete({ cartId: cart.id });
        cart.items = [];
        cart.calculateTotal();
        yield manager.getRepository(cart_entity_1.Cart).save(cart);
        return manager
            .getRepository(order_entity_1.Order)
            .findOne({ where: { id: order.id }, relations: ["items"] });
    }));
});
exports.createRetailOrder = createRetailOrder;
const cancelRetailOrder = (id, userId) => __awaiter(void 0, void 0, void 0, function* () {
    return data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
        const query = manager
            .getRepository(order_entity_1.Order)
            .createQueryBuilder("order")
            .addSelect("order.inventoryReservations")
            .where("order.id = :id", { id })
            .setLock("pessimistic_write");
        if (userId)
            query.andWhere("order.userId = :userId", { userId });
        const order = yield query.getOne();
        if (!order)
            throw new api_error_1.ApiError(404, "Order not found");
        if (order.status === order_entity_1.OrderStatus.CANCELLED) {
            delete order.inventoryReservations;
            return order;
        }
        if (![order_entity_1.OrderStatus.PENDING, order_entity_1.OrderStatus.CONFIRMED].includes(order.status) ||
            [order_entity_1.PaymentStatus.COMPLETED, order_entity_1.PaymentStatus.PROCESSING].includes(order.paymentStatus))
            throw new api_error_1.ApiError(400, "This order cannot be cancelled; paid orders require a refund");
        yield (0, inventory_service_1.releaseInventory)(manager, order.inventoryReservations || []);
        order.inventoryReservations = [];
        order.status = order_entity_1.OrderStatus.CANCELLED;
        order.paymentStatus = order_entity_1.PaymentStatus.CANCELLED;
        yield manager.getRepository(order_entity_1.Order).save(order);
        delete order.inventoryReservations;
        return order;
    }));
});
exports.cancelRetailOrder = cancelRetailOrder;
