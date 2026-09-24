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
const order_service_1 = require("../services/order.service");
const api_error_1 = require("../utils/api-error");
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const payment_entity_1 = require("../entities/payment.entity");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const authorize_net_service_1 = require("../services/authorize-net.service");
const payment_dto_1 = require("../dto/payment.dto");
const orderRepository = data_source_1.AppDataSource.getRepository(order_entity_1.Order);
const paymentRepository = data_source_1.AppDataSource.getRepository(payment_entity_1.Payment);
exports.PaymentController = {
    processPayment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        let orderId = (_a = req.body) === null || _a === void 0 ? void 0 : _a.orderId;
        try {
            const dto = orderId
                ? (0, class_transformer_1.plainToInstance)(payment_dto_1.ProcessPaymentDto, req.body)
                : (0, class_transformer_1.plainToInstance)(payment_dto_1.CheckoutPaymentDto, req.body);
            const errors = yield (0, class_validator_1.validate)(dto, {
                whitelist: true,
                forbidNonWhitelisted: true,
                validationError: { target: false, value: false },
            });
            if (errors.length)
                throw new api_error_1.ApiError(400, "Invalid payment data", errors);
            let order;
            if (orderId) {
                order = yield orderRepository.findOne({
                    where: { id: orderId, userId: req.user.id },
                });
                if (!order)
                    throw new api_error_1.ApiError(404, "Order not found");
            }
            else {
                // Persist the pending order and reserve stock before contacting the gateway.
                // A declined/unknown charge can be retried/reconciled against this order ID.
                order = yield (0, order_service_1.createRetailOrder)(req.user.id, dto);
                orderId = order.id;
            }
            if ([order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED].includes(order.status))
                throw new api_error_1.ApiError(400, "Order cannot be paid");
            if ([payment_entity_1.PaymentStatus.COMPLETED, payment_entity_1.PaymentStatus.PROCESSING].includes(order.paymentStatus))
                throw new api_error_1.ApiError(409, "Payment already completed or processing");
            const payment = yield authorize_net_service_1.AuthorizeNetService.createTransaction(order.id, {
                cardNumber: dto.cardNumber,
                expirationDate: dto.expirationDate,
                cardCode: dto.cardCode,
                amount: Number(order.total),
            });
            const updated = yield orderRepository.findOne({
                where: { id: order.id },
                relations: ["items"],
            });
            const success = payment.status === payment_entity_1.PaymentStatus.COMPLETED;
            res
                .status(success ? 200 : 400)
                .json({
                success,
                order: updated,
                orderId,
                payment,
                message: success
                    ? "Payment processed successfully"
                    : "Payment failed; retry using orderId",
            });
        }
        catch (error) {
            if (orderId)
                res.setHeader("X-Order-Id", orderId);
            if (!(error instanceof api_error_1.ApiError) && orderId) {
                console.error("Payment processing error", error);
                res
                    .status(502)
                    .json({
                    message: "Payment could not be confirmed. Check this order before retrying.",
                    orderId,
                });
            }
            else
                (0, api_error_1.respondError)(res, error);
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
