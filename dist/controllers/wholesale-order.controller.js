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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WholesaleOrderController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const wholesale_order_request_entity_1 = require("../entities/wholesale-order-request.entity");
const wholesale_order_item_entity_1 = require("../entities/wholesale-order-item.entity");
const cart_entity_1 = require("../entities/cart.entity");
const cart_item_entity_1 = require("../entities/cart-item.entity");
const wholesale_order_dto_1 = require("../dto/wholesale-order.dto");
const typeorm_1 = require("typeorm");
const reference_number_util_1 = require("../utils/reference-number.util");
const wholesaleOrderRequestRepository = data_source_1.AppDataSource.getRepository(wholesale_order_request_entity_1.WholesaleOrderRequest);
const cartRepository = data_source_1.AppDataSource.getRepository(cart_entity_1.Cart);
const cartItemRepository = data_source_1.AppDataSource.getRepository(cart_item_entity_1.CartItem);
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
    if (fromDate)
        fromDate.setHours(0, 0, 0, 0);
    if (toDate)
        toDate.setHours(23, 59, 59, 999);
    return (0, typeorm_1.Between)(fromDate !== null && fromDate !== void 0 ? fromDate : new Date(0), toDate !== null && toDate !== void 0 ? toDate : new Date());
};
const toNumber = (value) => {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "number") {
        return value;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
};
const getPermission = (req, action) => {
    var _a, _b;
    return (_b = (_a = req.user) === null || _a === void 0 ? void 0 : _a.permissions) === null || _b === void 0 ? void 0 : _b.some((permission) => permission.resource === "wholesale-order-request" &&
        permission.action === action);
};
const formatWholesaleRequestResponse = (request) => {
    if (!request) {
        return null;
    }
    const { items = [] } = request, rest = __rest(request, ["items"]);
    const normalizedItems = items.map((item) => (Object.assign(Object.assign({}, item), { wholesalePrice: toNumber(item.wholesalePrice), effectivePricePerCarton: toNumber(item.effectivePricePerCarton), total: toNumber(item.total) })));
    return Object.assign(Object.assign({}, rest), { subtotal: toNumber(rest.subtotal), tax: toNumber(rest.tax), shipping: toNumber(rest.shipping), total: toNumber(rest.total), items: normalizedItems });
};
const buildWholesaleItemsFromCart = (cartItems) => {
    return cartItems.map((cartItem) => {
        var _a, _b, _c, _d;
        const product = cartItem.product;
        const requestedBoxes = cartItem.quantity;
        const unitsPerCarton = (_a = product.unitsPerCarton) !== null && _a !== void 0 ? _a : (product.wholesaleOrderQuantity
            ? parseInt(product.wholesaleOrderQuantity, 10)
            : null);
        const wholesalePrice = toNumber(product.wholesalePrice);
        const fallbackDiscountPrice = toNumber(product.discountPrice);
        const fallbackPrice = toNumber(product.price);
        const effectivePricePerCarton = (_c = (_b = wholesalePrice !== null && wholesalePrice !== void 0 ? wholesalePrice : fallbackDiscountPrice) !== null && _b !== void 0 ? _b : fallbackPrice) !== null && _c !== void 0 ? _c : 0;
        const item = new wholesale_order_item_entity_1.WholesaleOrderItem();
        item.productId = product.id;
        item.productName = product.title;
        item.productImages = product.images || [];
        item.requestedBoxes = requestedBoxes;
        item.wholesaleOrderQuantity = (_d = product.wholesaleOrderQuantity) !== null && _d !== void 0 ? _d : null;
        item.unitsPerCarton = unitsPerCarton;
        item.wholesalePrice = wholesalePrice;
        item.effectivePricePerCarton = effectivePricePerCarton;
        item.calculateTotals();
        return item;
    });
};
exports.WholesaleOrderController = {
    createWholesaleOrderRequest: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.user.id;
            const createDto = (0, class_transformer_1.plainToInstance)(wholesale_order_dto_1.CreateWholesaleOrderRequestDto, req.body);
            const errors = yield (0, class_validator_1.validate)(createDto, {
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
                : { userId, type: cart_entity_1.CartType.REGULAR };
            const cart = yield cartRepository.findOne({
                where: cartWhere,
                relations: ["items", "items.product"],
            });
            if (!cart || !cart.items || cart.items.length === 0) {
                res.status(400).json({ message: "Cart is empty" });
                return;
            }
            const request = new wholesale_order_request_entity_1.WholesaleOrderRequest();
            request.userId = userId;
            request.requestNumber = yield (0, reference_number_util_1.generateWholesaleRequestNumber)();
            request.shippingAddress = createDto.shippingAddress;
            request.billingAddress =
                createDto.billingAddress || createDto.shippingAddress;
            request.notes = createDto.notes || null;
            request.status = wholesale_order_request_entity_1.WholesaleOrderRequestStatus.PENDING;
            request.items = buildWholesaleItemsFromCart(cart.items);
            request.subtotal = request.items.reduce((sum, item) => sum + (toNumber(item.total) || 0), 0);
            request.tax = 0;
            request.shipping = request.subtotal > 500 ? 0 : 50;
            request.total = Number((request.subtotal + request.shipping).toFixed(2));
            yield wholesaleOrderRequestRepository.save(request);
            yield cartItemRepository.delete({ cartId: cart.id });
            cart.total = 0;
            cart.wholesaleTotal = 0;
            cart.itemsCount = 0;
            yield cartRepository.save(cart);
            const savedRequest = yield wholesaleOrderRequestRepository.findOne({
                where: { id: request.id },
                relations: ["items"],
            });
            res.status(201).json(formatWholesaleRequestResponse(savedRequest));
        }
        catch (error) {
            console.error("Wholesale order request error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getMyRequests: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { status, from, to, page = "1", limit = "10" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            const where = { userId: req.user.id };
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
            }
            const [requests, total] = yield wholesaleOrderRequestRepository.findAndCount({
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
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get wholesale requests error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getAllRequests: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { status, from, to, page = "1", limit = "10" } = req.query;
            const take = Math.max(parseInt(limit, 10) || 10, 1);
            const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;
            const where = {};
            if (status) {
                where.status = status;
            }
            const dateRange = buildDateRange(from, to);
            if (dateRange) {
                where.createdAt = dateRange;
            }
            const [requests, total] = yield wholesaleOrderRequestRepository.findAndCount({
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
                    page: Math.max(parseInt(page, 10) || 1, 1),
                    limit: take,
                    totalPages: Math.ceil(total / take),
                },
            });
        }
        catch (error) {
            console.error("Get all wholesale requests error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    getRequestById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const request = yield wholesaleOrderRequestRepository.findOne({
                where: { id },
                relations: ["items", "user"],
            });
            if (!request) {
                res.status(404).json({ message: "Wholesale order request not found" });
                return;
            }
            const canReadAll = !!getPermission(req, "read-all");
            const canReadOwn = !!getPermission(req, "read") && request.userId === req.user.id;
            if (!canReadAll && !canReadOwn) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }
            res.status(200).json(formatWholesaleRequestResponse(request));
        }
        catch (error) {
            console.error("Get wholesale request error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
    updateRequestStatus: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { id } = req.params;
            const updateDto = (0, class_transformer_1.plainToInstance)(wholesale_order_dto_1.UpdateWholesaleOrderRequestStatusDto, req.body);
            const errors = yield (0, class_validator_1.validate)(updateDto, {
                whitelist: true,
                forbidUnknownValues: true,
                validationError: { target: false },
            });
            if (errors.length > 0) {
                res.status(400).json({ errors });
                return;
            }
            const request = yield wholesaleOrderRequestRepository.findOne({
                where: { id },
                relations: ["items"],
            });
            if (!request) {
                res.status(404).json({ message: "Wholesale order request not found" });
                return;
            }
            request.status = updateDto.status;
            request.adminNotes = updateDto.adminNotes || request.adminNotes || null;
            yield wholesaleOrderRequestRepository.save(request);
            res.status(200).json(formatWholesaleRequestResponse(request));
        }
        catch (error) {
            console.error("Update wholesale request status error:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }),
};
