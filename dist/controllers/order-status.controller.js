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
const data_source_1 = require("../data-source");
const order_status_entity_1 = require("../entities/order-status.entity");
class OrderStatusController {
    static createOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const dto = req.body;
                const name = dto.name.trim();
                const existing = yield repository.findOne({
                    where: { name },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Order status already exists",
                    });
                    return;
                }
                const orderStatus = repository.create({
                    name,
                });
                const savedOrderStatus = yield repository.save(orderStatus);
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
                const skip = (page - 1) * limit;
                const queryBuilder = repository
                    .createQueryBuilder("orderStatus")
                    .orderBy("orderStatus.name", "ASC")
                    .addOrderBy("orderStatus.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where("orderStatus.name ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [orderStatuses, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: orderStatuses,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
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
    static updateOrderStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(order_status_entity_1.OrderStatus);
                const { id } = req.params;
                const dto = req.body;
                const orderStatus = yield repository.findOne({
                    where: { id },
                });
                if (!orderStatus) {
                    res.status(404).json({
                        message: "Order status not found",
                    });
                    return;
                }
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existing = yield repository.findOne({
                        where: { name },
                    });
                    if (existing &&
                        existing.id !== orderStatus.id) {
                        res.status(409).json({
                            message: "Order status already exists",
                        });
                        return;
                    }
                    orderStatus.name = name;
                }
                const updatedOrderStatus = yield repository.save(orderStatus);
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
