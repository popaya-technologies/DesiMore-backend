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
exports.PaymentController = void 0;
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const payment_entity_1 = require("../entities/payment.entity");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const authorize_net_service_1 = require("../services/authorize-net.service");
const payment_dto_1 = require("../dto/payment.dto");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const product_entity_1 = require("../entities/product.entity");
const order_item_entity_1 = require("../entities/order-item.entity");
const reference_number_util_1 = require("../utils/reference-number.util");
const orderRepository = data_source_1.AppDataSource.getRepository(order_entity_1.Order);
const paymentRepository = data_source_1.AppDataSource.getRepository(payment_entity_1.Payment);
const cartRepository = data_source_1.AppDataSource.getRepository(cart_entity_1.Cart);
const cartItemRepository = data_source_1.AppDataSource.getRepository(cart_item_entity_1.CartItem);
const productRepository = data_source_1.AppDataSource.getRepository(product_entity_1.Product);
exports.PaymentController = {
    processPayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            // Backward-compatible path (existing: order-first payment)
            if (req.body && req.body.orderId) {
                // Transform and validate DTO
                const processPaymentDto = (0, class_transformer_1.plainToInstance)(payment_dto_1.ProcessPaymentDto, req.body);
                const errors = yield (0, class_validator_1.validate)(processPaymentDto, {
                    whitelist: true,
                    forbidUnknownValues: true,
                    validationError: { target: false },
                });
                if (errors.length > 0) {
                    res.status(400).json({ errors });
                    return;
                }
                // Verify user owns the order
                const order = yield orderRepository.findOne({
                    where: { id: processPaymentDto.orderId, userId },
                    relations: ["items"], // Load items to see the calculation
                });
                if (!order) {
                    res.status(404).json({ message: "Order not found" });
                    return;
                }
                if (order.paymentStatus === payment_entity_1.PaymentStatus.COMPLETED) {
                    res.status(400).json({ message: "Order already paid" });
                    return;
                }
                // Process payment based on existing order total
                const orderTotal = typeof order.total === "string" ? parseFloat(order.total) : order.total;
                if (isNaN(orderTotal) || orderTotal <= 0) {
                    res.status(400).json({
                        message: "Invalid order total",
                        orderTotal: order.total,
                    });
                    return;
                }
                const payment = yield authorize_net_service_1.AuthorizeNetService.createTransaction(processPaymentDto.orderId, {
                    cardNumber: processPaymentDto.cardNumber,
                    expirationDate: processPaymentDto.expirationDate,
                    cardCode: processPaymentDto.cardCode,
                    amount: orderTotal,
                });
                const isSuccess = payment.status === "completed";
                res.status(isSuccess ? 200 : 400).json({
                    success: isSuccess,
                    payment,
                    message: isSuccess
                        ? "Payment processed successfully"
                        : "Payment processing failed",
                });
                return;
            }
            // New path: pay-then-create (no pre-existing order)
            const checkoutDto = (0, class_transformer_1.plainToInstance)(payment_dto_1.CheckoutPaymentDto, req.body);
            const errors = yield (0, class_validator_1.validate)(checkoutDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            // Load user's cart
            const cartWhere = checkoutDto.cartId
                ? { id: checkoutDto.cartId, userId }
                : { userId, type: cart_entity_1.CartType.REGULAR };
            const cart = yield cartRepository.findOne({
                where: cartWhere,
                relations: ["items", "items.product"],
            });
            if (!cart || !cart.items || cart.items.length === 0) {
                res.status(400).json({ message: "Cart is empty" });
                return;
            }
            // Build order items & compute totals (without persisting yet)
            const tempOrderItems = yield Promise.all(cart.items.map((cartItem) => __awaiter(void 0, void 0, void 0, function* () {
                var _a;
                const orderItem = new order_item_entity_1.OrderItem();
                orderItem.productId = cartItem.productId;
                orderItem.productName = cartItem.product.title;
                orderItem.productImages = cartItem.product.images;
                orderItem.quantity = cartItem.quantity;
                const resolvedPrice = typeof cartItem.price === "string"
                    ? parseFloat(cartItem.price)
                    : (_a = cartItem.price) !== null && _a !== void 0 ? _a : (typeof cartItem.product.discountPrice === "string"
                        ? parseFloat(cartItem.product.discountPrice)
                        : typeof cartItem.product.discountPrice === "number"
                            ? cartItem.product.discountPrice
                            : typeof cartItem.product.price === "string"
                                ? parseFloat(cartItem.product.price)
                                : cartItem.product.price);
                if (resolvedPrice === null ||
                    resolvedPrice === undefined ||
                    isNaN(resolvedPrice) ||
                    resolvedPrice <= 0) {
                    throw new Error(`Invalid product price for product ${cartItem.product.title}`);
                }
                orderItem.price = resolvedPrice;
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
            const subtotal = tempOrderItems.reduce((sum, item) => {
                const itemTotal = typeof item.total === "string" ? parseFloat(item.total) : item.total;
                return sum + (isNaN(itemTotal) ? 0 : itemTotal);
            }, 0);
            const tax = 0; // Tax disabled
            const shipping = subtotal > 500 ? 0 : 50;
            const total = subtotal + shipping;
            if (isNaN(total) || total <= 0) {
                res.status(400).json({ message: "Invalid cart total" });
                return;
            }
            // Generate an invoice number with year + sequence
            const invoiceNumber = yield (0, reference_number_util_1.generateOrderNumber)();
            // Charge via Authorize.Net without a saved order
            const chargeResult = yield authorize_net_service_1.AuthorizeNetService.createTransactionForCheckout({
                userEmail: req.user.email,
                cardNumber: checkoutDto.cardNumber,
                expirationDate: checkoutDto.expirationDate,
                cardCode: checkoutDto.cardCode,
                amount: total,
                invoiceNumber,
                billingAddress: checkoutDto.billingAddress || checkoutDto.shippingAddress,
                shippingAddress: checkoutDto.shippingAddress,
            });
            if (chargeResult.status !== "completed") {
                res.status(400).json({
                    success: false,
                    message: chargeResult.failureMessage || "Payment processing failed",
                    details: chargeResult.authorizeNetResponse,
                });
                return;
            }
            // Create order now that payment is successful
            const order = new order_entity_1.Order();
            order.userId = userId;
            order.orderNumber = invoiceNumber; // ensure consistency with payment invoice
            order.shippingAddress = checkoutDto.shippingAddress;
            order.billingAddress =
                checkoutDto.billingAddress || checkoutDto.shippingAddress;
            order.paymentMethod = checkoutDto.paymentMethod;
            order.notes = checkoutDto.notes;
            order.items = tempOrderItems;
            order.subtotal = subtotal;
            order.tax = tax;
            order.shipping = shipping;
            order.total = total;
            order.paymentStatus = payment_entity_1.PaymentStatus.COMPLETED;
            order.status = order_entity_1.OrderStatus.CONFIRMED;
            order.transactionId = chargeResult.transactionId;
            yield orderRepository.save(order);
            // Clear cart
            yield cartItemRepository.delete({ cartId: cart.id });
            cart.total = 0;
            cart.wholesaleTotal = 0;
            cart.itemsCount = 0;
            yield cartRepository.save(cart);
            // Persist payment record linked to the newly created order
            const payment = paymentRepository.create({
                orderId: order.id,
                amount: total,
                currency: "USD",
                status: payment_entity_1.PaymentStatus.COMPLETED,
                paymentMethod: payment_entity_1.PaymentMethod.CREDIT_CARD,
                transactionId: chargeResult.transactionId,
                authCode: chargeResult.authCode,
                paymentDetails: chargeResult.paymentDetails,
                authorizeNetResponse: chargeResult.authorizeNetResponse,
            });
            yield paymentRepository.save(payment);
            res.status(200).json({
                success: true,
                message: "Payment processed and order created successfully",
                order,
                payment,
            });
        }
        catch (error) {
            console.error("Payment processing error:", error);
            res.status(500).json({
                message: "Payment processing failed",
                error: error.message,
            });
        }
    }),
    getPaymentStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { orderId } = req.params;
            const userId = req.user.id;
            const payment = yield paymentRepository.findOne({
                where: { orderId },
                relations: ["order"],
            });
            if (!payment || payment.order.userId !== userId) {
                res.status(404).json({ message: "Payment not found" });
                return;
            }
            res.status(200).json(payment);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    refundPayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { paymentId } = req.params;
            // Transform and validate DTO
            const refundDto = (0, class_transformer_1.plainToInstance)(payment_dto_1.RefundPaymentDto, req.body);
            const errors = yield (0, class_validator_1.validate)(refundDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const payment = yield paymentRepository.findOne({
                where: { id: paymentId },
                relations: ["order"],
            });
            if (!payment) {
                res.status(404).json({ message: "Payment not found" });
                return;
            }
            // Check if user owns the payment or is admin
            if (payment.order.userId !== req.user.id && req.user.userRole !== "su") {
                res.status(403).json({ message: "Access denied" });
                return;
            }
            const refundedPayment = yield authorize_net_service_1.AuthorizeNetService.refundTransaction(paymentId, refundDto.amount);
            res.status(200).json({
                success: true,
                payment: refundedPayment,
                message: "Refund processed successfully",
            });
        }
        catch (error) {
            console.error("Refund error:", error);
            res.status(500).json({
                message: "Refund failed",
                error: error.message,
            });
        }
    }),
    getTransactionDetails: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { transactionId } = req.params;
            const transactionDetails = yield authorize_net_service_1.AuthorizeNetService.getTransactionDetails(transactionId);
            res.status(200).json(transactionDetails);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
