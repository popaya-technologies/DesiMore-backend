"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.AuthorizeNetService = void 0;
const AuthorizeNet = __importStar(require("authorizenet"));
const api_error_1 = require("../utils/api-error");
const data_source_1 = require("../data-source");
const payment_entity_1 = require("../entities/payment.entity");
const order_entity_1 = require("../entities/order.entity");
const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const SDKConstants = AuthorizeNet.Constants;
const paymentRepository = data_source_1.AppDataSource.getRepository(payment_entity_1.Payment);
const orderRepository = data_source_1.AppDataSource.getRepository(order_entity_1.Order);
class AuthorizeNetService {
    static getEnvironment() {
        return process.env.AUTHORIZE_ENVIRONMENT === "production"
            ? SDKConstants.endpoint.production
            : SDKConstants.endpoint.sandbox;
    }
    static createMerchantAuthentication() {
        const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(process.env.AUTHORIZE_API_LOGIN_ID);
        merchantAuthenticationType.setTransactionKey(process.env.AUTHORIZE_TRANSACTION_KEY);
        return merchantAuthenticationType;
    }
    static createTransaction(orderId, paymentData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const order = yield orderRepository.findOne({
                    where: { id: orderId },
                    relations: ["user"],
                });
                if (!order) {
                    throw new Error("Order not found");
                }
                // Ensure amount is a valid number
                const amount = typeof paymentData.amount === "string"
                    ? parseFloat(paymentData.amount)
                    : paymentData.amount;
                if (isNaN(amount) || amount <= 0) {
                    throw new api_error_1.ApiError(400, "Payment amount must be greater than zero");
                }
                // Serialize payment attempts and retain PROCESSING on ambiguous gateway errors.
                const payment = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    const locked = yield manager
                        .getRepository(order_entity_1.Order)
                        .findOne({
                        where: { id: orderId },
                        lock: { mode: "pessimistic_write" },
                    });
                    if (!locked ||
                        [order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED].includes(locked.status))
                        throw new api_error_1.ApiError(400, "Order cannot be paid");
                    if ([payment_entity_1.PaymentStatus.PROCESSING, payment_entity_1.PaymentStatus.COMPLETED].includes(locked.paymentStatus))
                        throw new api_error_1.ApiError(409, "Payment already processing or completed");
                    const repo = manager.getRepository(payment_entity_1.Payment);
                    const existing = yield repo.findOneBy({ orderId });
                    if (existing && existing.status !== payment_entity_1.PaymentStatus.FAILED)
                        throw new api_error_1.ApiError(409, "Payment cannot be retried");
                    const record = existing ||
                        repo.create({
                            orderId,
                            currency: "USD",
                            paymentMethod: payment_entity_1.PaymentMethod.CREDIT_CARD,
                        });
                    record.amount = Number(locked.total);
                    record.status = payment_entity_1.PaymentStatus.PROCESSING;
                    record.failureMessage = null;
                    locked.paymentStatus = payment_entity_1.PaymentStatus.PROCESSING;
                    yield manager.getRepository(order_entity_1.Order).save(locked);
                    return repo.save(record);
                }));
                // Create credit card object
                const creditCard = new ApiContracts.CreditCardType();
                creditCard.setCardNumber(paymentData.cardNumber.replace(/\s/g, ""));
                creditCard.setExpirationDate(paymentData.expirationDate);
                creditCard.setCardCode(paymentData.cardCode);
                // Create payment type
                const paymentType = new ApiContracts.PaymentType();
                paymentType.setCreditCard(creditCard);
                // Create order details
                const orderDetails = new ApiContracts.OrderType();
                orderDetails.setInvoiceNumber(order.orderNumber);
                orderDetails.setDescription(`Payment for order ${order.orderNumber}`);
                // Create transaction request
                const transactionRequestType = new ApiContracts.TransactionRequestType();
                transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
                transactionRequestType.setPayment(paymentType);
                transactionRequestType.setAmount(Number(payment.amount));
                transactionRequestType.setOrder(orderDetails);
                // Customer information
                const customer = new ApiContracts.CustomerDataType();
                customer.setEmail(order.user.email);
                transactionRequestType.setCustomer(customer);
                // Billing address
                const billingAddress = new ApiContracts.CustomerAddressType();
                billingAddress.setFirstName(order.billingAddress.firstName);
                billingAddress.setLastName(order.billingAddress.lastName);
                billingAddress.setAddress(order.billingAddress.address);
                billingAddress.setCity(order.billingAddress.city);
                billingAddress.setState(order.billingAddress.state);
                billingAddress.setZip(order.billingAddress.zipCode);
                billingAddress.setCountry(order.billingAddress.country);
                transactionRequestType.setBillTo(billingAddress);
                // Shipping address
                const shippingAddress = new ApiContracts.CustomerAddressType();
                shippingAddress.setFirstName(order.shippingAddress.firstName);
                shippingAddress.setLastName(order.shippingAddress.lastName);
                shippingAddress.setAddress(order.shippingAddress.address);
                shippingAddress.setCity(order.shippingAddress.city);
                shippingAddress.setState(order.shippingAddress.state);
                shippingAddress.setZip(order.shippingAddress.zipCode);
                shippingAddress.setCountry(order.shippingAddress.country);
                transactionRequestType.setShipTo(shippingAddress);
                // Create API request
                const createRequest = new ApiContracts.CreateTransactionRequest();
                createRequest.setMerchantAuthentication(AuthorizeNetService.createMerchantAuthentication());
                createRequest.setTransactionRequest(transactionRequestType);
                // Execute transaction
                const controller = new ApiControllers.CreateTransactionController(createRequest.getJSON());
                controller.setEnvironment(AuthorizeNetService.getEnvironment());
                return new Promise((resolve, reject) => {
                    controller.execute(() => {
                        const apiResponse = controller.getResponse();
                        const response = new ApiContracts.CreateTransactionResponse(apiResponse);
                        // Update payment with response
                        AuthorizeNetService.handleTransactionResponse(payment.id, response)
                            .then((updatedPayment) => resolve(updatedPayment))
                            .catch((error) => reject(error));
                    });
                });
            }
            catch (error) {
                console.error("Authorize.net transaction error:", error);
                throw error;
            }
        });
    }
    static handleTransactionResponse(paymentId, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const payment = yield manager
                    .getRepository(payment_entity_1.Payment)
                    .findOneBy({ id: paymentId });
                if (!payment)
                    throw new Error("Payment not found");
                const order = yield manager
                    .getRepository(order_entity_1.Order)
                    .findOne({
                    where: { id: payment.orderId },
                    lock: { mode: "pessimistic_write" },
                });
                if (!order)
                    throw new Error("Order not found");
                const transaction = response.getTransactionResponse();
                const code = transaction === null || transaction === void 0 ? void 0 : transaction.getResponseCode();
                // Held-for-review or malformed responses require reconciliation, not an automatic retry.
                if (!transaction || !["1", "2", "3"].includes(code))
                    throw new Error("Gateway outcome requires reconciliation");
                payment.authorizeNetResponse = response;
                if (code === "1") {
                    payment.status = payment_entity_1.PaymentStatus.COMPLETED;
                    payment.transactionId = transaction.getTransId();
                    payment.authCode = transaction.getAuthCode();
                    payment.paymentDetails = {
                        lastFour: transaction.getAccountNumber(),
                        cardType: transaction.getAccountType(),
                    };
                    order.status = order_entity_1.OrderStatus.CONFIRMED;
                    order.transactionId = payment.transactionId;
                }
                else {
                    payment.status = payment_entity_1.PaymentStatus.FAILED;
                    payment.failureMessage =
                        ((_b = (_a = transaction.getErrors()) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.getErrorText()) || "Payment failed";
                }
                order.paymentStatus = payment.status;
                yield manager.getRepository(order_entity_1.Order).save(order);
                return manager.getRepository(payment_entity_1.Payment).save(payment);
            }));
        });
    }
    static refundTransaction(paymentId, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const payment = yield paymentRepository.findOne({
                    where: { id: paymentId },
                });
                if (!payment || !payment.transactionId) {
                    throw new Error("Payment or transaction ID not found");
                }
                const refundAmount = amount || payment.amount;
                // Create refund transaction
                const transactionRequestType = new ApiContracts.TransactionRequestType();
                transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION);
                transactionRequestType.setAmount(refundAmount);
                transactionRequestType.setRefTransId(payment.transactionId);
                // Create API request
                const createRequest = new ApiContracts.CreateTransactionRequest();
                createRequest.setMerchantAuthentication(AuthorizeNetService.createMerchantAuthentication());
                createRequest.setTransactionRequest(transactionRequestType);
                // Execute refund
                const controller = new ApiControllers.CreateTransactionController(createRequest.getJSON());
                controller.setEnvironment(AuthorizeNetService.getEnvironment());
                return new Promise((resolve, reject) => {
                    controller.execute(() => {
                        const apiResponse = controller.getResponse();
                        const response = new ApiContracts.CreateTransactionResponse(apiResponse);
                        const transResponse = response.getTransactionResponse();
                        if (transResponse && transResponse.getResponseCode() === "1") {
                            payment.status = payment_entity_1.PaymentStatus.REFUNDED;
                            paymentRepository.save(payment);
                            // Update order status
                            orderRepository.update(payment.orderId, {
                                paymentStatus: payment_entity_1.PaymentStatus.REFUNDED,
                                status: order_entity_1.OrderStatus.CANCELLED,
                            });
                            resolve(payment);
                        }
                        else {
                            reject(new Error("Refund failed"));
                        }
                    });
                });
            }
            catch (error) {
                console.error("Refund error:", error);
                throw error;
            }
        });
    }
    static getTransactionDetails(transactionId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const getRequest = new ApiContracts.GetTransactionDetailsRequest();
                getRequest.setMerchantAuthentication(AuthorizeNetService.createMerchantAuthentication());
                getRequest.setTransId(transactionId);
                const controller = new ApiControllers.GetTransactionDetailsController(getRequest.getJSON());
                controller.setEnvironment(AuthorizeNetService.getEnvironment());
                return new Promise((resolve, reject) => {
                    controller.execute(() => {
                        const apiResponse = controller.getResponse();
                        const response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);
                        resolve(response);
                    });
                });
            }
            catch (error) {
                console.error("Get transaction details error:", error);
                throw error;
            }
        });
    }
}
exports.AuthorizeNetService = AuthorizeNetService;
