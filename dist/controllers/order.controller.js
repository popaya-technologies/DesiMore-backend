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
exports.OrderController = void 0;
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const order_item_entity_1 = require("../entities/order-item.entity");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const product_entity_1 = require("../entities/product.entity");
const order_dto_1 = require("../dto/order.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const reference_number_util_1 = require("../utils/reference-number.util");
const orderRepository = data_source_1.AppDataSource.getRepository(order_entity_1.Order);
const orderItemRepository = data_source_1.AppDataSource.getRepository(order_item_entity_1.OrderItem);
const cartRepository = data_source_1.AppDataSource.getRepository(cart_entity_1.Cart);
const cartItemRepository = data_source_1.AppDataSource.getRepository(cart_item_entity_1.CartItem);
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
exports.OrderController = {
    // Create order from cart
    createOrder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            // Transform plain body to DTO instance so nested validation works
            const createOrderDto = (0, class_transformer_1.plainToInstance)(order_dto_1.CreateOrderDto, req.body);
            const errors = yield (0, class_validator_1.validate)(createOrderDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Get user's cart with items
            const cartWhere = createOrderDto.cartId
                ? { id: createOrderDto.cartId, userId }
                : { userId, type: cart_entity_1.CartType.REGULAR };
            const cart = yield cartRepository.findOne({
                where: cartWhere,
                relations: ["items", "items.product"],
            });
            if (!cart || cart.items.length === 0) {
                res.status(400).json({ message: "Cart is empty" });
                return;
            }
            // Create order
            const order = new order_entity_1.Order();
            order.userId = userId;
            order.orderNumber = yield (0, reference_number_util_1.generateOrderNumber)();
            order.shippingAddress = createOrderDto.shippingAddress;
            order.billingAddress =
                createOrderDto.billingAddress || createOrderDto.shippingAddress;
            order.paymentMethod = createOrderDto.paymentMethod;
            order.notes = createOrderDto.notes;
            // Create order items from cart items
            order.items = yield Promise.all(cart.items.map((cartItem) => __awaiter(void 0, void 0, void 0, function* () {
                const orderItem = new order_item_entity_1.OrderItem();
                orderItem.productId = cartItem.productId;
                orderItem.productName = cartItem.product.title;
                orderItem.productImages = cartItem.product.images;
                orderItem.quantity = cartItem.quantity;
                // Debug cart item product prices
                console.log(`Cart item product price: ${cartItem.product.price} (type: ${typeof cartItem.product.price})`);
                console.log(`Cart item product discountPrice: ${cartItem.product.discountPrice} (type: ${typeof cartItem.product.discountPrice})`);
                // Handle decimal values from TypeORM (they come as strings)
                const productPrice = typeof cartItem.product.price === "string"
                    ? parseFloat(cartItem.product.price)
                    : cartItem.product.price;
                if (isNaN(productPrice) || productPrice <= 0) {
                    console.error(`Invalid product price: ${cartItem.product.price} for product ${cartItem.product.id}`);
                    throw new Error(`Invalid product price for product ${cartItem.product.title}`);
                }
                orderItem.price = productPrice;
                // Handle discounted price
                if (cartItem.product.discountPrice) {
                    const discountedPrice = typeof cartItem.product.discountPrice === "string"
                        ? parseFloat(cartItem.product.discountPrice)
                        : cartItem.product.discountPrice;
                    if (!isNaN(discountedPrice) && discountedPrice > 0) {
                        orderItem.discountedPrice = discountedPrice;
                    }
                }
                orderItem.calculateTotal();
                return orderItem;
            })));
            // Calculate order totals - ensure all values are numbers
            order.subtotal = order.items.reduce((sum, item) => {
                const itemTotal = typeof item.total === "string" ? parseFloat(item.total) : item.total;
                console.log(`Item total: ${itemTotal}, isNaN: ${isNaN(itemTotal)}`);
                return sum + (isNaN(itemTotal) ? 0 : itemTotal);
            }, 0);
            console.log(`Order subtotal: ${order.subtotal}`);
            order.tax = 0; // Tax disabled
            order.shipping = order.subtotal > 500 ? 0 : 50; // Free shipping above 500
            order.total = order.subtotal + order.shipping;
            console.log(`Order total: ${order.total}, subtotal: ${order.subtotal}, tax: ${order.tax}, shipping: ${order.shipping}`);
            // Save order
            yield orderRepository.save(order);
            // Clear cart after successful order creation
            yield cartItemRepository.delete({ cartId: cart.id });
            cart.total = 0;
            cart.wholesaleTotal = 0;
            cart.itemsCount = 0;
            yield cartRepository.save(cart);
            //  created order
            const createdOrder = yield orderRepository.findOne({
                where: { id: order.id },
                relations: ["items"],
            });
            res.status(201).json(createdOrder);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Admin: Get all users' orders
    adminGetAllOrders: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, status } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = {};
            if (status) {
                where.status = status;
            }
            const [orders, total] = yield orderRepository.findAndCount({
                where,
                relations: ["items", "user"],
                order: { createdAt: "DESC" },
                skip,
                take: parseInt(limit),
            });
            res.status(200).json({
                orders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Admin: Get a single order by ID (with items and user)
    adminGetOrderById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const order = yield orderRepository.findOne({
                where: { id },
                relations: ["items", "user"],
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Update tracking info (Admin only)
    updateOrderTracking: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(order_dto_1.UpdateOrderTrackingDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const order = yield orderRepository.findOne({
                where: { id },
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            order.tracking = {
                carrier: updateDto.carrier,
                trackingNumber: updateDto.trackingNumber,
            };
            yield orderRepository.save(order);
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Get user's orders
    getUserOrders: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, status } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = { userId };
            if (status) {
                where.status = status;
            }
            const [orders, total] = yield orderRepository.findAndCount({
                where,
                relations: ["items"],
                order: { createdAt: "DESC" },
                skip,
                take: parseInt(limit),
            });
            res.status(200).json({
                orders,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                },
            });
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Get order by ID
    getOrder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const order = yield orderRepository.findOne({
                where: { id, userId },
                relations: ["items"],
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
            }
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Update order status (Admin only)
    updateOrderStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(order_dto_1.UpdateOrderStatusDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const order = yield orderRepository.findOne({
                where: { id },
                relations: ["items"],
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            order.status = updateDto.status;
            if (updateDto.notes) {
                order.notes = updateDto.notes;
            }
            yield orderRepository.save(order);
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Update payment status
    updatePaymentStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(order_dto_1.UpdatePaymentStatusDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const order = yield orderRepository.findOne({
                where: { id },
                relations: ["items"],
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            order.paymentStatus = updateDto.paymentStatus;
            if (updateDto.transactionId) {
                order.transactionId = updateDto.transactionId;
            }
            yield orderRepository.save(order);
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    // Cancel order
    cancelOrder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const order = yield orderRepository.findOne({
                where: { id, userId },
                relations: ["items"],
            });
            if (!order) {
                res.status(404).json({ message: "Order not found" });
                return;
            }
            if (![order_entity_1.OrderStatus.PENDING, order_entity_1.OrderStatus.CONFIRMED].includes(order.status)) {
                res
                    .status(400)
                    .json({ message: "Order cannot be cancelled at this stage" });
                return;
            }
            order.status = order_entity_1.OrderStatus.CANCELLED;
            order.paymentStatus = order_entity_1.PaymentStatus.REFUNDED;
            yield orderRepository.save(order);
            res.status(200).json(order);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
