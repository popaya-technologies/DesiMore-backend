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
exports.StockStatusController = void 0;
const data_source_1 = require("../data-source");
const stock_status_entity_1 = require("../entities/stock-status.entity");
class StockStatusController {
    static createStockStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(stock_status_entity_1.StockStatus);
                const dto = req.body;
                const name = dto.name.trim();
                const existing = yield repository.findOne({
                    where: { name },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Stock status already exists",
                    });
                    return;
                }
                const stockStatus = repository.create({
                    name,
                });
                const savedStockStatus = yield repository.save(stockStatus);
                res.status(201).json(savedStockStatus);
            }
            catch (error) {
                console.error("Create stock status error:", error);
                res.status(500).json({
                    message: "Failed to create stock status",
                });
            }
        });
    }
    static getStockStatuses(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(stock_status_entity_1.StockStatus);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const skip = (page - 1) * limit;
                const queryBuilder = repository
                    .createQueryBuilder("stockStatus")
                    .orderBy("stockStatus.name", "ASC")
                    .addOrderBy("stockStatus.createdAt", "DESC")
                    .skip(skip)
                    .take(limit);
                if (search) {
                    queryBuilder.where("stockStatus.name ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [stockStatuses, total] = yield queryBuilder.getManyAndCount();
                res.status(200).json({
                    data: stockStatuses,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get stock statuses error:", error);
                res.status(500).json({
                    message: "Failed to get stock statuses",
                });
            }
        });
    }
    static getStockStatusById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(stock_status_entity_1.StockStatus);
                const { id } = req.params;
                const stockStatus = yield repository.findOne({
                    where: { id },
                });
                if (!stockStatus) {
                    res.status(404).json({
                        message: "Stock status not found",
                    });
                    return;
                }
                res.status(200).json(stockStatus);
            }
            catch (error) {
                console.error("Get stock status error:", error);
                res.status(500).json({
                    message: "Failed to get stock status",
                });
            }
        });
    }
    static updateStockStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(stock_status_entity_1.StockStatus);
                const { id } = req.params;
                const dto = req.body;
                const stockStatus = yield repository.findOne({
                    where: { id },
                });
                if (!stockStatus) {
                    res.status(404).json({
                        message: "Stock status not found",
                    });
                    return;
                }
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existing = yield repository.findOne({
                        where: { name },
                    });
                    if (existing &&
                        existing.id !== stockStatus.id) {
                        res.status(409).json({
                            message: "Stock status already exists",
                        });
                        return;
                    }
                    stockStatus.name = name;
                }
                const updatedStockStatus = yield repository.save(stockStatus);
                res.status(200).json(updatedStockStatus);
            }
            catch (error) {
                console.error("Update stock status error:", error);
                res.status(500).json({
                    message: "Failed to update stock status",
                });
            }
        });
    }
    static deleteStockStatus(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(stock_status_entity_1.StockStatus);
                const { id } = req.params;
                const stockStatus = yield repository.findOne({
                    where: { id },
                });
                if (!stockStatus) {
                    res.status(404).json({
                        message: "Stock status not found",
                    });
                    return;
                }
                yield repository.remove(stockStatus);
                res.status(200).json({
                    message: "Stock status deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete stock status error:", error);
                res.status(500).json({
                    message: "Failed to delete stock status",
                });
            }
        });
    }
}
exports.StockStatusController = StockStatusController;
