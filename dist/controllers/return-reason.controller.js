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
exports.ReturnReasonController = void 0;
const data_source_1 = require("../data-source");
const return_reason_entity_1 = require("../entities/return-reason.entity");
class ReturnReasonController {
    static createReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const dto = req.body;
                const existing = yield repository.findOne({
                    where: { name: dto.name.trim() },
                });
                if (existing) {
                    res.status(409).json({
                        message: "Return reason already exists",
                    });
                    return;
                }
                const returnReason = repository.create({
                    name: dto.name.trim(),
                });
                const savedReturnReason = yield repository.save(returnReason);
                res.status(201).json(savedReturnReason);
            }
            catch (error) {
                console.error("Create return reason error:", error);
                res.status(500).json({
                    message: "Failed to create return reason",
                });
            }
        });
    }
    static getReturnReasons(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const search = typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";
                const page = Math.max(Number(req.query.page) || 1, 1);
                const limit = Math.max(Number(req.query.limit) || 10, 1);
                const queryBuilder = repository
                    .createQueryBuilder("returnReason")
                    .orderBy("returnReason.createdAt", "ASC");
                if (search) {
                    queryBuilder.andWhere("returnReason.name ILIKE :search", {
                        search: `%${search}%`,
                    });
                }
                const [data, total] = yield queryBuilder
                    .skip((page - 1) * limit)
                    .take(limit)
                    .getManyAndCount();
                res.json({
                    data,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit),
                    },
                });
            }
            catch (error) {
                console.error("Get return reasons error:", error);
                res.status(500).json({
                    message: "Failed to get return reasons",
                });
            }
        });
    }
    static getReturnReasonById(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const returnReason = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                res.json(returnReason);
            }
            catch (error) {
                console.error("Get return reason by id error:", error);
                res.status(500).json({
                    message: "Failed to get return reason",
                });
            }
        });
    }
    static updateReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const returnReason = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                const dto = req.body;
                if (dto.name !== undefined) {
                    const name = dto.name.trim();
                    const existing = yield repository.findOne({
                        where: { name },
                    });
                    if (existing &&
                        existing.id !== returnReason.id) {
                        res.status(409).json({
                            message: "Return reason already exists",
                        });
                        return;
                    }
                    returnReason.name = name;
                }
                const updatedReturnReason = yield repository.save(returnReason);
                res.json(updatedReturnReason);
            }
            catch (error) {
                console.error("Update return reason error:", error);
                res.status(500).json({
                    message: "Failed to update return reason",
                });
            }
        });
    }
    static deleteReturnReason(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const repository = data_source_1.AppDataSource.getRepository(return_reason_entity_1.ReturnReason);
                const returnReason = yield repository.findOne({
                    where: {
                        id: req.params.id,
                    },
                });
                if (!returnReason) {
                    res.status(404).json({
                        message: "Return reason not found",
                    });
                    return;
                }
                yield repository.remove(returnReason);
                res.json({
                    message: "Return reason deleted successfully",
                });
            }
            catch (error) {
                console.error("Delete return reason error:", error);
                res.status(500).json({
                    message: "Failed to delete return reason",
                });
            }
        });
    }
}
exports.ReturnReasonController = ReturnReasonController;
