import { Request, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AppDataSource } from "../data-source";
import { WholesaleOrderRequest, WholesaleOrderRequestStatus } from "../entities/wholesale-order-request.entity";
import { WholesaleOrderItem } from "../entities/wholesale-order-item.entity";
import { Cart, CartType } from "../entities/cart.entity";
import { CartItem } from "../entities/cart-item.entity";
import { CreateWholesaleOrderRequestDto, UpdateWholesaleOrderRequestStatusDto } from "../dto/wholesale-order.dto";
import { Between } from "typeorm";
import { generateWholesaleRequestNumber } from "../utils/reference-number.util";

const wholesaleOrderRequestRepository = AppDataSource.getRepository(WholesaleOrderRequest);
const cartRepository = AppDataSource.getRepository(Cart);
const cartItemRepository = AppDataSource.getRepository(CartItem);

const buildDateRange = (
  from?: any,
  to?: any
) => {
  if (!from && !to) return undefined;
  const fromStr = Array.isArray(from) ? from[0] : from;
  const toStr = Array.isArray(to) ? to[0] : to;

  let fromDate = fromStr ? new Date(fromStr) : undefined;
  let toDate = toStr ? new Date(toStr) : undefined;

  if (fromDate && isNaN(fromDate.getTime())) fromDate = undefined;
  if (toDate && isNaN(toDate.getTime())) toDate = undefined;

  if (!fromDate && !toDate) return undefined;

  if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59, 999);

  return Between(fromDate ?? new Date(0), toDate ?? new Date());
};

