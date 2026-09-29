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
exports.cancelledOrderId = cancelledOrderId;
exports.validateCancelledInput = validateCancelledInput;
exports.cancelledOrderQuery = cancelledOrderQuery;
exports.buildCancelledListQuery = buildCancelledListQuery;
exports.listCancelledOrders = listCancelledOrders;
exports.getCancelledOrder = getCancelledOrder;
exports.addCancelledHistory = addCancelledHistory;
exports.archiveCancelledOrders = archiveCancelledOrders;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const order_entity_1 = require("../entities/order.entity");
const cancelled_order_entity_1 = require("../entities/cancelled-order.entity");
const cancelled_order_dto_1 = require("../dto/cancelled-order.dto");
const api_error_1 = require("../utils/api-error");
const email_1 = require("../utils/email");
function cancelledOrderId(id) {
    if (!(0, class_validator_1.isUUID)(id))
        throw new api_error_1.ApiError(400, "Invalid order ID");
    return id.toLowerCase();
}
function validateCancelledInput(type, input) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!input || typeof input !== "object" || Array.isArray(input))
            throw new api_error_1.ApiError(400, "Invalid request body");
        const dto = (0, class_transformer_1.plainToInstance)(type, input);
        const errors = yield (0, class_validator_1.validate)(dto, { whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true, validationError: { target: false, value: false } });
        if (errors.length)
            throw new api_error_1.ApiError(400, "Invalid cancelled order data", errors);
        return dto;
    });
}
function cancelledOrderQuery(input) {
    var _a, _b, _c;
    const allowed = ["orderId", "customer", "total", "dateAdded", "dateModified", "page", "limit", "sortBy", "sortOrder"];
    for (const [key, value] of Object.entries(input)) {
        if (!allowed.includes(key) || typeof value !== "string")
            throw new api_error_1.ApiError(400, `Invalid query parameter: ${key}`);
    }
    const q = input;
    const integer = (key, fallback, max) => {
        if (q[key] === undefined)
            return fallback;
        if (!/^[1-9]\d*$/.test(q[key]) || !Number.isSafeInteger(Number(q[key])) || Number(q[key]) > max)
            throw new api_error_1.ApiError(400, `Invalid ${key}`);
        return Number(q[key]);
    };
    const page = integer("page", 1, Number.MAX_SAFE_INTEGER), limit = integer("limit", 10, 100);
    if (!Number.isSafeInteger((page - 1) * limit))
        throw new api_error_1.ApiError(400, "Invalid page");
    for (const key of ["dateAdded", "dateModified"]) {
        if (q[key] !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(q[key]) || !Number.isFinite(Date.parse(q[key])) || new Date(q[key]).toISOString().slice(0, 10) !== q[key]))
            throw new api_error_1.ApiError(400, `Invalid ${key}; use YYYY-MM-DD`);
    }
    if (q.total !== undefined && !/^\d{1,10}(\.\d{1,2})?$/.test(q.total))
        throw new api_error_1.ApiError(400, "Invalid total");
    for (const key of ["orderId", "customer"])
        if (((_a = q[key]) === null || _a === void 0 ? void 0 : _a.length) > 255)
            throw new api_error_1.ApiError(400, `${key} is too long`);
    const sortBy = (_b = q.sortBy) !== null && _b !== void 0 ? _b : "createdAt", sortOrder = (_c = q.sortOrder) !== null && _c !== void 0 ? _c : "DESC";
    if (!["orderNumber", "customer", "total", "createdAt", "updatedAt"].includes(sortBy) || !["ASC", "DESC"].includes(sortOrder))
        throw new api_error_1.ApiError(400, "Invalid sort");
    return { orderId: q.orderId, customer: q.customer, total: q.total, dateAdded: q.dateAdded, dateModified: q.dateModified, page, limit, sortBy, sortOrder: sortOrder };
}
function activeQuery(manager) {
    return (manager !== null && manager !== void 0 ? manager : data_source_1.AppDataSource).getRepository(order_entity_1.Order).createQueryBuilder("o")
        .where("o.status = :cancelled", { cancelled: order_entity_1.OrderStatus.CANCELLED })
        .andWhere('NOT EXISTS (SELECT 1 FROM "cancelled_order_archives" a WHERE a."orderId" = o.id)');
}
const userFields = ["firstname", "lastname", "fullname", "email", "phone", "userRole"];
function withCustomer(qb) {
    return qb.leftJoin("o.user", "customer").addSelect(["customer.id", ...userFields.map(f => `customer.${f}`)]);
}
function summary(order) {
    const fields = ["id", "orderNumber", "userId", "status", "paymentStatus", "paymentMethod", "subtotal", "tax", "shipping", "total", "createdAt", "updatedAt", "billingAddress", "shippingAddress"];
    return Object.assign(Object.assign({}, Object.fromEntries(fields.map(f => [f, order[f]]))), { user: order.user ? Object.fromEntries(userFields.map(f => { var _a; return [f, (_a = order.user[f]) !== null && _a !== void 0 ? _a : null]; })) : null });
}
const literalSearch = (s) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;
function buildCancelledListQuery(input) {
    const q = cancelledOrderQuery(input), qb = withCustomer(activeQuery());
    if (q.orderId)
        qb.andWhere("o.orderNumber ILIKE :orderId", { orderId: literalSearch(q.orderId) });
    if (q.customer)
        qb.andWhere("(customer.fullname ILIKE :customer OR CONCAT_WS(' ', customer.firstname, customer.lastname) ILIKE :customer OR customer.email ILIKE :customer)", { customer: literalSearch(q.customer) });
    if (q.total !== undefined)
        qb.andWhere("o.total = :total", { total: q.total });
    for (const [key, column] of [["dateAdded", "createdAt"], ["dateModified", "updatedAt"]]) {
        if (q[key])
            qb.andWhere(`o.${column} >= CAST(:${key} AS date) AND o.${column} < CAST(:${key} AS date) + INTERVAL '1 day'`, { [key]: q[key] });
    }
    qb.orderBy(q.sortBy === "customer" ? "customer.fullname" : `o.${q.sortBy}`, q.sortOrder).addOrderBy("o.id", q.sortOrder).skip((q.page - 1) * q.limit).take(q.limit);
    return { qb, q };
}
function listCancelledOrders(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { qb, q } = buildCancelledListQuery(input);
        const [rows, total] = yield qb.getManyAndCount();
        return { data: rows.map(summary), meta: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) } };
    });
}
function getCancelledOrder(id) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        id = cancelledOrderId(id);
        const order = yield withCustomer(activeQuery()).leftJoinAndSelect("o.items", "item").leftJoin("item.product", "product").addSelect(["product.id", "product.model"]).andWhere("o.id = :id", { id }).getOne();
        if (!order)
            throw new api_error_1.ApiError(404, "Cancelled order not found");
        const history = yield data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).find({ where: { orderId: id }, order: { createdAt: "DESC", id: "DESC" } });
        return Object.assign(Object.assign({}, summary(order)), { notes: order.notes, tracking: (_a = order.tracking) !== null && _a !== void 0 ? _a : { carrier: null, trackingNumber: null }, items: order.items.map(item => { var _a, _b; return ({ id: item.id, productId: item.productId, productName: item.productName, productImages: item.productImages, model: (_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.model) !== null && _b !== void 0 ? _b : null, price: item.price, discountedPrice: item.discountedPrice, quantity: item.quantity, total: item.total, selectedOptions: item.selectedOptions }); }), history });
    });
}
function lockCancelled(manager, id) {
    return __awaiter(this, void 0, void 0, function* () {
        const order = yield activeQuery(manager).andWhere("o.id = :id", { id }).setLock("pessimistic_write").getOne();
        // Recheck archival after obtaining the order lock to cover concurrent archival.
        if (!order || (yield manager.getRepository(cancelled_order_entity_1.CancelledOrderArchive).findOneBy({ orderId: id })))
            throw new api_error_1.ApiError(404, "Cancelled order not found");
        return order;
    });
}
const escapeHtml = (value) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
function addCancelledHistory(id, input, actorId) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        id = cancelledOrderId(id);
        const dto = yield validateCancelledInput(cancelled_order_dto_1.CancelledOrderHistoryDto, input);
        const { history, order } = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            const order = yield lockCancelled(manager, id);
            // Existing order flow forbids reopening and delegates refunds to the payment flow.
            if (dto.status !== order_entity_1.OrderStatus.CANCELLED)
                throw new api_error_1.ApiError(409, "Cancelled orders cannot be reopened or refunded here, including with override; use the existing payment refund flow");
            order.status = dto.status;
            if (dto.comment !== undefined)
                order.notes = dto.comment;
            yield manager.getRepository(order_entity_1.Order).save(order);
            const repository = manager.getRepository(cancelled_order_entity_1.OrderHistory);
            const history = yield repository.save(repository.create({ orderId: id, status: dto.status, comment: (_a = dto.comment) !== null && _a !== void 0 ? _a : "", override: dto.override, customerNotified: false, carrierName: (_c = (_b = order.tracking) === null || _b === void 0 ? void 0 : _b.carrier) !== null && _c !== void 0 ? _c : null, trackingNumber: (_e = (_d = order.tracking) === null || _d === void 0 ? void 0 : _d.trackingNumber) !== null && _e !== void 0 ? _e : null, createdBy: actorId }));
            return { history, order };
        }));
        let notification = dto.notifyCustomer ? "failed" : "not_requested";
        if (dto.notifyCustomer) {
            try {
                const recipient = (_a = order.shippingAddress) === null || _a === void 0 ? void 0 : _a.email;
                if (!recipient)
                    throw new Error("Missing recipient");
                yield (0, email_1.sendEmail)({ to: recipient, subject: `Order ${order.orderNumber} status: cancelled`, html: `<p>Order ${escapeHtml(order.orderNumber)} is cancelled.</p><p>${escapeHtml((_b = dto.comment) !== null && _b !== void 0 ? _b : "").replace(/\n/g, "<br>")}</p>` });
                notification = "sent";
            }
            catch (_c) {
                notification = "failed";
            }
            if (notification === "sent") {
                // A provider acceptance is not a guarantee of inbox delivery.
                try {
                    yield data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory).update(history.id, { customerNotified: true });
                    history.customerNotified = true;
                }
                catch (_d) {
                    throw new api_error_1.ApiError(500, "History saved and email accepted, but notification audit update failed; do not resend automatically");
                }
            }
        }
        return { message: notification === "failed" ? "Order history added successfully, but customer notification failed" : "Order history added successfully", history, notification };
    });
}
function archiveCancelledOrders(input, actorId) {
    return __awaiter(this, void 0, void 0, function* () {
        const dto = yield validateCancelledInput(cancelled_order_dto_1.CancelledOrderBulkDto, input);
        const ids = dto.ids.map(id => id.toLowerCase()).sort();
        yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
            for (const id of ids)
                yield lockCancelled(manager, id);
            const repo = manager.getRepository(cancelled_order_entity_1.CancelledOrderArchive);
            yield repo.save(ids.map(orderId => repo.create({ orderId, createdBy: actorId })));
        }));
        return { message: "Cancelled orders deleted successfully", deletedCount: ids.length, deletionMode: "archive" };
    });
}
