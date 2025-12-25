import * as AuthorizeNet from "authorizenet";
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
      process.env.AUTHORIZE_TRANSACTION_KEY!
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
    }
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
        throw new Error(`Invalid payment amount: ${paymentData.amount}`);
      }

      // Create payment record
      const payment = paymentRepository.create({
        orderId,
        amount: amount,
        currency: "USD",
        status: PaymentStatus.PROCESSING,
        paymentMethod: PaymentMethod.CREDIT_CARD,
      });

      await paymentRepository.save(payment);

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
        ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
      );
      transactionRequestType.setPayment(paymentType);
      transactionRequestType.setAmount(amount);
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
        AuthorizeNetService.createMerchantAuthentication()
      );
      createRequest.setTransactionRequest(transactionRequestType);

      // Execute transaction
      const controller = new ApiControllers.CreateTransactionController(
        createRequest.getJSON()
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse
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

  // New: charge without a pre-existing order. Used for pay-then-create flow.
  // Returns a lightweight result so the controller can decide how to persist.
  static async createTransactionForCheckout(input: {
    userEmail: string;
    cardNumber: string;
    expirationDate: string;
    cardCode: string;
    amount: number;
    invoiceNumber: string;
    billingAddress: {
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    shippingAddress: {
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
  }): Promise<{
    status: "completed" | "failed";
    transactionId?: string;
    authCode?: string;
    paymentDetails?: { lastFour?: string; cardType?: string };
    authorizeNetResponse: any;
    failureMessage?: string;
  }> {
    // Ensure amount is a valid number
    const amount =
      typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;
    if (isNaN(amount) || amount <= 0) {
      throw new Error(`Invalid payment amount: ${input.amount}`);
    }

    // Create credit card object
    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber(input.cardNumber.replace(/\s/g, ""));
    creditCard.setExpirationDate(input.expirationDate);
    creditCard.setCardCode(input.cardCode);

    // Create payment type
    const paymentType = new ApiContracts.PaymentType();
    paymentType.setCreditCard(creditCard);

    // Order details
    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(input.invoiceNumber);
    orderDetails.setDescription(`Payment for invoice ${input.invoiceNumber}`);

    // Transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setOrder(orderDetails);

    // Customer
    const customer = new ApiContracts.CustomerDataType();
    customer.setEmail(input.userEmail);
    transactionRequestType.setCustomer(customer);

    // Billing
    const billingAddress = new ApiContracts.CustomerAddressType();
    billingAddress.setFirstName(input.billingAddress.firstName);
    billingAddress.setLastName(input.billingAddress.lastName);
    billingAddress.setAddress(input.billingAddress.address);
    billingAddress.setCity(input.billingAddress.city);
    billingAddress.setState(input.billingAddress.state);
    billingAddress.setZip(input.billingAddress.zipCode);
    billingAddress.setCountry(input.billingAddress.country);
    transactionRequestType.setBillTo(billingAddress);

    // Shipping
    const shippingAddress = new ApiContracts.CustomerAddressType();
    shippingAddress.setFirstName(input.shippingAddress.firstName);
    shippingAddress.setLastName(input.shippingAddress.lastName);
    shippingAddress.setAddress(input.shippingAddress.address);
    shippingAddress.setCity(input.shippingAddress.city);
    shippingAddress.setState(input.shippingAddress.state);
    shippingAddress.setZip(input.shippingAddress.zipCode);
    shippingAddress.setCountry(input.shippingAddress.country);
    transactionRequestType.setShipTo(shippingAddress);

    // API request
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(
      AuthorizeNetService.createMerchantAuthentication()
    );
    createRequest.setTransactionRequest(transactionRequestType);

    const controller = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );
    controller.setEnvironment(AuthorizeNetService.getEnvironment());

    return new Promise((resolve) => {
      controller.execute(() => {
        const apiResponse = controller.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);

        const result: {
          status: "completed" | "failed";
          transactionId?: string;
          authCode?: string;
          paymentDetails?: { lastFour?: string; cardType?: string };
          authorizeNetResponse: any;
          failureMessage?: string;
        } = {
          status: "failed",
          authorizeNetResponse: response,
        };

        const transResponse = response.getTransactionResponse();
        if (transResponse) {
          const responseCode = transResponse.getResponseCode();
          if (responseCode === "1") {
            result.status = "completed";
            result.transactionId = transResponse.getTransId();
            result.authCode = transResponse.getAuthCode();
            if (transResponse.getAccountNumber()) {
              result.paymentDetails = {
                lastFour: transResponse.getAccountNumber(),
                cardType: transResponse.getAccountType(),
              };
            }
          } else {
            const errors = transResponse.getErrors() || [];
            result.failureMessage =
              errors.length > 0 ? errors[0].getErrorText() : "Payment failed";
          }
        } else {
          result.failureMessage = "No transaction response received";
        }

        resolve(result);
      });
    });
  }

  private static async handleTransactionResponse(
    paymentId: string,
    response: any
  ) {
    const payment = await paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) throw new Error("Payment not found");

    payment.authorizeNetResponse = response;

    const transResponse = response.getTransactionResponse();

    if (transResponse) {
      const responseCode = transResponse.getResponseCode();
      const authCode = transResponse.getAuthCode();
      const transId = transResponse.getTransId();
      const messages = transResponse.getMessages() || [];

      if (responseCode === "1") {
        // Approved
        payment.status = PaymentStatus.COMPLETED;
        payment.transactionId = transId;
        payment.authCode = authCode;

        // Update order status
        const order = await orderRepository.findOne({
          where: { id: payment.orderId },
        });
        if (order) {
          order.paymentStatus = PaymentStatus.COMPLETED;
          order.status = OrderStatus.CONFIRMED;
          await orderRepository.save(order);
        }

        // Store masked card info
        if (transResponse.getAccountNumber()) {
          payment.paymentDetails = {
            lastFour: transResponse.getAccountNumber(),
            cardType: transResponse.getAccountType(),
          };
        }
      } else {
        // Declined or Error
        payment.status = PaymentStatus.FAILED;
        const errors = transResponse.getErrors() || [];
        payment.failureMessage =
          errors.length > 0 ? errors[0].getErrorText() : "Payment failed";
      }
    } else {
      payment.status = PaymentStatus.FAILED;
      payment.failureMessage = "No transaction response received";
    }

    return await paymentRepository.save(payment);
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
        ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION
      );
      transactionRequestType.setAmount(refundAmount);
      transactionRequestType.setRefTransId(payment.transactionId);

      // Create API request
      const createRequest = new ApiContracts.CreateTransactionRequest();
      createRequest.setMerchantAuthentication(
        AuthorizeNetService.createMerchantAuthentication()
      );
      createRequest.setTransactionRequest(transactionRequestType);

      // Execute refund
      const controller = new ApiControllers.CreateTransactionController(
        createRequest.getJSON()
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(
            apiResponse
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
        AuthorizeNetService.createMerchantAuthentication()
      );
      getRequest.setTransId(transactionId);

      const controller = new ApiControllers.GetTransactionDetailsController(
        getRequest.getJSON()
      );
      controller.setEnvironment(AuthorizeNetService.getEnvironment());

      return new Promise((resolve, reject) => {
        controller.execute(() => {
          const apiResponse = controller.getResponse();
          const response = new ApiContracts.GetTransactionDetailsResponse(
            apiResponse
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