const toNumber = (value?: string | number | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

const calcFreight = (amount: number) => {
  if (amount >= 3500) return 0;
  if (amount >= 3000) return 75;
  if (amount >= 2500) return 95;
  if (amount >= 1500) return 125;
  if (amount >= 1200) return 150;
  if (amount >= 1) return 199;
  return 0;
};

const getPermission = (req: Request, action: string) =>
  req.user?.permissions?.some(
    (permission) =>
      permission.resource === "wholesale-order-request" &&
      permission.action === action
  );

const formatWholesaleRequestResponse = (
  request: WholesaleOrderRequest | null
) => {
  if (!request) {
    return null;
  }

  const { items = [], ...rest } = request;
  const normalizedItems = items.map((item) => ({
    ...item,
    wholesalePrice: toNumber(item.wholesalePrice),
    effectivePricePerCarton: toNumber(item.effectivePricePerCarton),
    total: toNumber(item.total),
  }));

  return {
    ...rest,
    subtotal: toNumber(rest.subtotal),
    tax: toNumber(rest.tax),
    shipping: toNumber(rest.shipping),
    discount: toNumber((rest as any).discount),
    total: toNumber(rest.total),
    items: normalizedItems,
  };
};

const buildWholesaleItemsFromCart = (cartItems: CartItem[]) => {
  return cartItems.map((cartItem) => {
    const product = cartItem.product;
    const requestedBoxes = cartItem.quantity;
    const unitsPerCarton =
      product.unitsPerCarton ??
      (product.wholesaleOrderQuantity
        ? parseInt(product.wholesaleOrderQuantity, 10)
        : null);

    const wholesalePrice = toNumber(product.wholesalePrice);
    const fallbackDiscountPrice = toNumber(product.discountPrice);
    const fallbackPrice = toNumber(product.price);

    const effectivePricePerCarton =
      wholesalePrice ?? fallbackDiscountPrice ?? fallbackPrice ?? 0;

    const item = new WholesaleOrderItem();
    item.productId = product.id;
    item.productName = product.title;
    item.productImages = product.images || [];
    item.requestedBoxes = requestedBoxes;
    item.wholesaleOrderQuantity = product.wholesaleOrderQuantity ?? null;
    item.unitsPerCarton = unitsPerCarton;
    item.wholesalePrice = wholesalePrice;
    item.effectivePricePerCarton = effectivePricePerCarton;
    item.calculateTotals();

    return item;
  });
};

export const WholesaleOrderController = {
  createWholesaleOrderRequest: async (req: Request, res: Response) => {
    try {
      const userId = req.user.id;
      const createDto = plainToInstance(
        CreateWholesaleOrderRequestDto,
        req.body
      );

      const errors = await validate(createDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const cartWhere = createDto.cartId
        ? { id: createDto.cartId, userId }
        : { userId, type: CartType.REGULAR };

      const cart = await cartRepository.findOne({
        where: cartWhere,
        relations: ["items", "items.product"],
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        res.status(400).json({ message: "Cart is empty" });
        return;
      }

      const request = new WholesaleOrderRequest();
      request.userId = userId;
      request.requestNumber = await generateWholesaleRequestNumber();
      request.shippingAddress = createDto.shippingAddress;
      request.billingAddress =
        createDto.billingAddress || createDto.shippingAddress;
      request.notes = createDto.notes || null;
      request.status = WholesaleOrderRequestStatus.PENDING;

      request.items = buildWholesaleItemsFromCart(cart.items);

      request.subtotal = request.items.reduce(
        (sum, item) => sum + (toNumber(item.total) || 0),
        0
      );
      request.discount = Number((request.subtotal * 0.02).toFixed(2)); // 2% discount
      const discountedSubtotal = Math.max(
        request.subtotal - request.discount,
        0
      );
      request.tax = 0;
      request.shipping = calcFreight(discountedSubtotal);
      request.total = Number(
        (discountedSubtotal + request.shipping + request.tax).toFixed(2)
      );

      await wholesaleOrderRequestRepository.save(request);

      await cartItemRepository.delete({ cartId: cart.id });
      cart.total = 0 as any;
      cart.wholesaleTotal = 0 as any;
      cart.itemsCount = 0;
      await cartRepository.save(cart);

      const savedRequest = await wholesaleOrderRequestRepository.findOne({
        where: { id: request.id },
        relations: ["items"],
      });

      res.status(201).json(formatWholesaleRequestResponse(savedRequest));
    } catch (error) {
      console.error("Wholesale order request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getMyRequests: async (req: Request, res: Response) => {
    try {
      const { status, from, to, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;
      const where: any = { userId: req.user.id };
      if (status) {
        where.status = status as any;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [requests, total] = await wholesaleOrderRequestRepository.findAndCount({
        where,
        relations: ["items"],
        order: { createdAt: "DESC" },
        skip,
        take,
      });

      res
        .status(200)
        .json({
          data: requests.map((request) => formatWholesaleRequestResponse(request)),
          meta: {
            total,
            page: Math.max(parseInt(page as string, 10) || 1, 1),
            limit: take,
            totalPages: Math.ceil(total / take),
          },
        });
    } catch (error) {
      console.error("Get wholesale requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getAllRequests: async (req: Request, res: Response) => {
    try {
      const { status, from, to, page = "1", limit = "10" } = req.query;
      const take = Math.max(parseInt(limit as string, 10) || 10, 1);
      const skip = (Math.max(parseInt(page as string, 10) || 1, 1) - 1) * take;
      const where: any = {};
      if (status) {
        where.status = status as any;
      }
      const dateRange = buildDateRange(from, to);
      if (dateRange) {
        where.createdAt = dateRange;
      }

      const [requests, total] = await wholesaleOrderRequestRepository.findAndCount({
        where,
        relations: ["items", "user"],
        order: { createdAt: "DESC" },
        skip,
        take,
      });

      res.status(200).json({
        data: requests.map((request) => formatWholesaleRequestResponse(request)),
        meta: {
          total,
          page: Math.max(parseInt(page as string, 10) || 1, 1),
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      console.error("Get all wholesale requests error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getRequestById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const request = await wholesaleOrderRequestRepository.findOne({
        where: { id },
        relations: ["items", "user"],
      });

      if (!request) {
        res.status(404).json({ message: "Wholesale order request not found" });
        return;
      }

      const canReadAll = !!getPermission(req, "read-all");
      const canReadOwn =
        !!getPermission(req, "read") && request.userId === req.user.id;

      if (!canReadAll && !canReadOwn) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }

      res.status(200).json(formatWholesaleRequestResponse(request));
    } catch (error) {
      console.error("Get wholesale request error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  updateRequestStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateDto = plainToInstance(
        UpdateWholesaleOrderRequestStatusDto,
        req.body
      );

      const errors = await validate(updateDto, {
        whitelist: true,
        forbidUnknownValues: true,
        validationError: { target: false },
      });

      if (errors.length > 0) {
        res.status(400).json({ errors });
        return;
      }

      const request = await wholesaleOrderRequestRepository.findOne({
        where: { id },
        relations: ["items"],
      });

      if (!request) {
        res.status(404).json({ message: "Wholesale order request not found" });
        return;
      }

      request.status = updateDto.status;
      request.adminNotes = updateDto.adminNotes || request.adminNotes || null;

      await wholesaleOrderRequestRepository.save(request);

      res.status(200).json(formatWholesaleRequestResponse(request));
    } catch (error) {
      console.error("Update wholesale request status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
};
