import * as AuthorizeNet from "authorizenet";
import { ApiError } from "../utils/api-error";
import { AppDataSource } from "../data-source";
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from "../entities/payment.entity";
import { Order, OrderStatus } from "../entities/order.entity";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const SDKConstants = AuthorizeNet.Constants;

const paymentRepository = AppDataSource.getRepository(Payment);
const orderRepository = AppDataSource.getRepository(Order);

export class AuthorizeNetService {
  private static getEnvironment() {
    return process.env.AUTHORIZE_ENVIRONMENT === "production"
      ? SDKConstants.endpoint.production
      : SDKConstants.endpoint.sandbox;
  }

  private static createMerchantAuthentication() {
    const merchantAuthenticationType =
      new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(process.env.AUTHORIZE_API_LOGIN_ID!);
    merchantAuthenticationType.setTransactionKey(
      process.env.AUTHORIZE_TRANSACTION_KEY!,
    );
    return merchantAuthenticationType;
  }

  static async createTransaction(
    orderId: string,
    paymentData: {
      cardNumber: string;
      expirationDate: string;
      cardCode: string;
      amount: number;
    },
  ): Promise<Payment> {
    try {
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: ["user"],
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // Ensure amount is a valid number
      const amount =
        typeof paymentData.amount === "string"
          ? parseFloat(paymentData.amount)
          : paymentData.amount;

      if (isNaN(amount) || amount <= 0) {
        throw new ApiError(400, "Payment amount must be greater than zero");
      }

      // Serialize payment attempts and retain PROCESSING on ambiguous gateway errors.
      const payment = await AppDataSource.transaction(async (manager) => {
        const locked = await manager
          .getRepository(Order)
          .findOne({
            where: { id: orderId },
            lock: { mode: "pessimistic_write" },
          });
        if (
          !locked ||
          [OrderStatus.CANCELLED, OrderStatus.REFUNDED].includes(locked.status)
        )
          throw new ApiError(400, "Order cannot be paid");
        if (
          [PaymentStatus.PROCESSING, PaymentStatus.COMPLETED].includes(
            locked.paymentStatus,
          )
        )
          throw new ApiError(409, "Payment already processing or completed");
        const repo = manager.getRepository(Payment);
        const existing = await repo.findOneBy({ orderId });
        if (existing && existing.status !== PaymentStatus.FAILED)
          throw new ApiError(409, "Payment cannot be retried");
        const record =
          existing ||
          repo.create({
            orderId,
            currency: "USD",
            paymentMethod: PaymentMethod.CREDIT_CARD,
          });
        record.amount = Number(locked.total);
        record.status = PaymentStatus.PROCESSING;
        record.failureMessage = null;
        locked.paymentStatus = PaymentStatus.PROCESSING;
        await manager.getRepository(Order).save(locked);
        return repo.save(record);
      });

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
      transactionRequestType.setTransactionType(
        ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
      );
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
      createRequest.setMerchantAuthentication(
        AuthorizeNetService.createMerchantAuthentication(),
      );
      createRequest.setTransactionRequest(transactionRequestType);

      // Execute transaction
      const controller = new ApiControllers.CreateTransactionController(
        createRequest.getJSON(),
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse,
          );

          // Update payment with response
          AuthorizeNetService.handleTransactionResponse(payment.id, response)
            .then((updatedPayment) => resolve(updatedPayment))
            .catch((error) => reject(error));
        });
      });
    } catch (error) {
      console.error("Authorize.net transaction error:", error);
      throw error;
    }
  }

  private static async handleTransactionResponse(
    paymentId: string,
    response: any,
  ) {
    return AppDataSource.transaction(async (manager) => {
      const payment = await manager
        .getRepository(Payment)
        .findOneBy({ id: paymentId });
      if (!payment) throw new Error("Payment not found");
      const order = await manager
        .getRepository(Order)
        .findOne({
          where: { id: payment.orderId },
          lock: { mode: "pessimistic_write" },
        });
      if (!order) throw new Error("Order not found");
      const transaction = response.getTransactionResponse();
      const code = transaction?.getResponseCode();
      // Held-for-review or malformed responses require reconciliation, not an automatic retry.
      if (!transaction || !["1", "2", "3"].includes(code))
        throw new Error("Gateway outcome requires reconciliation");
      payment.authorizeNetResponse = response;
      if (code === "1") {
        payment.status = PaymentStatus.COMPLETED;
        payment.transactionId = transaction.getTransId();
        payment.authCode = transaction.getAuthCode();
        payment.paymentDetails = {
          lastFour: transaction.getAccountNumber(),
          cardType: transaction.getAccountType(),
        };
        order.status = OrderStatus.CONFIRMED;
        order.transactionId = payment.transactionId;
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.failureMessage =
          transaction.getErrors()?.[0]?.getErrorText() || "Payment failed";
      }
      order.paymentStatus = payment.status;
      await manager.getRepository(Order).save(order);
      return manager.getRepository(Payment).save(payment);
    });
  }

  static async refundTransaction(paymentId: string, amount?: number) {
    try {
      const payment = await paymentRepository.findOne({
        where: { id: paymentId },
      });
      if (!payment || !payment.transactionId) {
        throw new Error("Payment or transaction ID not found");
      }

      const refundAmount = amount || payment.amount;

      // Create refund transaction
      const transactionRequestType = new ApiContracts.TransactionRequestType();
      transactionRequestType.setTransactionType(
        ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION,
      );
      transactionRequestType.setAmount(refundAmount);
      transactionRequestType.setRefTransId(payment.transactionId);

      // Create API request
      const createRequest = new ApiContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(
        AuthorizeNetService.createMerchantAuthentication(),
      );
      createRequest.setTransactionRequest(transactionRequestType);

      // Execute refund
      const controller = new ApiControllers.CreateTransactionController(
        createRequest.getJSON(),
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse,
          );

          const transResponse = response.getTransactionResponse();
          if (transResponse && transResponse.getResponseCode() === "1") {
            payment.status = PaymentStatus.REFUNDED;
            paymentRepository.save(payment);

            // Update order status
            orderRepository.update(payment.orderId, {
              paymentStatus: PaymentStatus.REFUNDED,
              status: OrderStatus.CANCELLED,
            });

            resolve(payment);
          } else {
            reject(new Error("Refund failed"));
          }
        });
      });
    } catch (error) {
      console.error("Refund error:", error);
      throw error;
    }
  }

  static async getTransactionDetails(transactionId: string) {
    try {
      const getRequest = new ApiContracts.GetTransactionDetailsRequest();
      getRequest.setMerchantAuthentication(
        AuthorizeNetService.createMerchantAuthentication(),
      );
      getRequest.setTransId(transactionId);

      const controller = new ApiControllers.GetTransactionDetailsController(
        getRequest.getJSON(),
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.GetTransactionDetailsResponse(
            apiResponse,
          );
          resolve(response);
        });
      });
    } catch (error) {
      console.error("Get transaction details error:", error);
      throw error;
    }
  }
}
