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
exports.OrderStatusController = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const data_source_1 = require("../data-source");
const order_status_entity_1 = require("../entities/order-status.entity");
const order_entity_1 = require("../entities/order.entity");
const cancelled_order_entity_1 = require("../entities/cancelled-order.entity");
const order_status_dto_1 = require("../dto/order-status.dto");
class OrderStatusController {
    static createOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const dto = (0, class_transformer_1.plainToInstance)(order_status_dto_1.CreateOrderStatusDto, req.body);
                const errors = yield (0, class_validator_1.validate)(dto, {
                    whitelist: true,
                    forbidNonWhitelisted: true,
                });
                if (errors.length) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors: errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); }),
                    });
                    return;
                }
                const name = dto.name.trim();
                const code = dto.code.trim().toLowerCase();
                if (dto.isDefault && !dto.isActive) {
                    res.status(400).json({ message: "The default order status must be enabled" });
                    return;
                }
                const existing = yield repository
                    .createQueryBuilder("status")
                    .where("LOWER(status.name) = LOWER(:name)", { name })
                    .orWhere("LOWER(status.code) = LOWER(:code)", { code })
                    .getOne();
                if (existing) {
                    res.status(409).json({
                        message: "An order status with this name or code already exists",
                    });
                    return;
                }
                const orderStatus = repository.create({
                    name,
                    code,
                    color: dto.color.toLowerCase(),
                    sortOrder: dto.sortOrder,
                    isActive: dto.isActive,
                    isSystem: false,
                    isDefault: dto.isDefault,
                });
                const savedOrderStatus = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    if (dto.isDefault) {
                        yield manager
                            .getRepository(order_status_entity_1.OrderStatus)
                            .createQueryBuilder()
                            .update(order_status_entity_1.OrderStatus)
                            .set({ isDefault: false })
                            .execute();
                    }
                    return manager.getRepository(order_status_entity_1.OrderStatus).save(orderStatus);
                }));
                res.status(201).json(savedOrderStatus);
            }
            catch (error) {
                console.error("Create order status error:", error);
                res.status(500).json({
                    message: "Failed to create order status",
                });
            }
        });
    }
    static getOrderStatuses(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const safeLimit = Math.min(limit, 100);
                const activeOnly = req.query.activeOnly === "true";
                const skip = (page - 1) * safeLimit;
                // Column sorting from the admin list; default is sort order, then name.
                const sortColumns = {
                    name: "orderStatus.name",
                    code: "orderStatus.code",
                    sortOrder: "orderStatus.sortOrder",
                };
                const sortBy = typeof req.query.sortBy === "string" &&
                    // Own keys only: names like "constructor" or "__proto__" must not
                    // resolve to built-in object properties.
                    Object.prototype.hasOwnProperty.call(sortColumns, req.query.sortBy)
                    ? sortColumns[req.query.sortBy]
                    : sortColumns.sortOrder;
                const sortOrder = String(req.query.sortOrder).toUpperCase() === "DESC"
                    ? "DESC"
                    : "ASC";
                const queryBuilder = repository
                    .createQueryBuilder("orderStatus")
                    .orderBy(sortBy, sortOrder)
                    .addOrderBy("orderStatus.name", "ASC")
                    .skip(skip)
                    .take(safeLimit);
                if (search) {
                    queryBuilder.andWhere("(orderStatus.name ILIKE :search OR orderStatus.code ILIKE :search)", {
                        search: `%${search}%`,
                    });
                }
                if (activeOnly) {
                    queryBuilder.andWhere("orderStatus.isActive = true");
                }
                const [orderStatuses, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: orderStatuses,
                    meta: {
                        total,
                        page,
                        limit: safeLimit,
                        totalPages: Math.ceil(total / safeLimit),
                    },
                });
            }
            catch (error) {
                console.error("Get order statuses error:", error);
                res.status(500).json({
                    message: "Failed to get order statuses",
                });
            }
        });
    }
    static getOrderStatusById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const { id } = req.params;
                const orderStatus = yield repository.findOne({
                    where: { id },
                });
                if (!orderStatus) {
                    res.status(404).json({
                        message: "Order status not found",
                    });
                    return;
                }
                res.status(200).json(orderStatus);
            }
            catch (error) {
                console.error("Get order status error:", error);
                res.status(500).json({
                    message: "Failed to get order status",
                });
            }
        });
    }
    // Storefront: name and colour of every order status, so My Orders can show the
    // admin's name and colour for an order's status code.
    static getPublicOrderStatuses(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const statuses = yield data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus).find({
                    select: ["code", "name", "color"],
                    order: { sortOrder: "ASC", name: "ASC" },
                });
                res.status(200).json({ data: statuses });
            }
            catch (error) {
                console.error("Get public order statuses error:", error);
                res.status(500).json({
                    message: "Failed to get order statuses",
                });
            }
        });
    }
    static updateOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const { id } = req.params;
                const dto = (0, class_transformer_1.plainToInstance)(order_status_dto_1.UpdateOrderStatusDto, req.body);
                const errors = yield (0, class_validator_1.validate)(dto, {
                    whitelist: true,
                    forbidNonWhitelisted: true,
                });
                if (errors.length) {
                    res.status(400).json({
                        message: "Validation failed",
                        errors: errors.flatMap((error) => { var _a; return Object.values((_a = error.constraints) !== null && _a !== void 0 ? _a : {}); }),
                    });
                    return;
                }
                const orderStatus = yield repository.findOne({
                    where: { id },
                });
                if (!orderStatus) {
                    res.status(404).json({
                        message: "Order status not found",
                    });
                    return;
                }
                const name = dto.name === undefined ? orderStatus.name : dto.name.trim();
                const code = dto.code === undefined
                    ? orderStatus.code
                    : dto.code.trim().toLowerCase();
                if (code !== orderStatus.code) {
                    res.status(409).json({
                        message: "Order status code cannot be changed after creation",
                    });
                    return;
                }
                const existing = yield repository
                    .createQueryBuilder("status")
                    .where("status.id <> :id", { id: orderStatus.id })
                    .andWhere("(LOWER(status.name) = LOWER(:name) OR LOWER(status.code) = LOWER(:code))", { name, code })
                    .getOne();
                if (existing) {
                    res.status(409).json({
                        message: "An order status with this name or code already exists",
                    });
                    return;
                }
                const nextIsActive = (_a = dto.isActive) !== null && _a !== void 0 ? _a : orderStatus.isActive;
                const nextIsDefault = (_b = dto.isDefault) !== null && _b !== void 0 ? _b : orderStatus.isDefault;
                if (nextIsDefault && !nextIsActive) {
                    res.status(400).json({ message: "The default order status must be enabled" });
                    return;
                }
                if (orderStatus.isDefault && dto.isDefault === false) {
                    res.status(409).json({
                        message: "Choose another default status before removing this default",
                    });
                    return;
                }
                orderStatus.name = name;
                orderStatus.color = (_d = (_c = dto.color) === null || _c === void 0 ? void 0 : _c.toLowerCase()) !== null && _d !== void 0 ? _d : orderStatus.color;
                orderStatus.sortOrder = (_e = dto.sortOrder) !== null && _e !== void 0 ? _e : orderStatus.sortOrder;
                orderStatus.isActive = nextIsActive;
                orderStatus.isDefault = nextIsDefault;
                const updatedOrderStatus = yield data_source_1.AppDataSource.transaction((manager) => __awaiter(this, void 0, void 0, function* () {
                    if (dto.isDefault === true) {
                        yield manager
                            .getRepository(order_status_entity_1.OrderStatus)
                            .createQueryBuilder()
                            .update(order_status_entity_1.OrderStatus)
                            .set({ isDefault: false })
                            .where("id <> :id", { id: orderStatus.id })
                            .execute();
                    }
                    return manager.getRepository(order_status_entity_1.OrderStatus).save(orderStatus);
                }));
                res.status(200).json(updatedOrderStatus);
            }
            catch (error) {
                console.error("Update order status error:", error);
                res.status(500).json({
                    message: "Failed to update order status",
                });
            }
        });
    }
    static deleteOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const { id } = req.params;
                const orderStatus = yield repository.findOne({
                    where: { id },
                });
                if (!orderStatus) {
                    res.status(404).json({
                        message: "Order status not found",
                    });
                    return;
                }
                if (orderStatus.isDefault) {
                    res.status(409).json({
                        message: "The default order status cannot be deleted",
                    });
                    return;
                }
                if (orderStatus.isSystem) {
                    res.status(409).json({
                        message: "System order statuses cannot be deleted",
                    });
                    return;
                }
                // Orders and their history keep the status code as text, so a status that is
                // still referenced cannot be deleted (like OpenCart's order status delete check).
                const code = orderStatus.code.toLowerCase();
                const [orderCount, historyCount] = yield Promise.all([
                    data_source_1.AppDataSource.getRepository(order_entity_1.Order)
                        .createQueryBuilder("order")
                        .where("LOWER(order.status) = :code", { code })
                        .getCount(),
                    data_source_1.AppDataSource.getRepository(cancelled_order_entity_1.OrderHistory)
                        .createQueryBuilder("history")
                        .where("(LOWER(history.status) = :code OR LOWER(history.previousStatus) = :code)", { code })
                        .getCount(),
                ]);
                if (orderCount > 0 || historyCount > 0) {
                    const usage = [
                        orderCount > 0 ? `${orderCount} order${orderCount === 1 ? "" : "s"}` : "",
                        historyCount > 0
                            ? `${historyCount} order history entr${historyCount === 1 ? "y" : "ies"}`
                            : "",
                    ]
                        .filter(Boolean)
                        .join(" and ");
                    res.status(409).json({
                        message: `${orderStatus.name} is used by ${usage} and cannot be deleted. You can disable it instead.`,
                    });
                    return;
                }
                yield repository.remove(orderStatus);
                res.status(200).json({
                    message: "Order status deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete order status error:", error);
                res.status(500).json({
                    message: "Failed to delete order status",
                });
            }
        });
    }
}
exports.OrderStatusController = OrderStatusController;
