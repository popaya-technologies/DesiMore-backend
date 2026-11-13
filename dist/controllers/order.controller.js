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
const order_service_1 = require("../services/order.service");
const api_error_1 = require("../utils/api-error");
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const order_status_entity_1 = require("../entities/order-status.entity");
const order_dto_1 = require("../dto/order.dto");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const typeorm_1 = require("typeorm");
const cancelled_order_entity_1 = require("../entities/cancelled-order.entity");
const email_1 = require("../utils/email");
const orderRepository = data_source_1.AppDataSource.getRepository(order_entity_1.Order);
const actorDetails = (user) => {
    var _a, _b, _c, _d;
    return ({
        createdBy: (_a = user === null || user === void 0 ? void 0 : user.id) !== null && _a !== void 0 ? _a : null,
        createdByName: [(_b = user === null || user === void 0 ? void 0 : user.firstName) !== null && _b !== void 0 ? _b : user === null || user === void 0 ? void 0 : user.firstname, (_c = user === null || user === void 0 ? void 0 : user.lastName) !== null && _c !== void 0 ? _c : user === null || user === void 0 ? void 0 : user.lastname]
            .filter(Boolean)
            .join(" ") || (user === null || user === void 0 ? void 0 : user.username) || (user === null || user === void 0 ? void 0 : user.email) || "Unknown",
        createdByAccountType: (_d = user === null || user === void 0 ? void 0 : user.accountType) !== null && _d !== void 0 ? _d : "user",
    });
};
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
function notifyStatusChange(order, statusName, comment) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const recipient = (_a = order.shippingAddress) === null || _a === void 0 ? void 0 : _a.email;
        if (!recipient)
            throw new Error("Order has no customer email address");
        yield (0, email_1.sendEmail)({
            to: recipient,
            subject: `Order ${order.orderNumber} status: ${statusName}`,
            html: `<p>Your order <strong>${escapeHtml(order.orderNumber)}</strong> status is now ${escapeHtml(statusName)}.</p>${comment ? `<p>${escapeHtml(comment).replace(/\n/g, "<br>")}</p>` : ""}`,
        });
    });
}
const buildDateRange = (from, to) => {
    if (!from && !to)
        return undefined;
    const fromStr = Array.isArray(from) ? from[0] : from;
    const toStr = Array.isArray(to) ? to[0] : to;
    let fromDate = fromStr ? new Date(fromStr) : undefined;
    let toDate = toStr ? new Date(toStr) : undefined;
    if (fromDate && isNaN(fromDate.getTime()))
        fromDate = undefined;
    if (toDate && isNaN(toDate.getTime()))
        toDate = undefined;
    if (!fromDate && !toDate)
        return undefined;
    if (fromDate) {
        fromDate.setHours(0, 0, 0, 0);
    }
    if (toDate) {
        toDate.setHours(23, 59, 59, 999);
    }
    return (0, typeorm_1.Between)(fromDate !== null && fromDate !== void 0 ? fromDate : new Date(0), toDate !== null && toDate !== void 0 ? toDate : new Date());
};
exports.OrderController = {
    // Create order from cart
    createOrder: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            res.status(201).json(yield (0, order_service_1.createRetailOrder)(req.user.id, req.body));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
    // Admin: Get all users' orders
    adminGetAllOrders: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page = 1, limit = 10, status, from, to } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = {};
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
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
            const history = yield data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).find({
                where: { orderId: order.id },
                order: { createdAt: "DESC", id: "DESC" },
            });
            res.status(200).json(Object.assign(Object.assign({}, order), { history }));
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
            const { page = 1, limit = 10, status, from, to } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = { userId };
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
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
        var _a, _b, _c, _d, _e, _f;
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
            const selectedStatus = yield data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus).findOne({
                where: { code: updateDto.status, isActive: true },
            });
            if (!selectedStatus) {
                res.status(400).json({ message: "Select an enabled order status" });
                return;
            }
            if (order.status === updateDto.status) {
                res.status(409).json({ message: "The order already has this status" });
                return;
            }
            const previousStatus = order.status;
            const comment = (_b = (_a = updateDto.notes) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "";
            const audit = actorDetails(req.user);
            let updatedOrder;
            let historyEntry;
            if (updateDto.status === order_entity_1.OrderStatus.CANCELLED) {
                try {
                    updatedOrder = yield (0, order_service_1.cancelRetailOrder)(id);
                    historyEntry = yield data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).save(data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).create(Object.assign({ orderId: id, previousStatus, status: updateDto.status, comment, customerNotified: false, override: false, carrierName: (_d = (_c = updatedOrder.tracking) === null || _c === void 0 ? void 0 : _c.carrier) !== null && _d !== void 0 ? _d : null, trackingNumber: (_f = (_e = updatedOrder.tracking) === null || _e === void 0 ? void 0 : _e.trackingNumber) !== null && _f !== void 0 ? _f : null }, audit)));
                }
                catch (error) {
                    (0, api_error_1.respondError)(res, error);
                    return;
                }
            }
            else if (order.status === order_entity_1.OrderStatus.CANCELLED ||
                updateDto.status === order_entity_1.OrderStatus.REFUNDED) {
                res
                    .status(400)
                    .json({
                    message: "Use the payment refund flow; cancelled orders cannot be reopened",
                });
                return;
            }
            else {
                const result = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(void 0, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    order.status = updateDto.status;
                    if (comment)
                        order.notes = comment;
                    const savedOrder = yield manager.getRepository(order_entity_1.Order).save(order);
                    const historyRepository = manager.getRepository(cancelled_order_entity_1.OrderHistory);
                    const savedHistory = yield historyRepository.save(historyRepository.create(Object.assign({ orderId: order.id, previousStatus, status: updateDto.status, comment, customerNotified: false, override: false, carrierName: (_b = (_a = order.tracking) === null || _a === void 0 ? void 0 : _a.carrier) !== null && _b !== void 0 ? _b : null, trackingNumber: (_d = (_c = order.tracking) === null || _c === void 0 ? void 0 : _c.trackingNumber) !== null && _d !== void 0 ? _d : null }, audit)));
                    return { savedOrder, savedHistory };
                }));
                updatedOrder = result.savedOrder;
                historyEntry = result.savedHistory;
            }
            let notification = "not_requested";
            if (updateDto.notifyCustomer) {
                try {
                    yield notifyStatusChange(updatedOrder, selectedStatus.name, comment);
                    yield data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).update(historyEntry.id, {
                        customerNotified: true,
                    });
                    historyEntry.customerNotified = true;
                    notification = "sent";
                }
                catch (error) {
                    console.error("Order status notification error:", error);
                    notification = "failed";
                }
            }
            res.status(200).json(Object.assign(Object.assign({}, updatedOrder), { historyEntry, notification }));
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
            res.json(yield (0, order_service_1.cancelRetailOrder)(req.params.id, req.user.id));
        }
        catch (error) {
            (0, api_error_1.respondError)(res, error);
        }
    }),
};
